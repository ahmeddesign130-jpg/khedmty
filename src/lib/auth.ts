import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "khedmty_session";
const SESSION_DURATION = 60 * 60 * 24 * 7;

type SessionUser = {
  id: string;
  role: "CUSTOMER" | "PROVIDER" | "SUPER_ADMIN";
  status: "ACTIVE" | "PENDING" | "SUSPENDED";
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters.");
  }

  return new TextEncoder().encode(secret);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    id: user.id,
    role: user.role,
    status: user.status,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());

  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION,
  });
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    const { payload } = await jwtVerify(token, getSecret());

    if (
      typeof payload.id !== "string" ||
      !["CUSTOMER", "PROVIDER", "SUPER_ADMIN"].includes(
        String(payload.role)
      ) ||
      !["ACTIVE", "PENDING", "SUSPENDED"].includes(
        String(payload.status)
      )
    ) {
      return null;
    }

    return {
      id: payload.id,
      role: payload.role as SessionUser["role"],
      status: payload.status as SessionUser["status"],
    };
  } catch {
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
