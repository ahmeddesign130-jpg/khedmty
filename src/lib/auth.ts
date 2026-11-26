import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "khedmty_session";
const SESSION_DURATION = 60 * 60 * 24 * 7;
const PRIMARY_ADMIN_EMAIL = (process.env.PRIMARY_ADMIN_EMAIL || "ahmeddesign130@gmail.com").trim().toLowerCase();

type SessionUser = {
  id: string;
  role: "CUSTOMER" | "PROVIDER" | "SUPER_ADMIN";
  status: "ACTIVE" | "PENDING" | "SUSPENDED";
};

type AuthenticatedAccount = SessionUser & { email: string };

// The platform owner's email is protected as the primary administrator.
// This also repairs an older owner account that was mistakenly stored as CUSTOMER.
export async function ensurePrimaryAdmin(user: AuthenticatedAccount): Promise<AuthenticatedAccount> {
  if (user.email.trim().toLowerCase() !== PRIMARY_ADMIN_EMAIL) return user;
  if (user.role === "SUPER_ADMIN" && user.status === "ACTIVE") return user;
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: "SUPER_ADMIN", status: "ACTIVE" },
    select: { role: true, status: true },
  });
  return { ...user, role: updated.role, status: updated.status };
}

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters.");
  return new TextEncoder().encode(secret);
}

export async function createSession(user: SessionUser): Promise<string> {
  const token = await new SignJWT({ id: user.id })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "preview",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION,
  });
  return token;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DURATION,
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  let token: string | undefined;
  try {
    const cookieStore = await cookies();
    token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) {
      console.info("[auth-session] missing_cookie");
      return null;
    }
  } catch (error) {
    console.error("[auth-session] cookie_read_failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return null;
  }

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (typeof payload.id !== "string") {
      console.warn("[auth-session] invalid_payload");
      return null;
    }
    userId = payload.id;
  } catch (error) {
    console.warn("[auth-session] jwt_verification_failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return null;
  }

  try {
    const account = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, status: true },
    });
    if (!account) {
      console.warn("[auth-session] user_not_found");
      return null;
    }
    const user = await ensurePrimaryAdmin(account);
    if (user.status === "SUSPENDED") {
      console.warn("[auth-session] user_suspended");
      return null;
    }
    console.info("[auth-session] session_valid", { role: user.role, status: user.status });
    return { id: user.id, role: user.role, status: user.status };
  } catch (error) {
    console.error("[auth-session] database_lookup_failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
