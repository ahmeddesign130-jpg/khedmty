import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";

let tableReady: Promise<void> | undefined;
let lastCleanupAt = 0;

async function ensureRateLimitTable() {
  if (!tableReady) {
    tableReady = prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public."SecurityRateLimit" (
        "key" TEXT PRIMARY KEY,
        "hits" INTEGER NOT NULL DEFAULT 0,
        "windowStartedAt" TIMESTAMPTZ NOT NULL,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `).then(async () => {
      await prisma.$executeRawUnsafe(`ALTER TABLE public.\"SecurityRateLimit\" ENABLE ROW LEVEL SECURITY`);
      await prisma.$executeRawUnsafe(`REVOKE ALL ON TABLE public.\"SecurityRateLimit\" FROM anon, authenticated`);
    }).catch((error) => {
      tableReady = undefined;
      throw error;
    });
  }
  await tableReady;
}

function digest(value: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be configured with at least 32 characters.");
  return createHmac("sha256", secret).update(value).digest("hex");
}

function clientIp(request: Request) {
  // Vercel overwrites x-real-ip at the edge; do not trust arbitrary forwarded chains.
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function enforceSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) return false;
    } catch {
      return false;
    }
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  return fetchSite !== "cross-site";
}

export async function enforceRateLimit(
  request: Request,
  scope: string,
  subject: string,
  limit: number,
  windowSeconds: number,
) {
  await ensureRateLimitTable();
  const identity = scope.endsWith("-ip") ? `ip:${clientIp(request)}` : `subject:${subject.trim().toLowerCase().slice(0, 254)}`;
  const key = digest(`${scope}:${identity}`);
  if (Date.now() - lastCleanupAt > 6 * 60 * 60 * 1000) {
    lastCleanupAt = Date.now();
    await prisma.$executeRaw`DELETE FROM public.\"SecurityRateLimit\" WHERE \"updatedAt\" < NOW() - INTERVAL '2 days'`;
  }
  const rows = await prisma.$queryRaw<Array<{ allowed: boolean }>>`
    INSERT INTO public."SecurityRateLimit" AS current_limit ("key", "hits", "windowStartedAt", "updatedAt")
    VALUES (${key}, 1, NOW(), NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "hits" = CASE
        WHEN current_limit."windowStartedAt" < NOW() - (${windowSeconds} * INTERVAL '1 second') THEN 1
        ELSE current_limit."hits" + 1
      END,
      "windowStartedAt" = CASE
        WHEN current_limit."windowStartedAt" < NOW() - (${windowSeconds} * INTERVAL '1 second') THEN NOW()
        ELSE public."SecurityRateLimit"."windowStartedAt"
      END,
      "updatedAt" = NOW()
    RETURNING "hits" <= ${limit} AS allowed
  `;
  return rows[0]?.allowed === true;
}

export function privateNoStoreHeaders() {
  return { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", Vary: "Cookie" };
}
