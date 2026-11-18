import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const tables = await prisma.$queryRaw<Array<{
      users: string | null;
      profiles: string | null;
      services: string | null;
      orders: string | null;
      payments: string | null;
      settings: string | null;
      auditLogs: string | null;
    }>>`
      SELECT
        to_regclass('public."User"')::text AS users,
        to_regclass('public."Profile"')::text AS profiles,
        to_regclass('public."Service"')::text AS services,
        to_regclass('public."Order"')::text AS orders,
        to_regclass('public."Payment"')::text AS payments,
        to_regclass('public."PlatformSettings"')::text AS settings,
        to_regclass('public."AuditLog"')::text AS "auditLogs"
    `;

    const schemaReady = tables.length === 1 && Object.values(tables[0]).every(Boolean);
    if (!schemaReady) {
      return NextResponse.json(
        { status: "degraded", database: "schema_incomplete" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { status: "ok", database: "connected", schema: "ready" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      { status: "degraded", database: "unavailable" },
      { status: 503 }
    );
  }
}
