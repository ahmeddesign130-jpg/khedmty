import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

function fail(req: NextRequest, code: string) {
  const response = NextResponse.redirect(new URL("/login?error=" + code, req.url));
  response.cookies.set("khedmty_google_state", "", { path: "/api/auth/google/callback", maxAge: 0 });
  response.cookies.set("khedmty_google_verifier", "", { path: "/api/auth/google/callback", maxAge: 0 });
  return response;
}

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    if (params.get("error")) return fail(req, "google_denied");
    const code = params.get("code");
    const state = params.get("state");
    const savedState = req.cookies.get("khedmty_google_state")?.value;
    const verifier = req.cookies.get("khedmty_google_verifier")?.value;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || new URL("/api/auth/google/callback", req.url).toString();

    if (!code || !state || !savedState || state !== savedState || !verifier || !clientId || !clientSecret) {
      return fail(req, "google_failed");
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: redirectUri, grant_type: "authorization_code",
        code_verifier: verifier,
      }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) return fail(req, "google_failed");
    const tokenData = await tokenResponse.json() as { access_token?: string };
    if (!tokenData.access_token) return fail(req, "google_failed");

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: "Bearer " + tokenData.access_token },
      cache: "no-store",
    });
    if (!profileResponse.ok) return fail(req, "google_failed");
    const profile = await profileResponse.json() as { sub?: string; email?: string; email_verified?: boolean; name?: string };
    if (!profile.sub || !profile.email || profile.email_verified !== true) return fail(req, "google_failed");

    const email = profile.email.trim().toLowerCase();
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const passwordHash = await bcrypt.hash(randomBytes(48).toString("hex"), 12);
      try {
        user = await prisma.user.create({
          data: {
            email,
            displayName: (profile.name || email.split("@")[0]).slice(0, 70),
            passwordHash,
            role: "CUSTOMER",
            status: "ACTIVE",
          },
        });
      } catch {
        // A concurrent first login may have created the same verified email.
        user = await prisma.user.findUnique({ where: { email } });
        if (!user) throw new Error("GOOGLE_ACCOUNT_CREATE_FAILED");
      }
    }

    if (user.status === "SUSPENDED") return fail(req, "google_failed");
    await createSession({ id: user.id, role: user.role, status: user.status });

    const destination = user.role === "SUPER_ADMIN" ? "/admin"
      : user.role === "PROVIDER" && user.status === "PENDING" ? "/pending"
      : user.role === "PROVIDER" ? "/provider" : "/account";
    const response = NextResponse.redirect(new URL(destination, req.url));
    response.cookies.delete("khedmty_google_state");
    response.cookies.delete("khedmty_google_verifier");
    return response;
  } catch (error) {
    console.error("Google authentication error:", error);
    return fail(req, "google_failed");
  }
}
