import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

function googleRedirectUri(req: NextRequest) {
  if (process.env.VERCEL_ENV === "preview") {
    return "https://khedmty-git-feature-wallet-checkout-refresh-ahmeddesign130-jpg.vercel.app/api/auth/google/callback";
  }
  return process.env.GOOGLE_REDIRECT_URI || new URL("/api/auth/google/callback", req.url).toString();
}

function fail(req: NextRequest, code: string, destination: "/login" | "/register" = "/login") {
  const response = NextResponse.redirect(new URL(destination + "?error=" + code, req.url));
  for (const name of ["khedmty_google_state", "khedmty_google_verifier", "khedmty_google_role", "khedmty_google_intent"]) {
    response.cookies.set(name, "", { path: "/api/auth/google/callback", maxAge: 0 });
  }
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
    const requestedRole = req.cookies.get("khedmty_google_role")?.value === "PROVIDER" ? "PROVIDER" : "CUSTOMER";
    const intent = req.cookies.get("khedmty_google_intent")?.value === "login" ? "login" : "register";
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = googleRedirectUri(req);

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
    if (!tokenResponse.ok) { console.error("Google token exchange failed", tokenResponse.status, await tokenResponse.text().catch(() => "")); return fail(req, "google_token"); }
    const tokenData = await tokenResponse.json() as { access_token?: string };
    if (!tokenData.access_token) { console.error("Google token response did not include an access token"); return fail(req, "google_token"); }

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: "Bearer " + tokenData.access_token },
      cache: "no-store",
    });
    if (!profileResponse.ok) { console.error("Google profile request failed", profileResponse.status); return fail(req, "google_profile"); }
    const profile = await profileResponse.json() as { sub?: string; email?: string; email_verified?: boolean; name?: string };
    if (!profile.sub || !profile.email || profile.email_verified !== true) { console.error("Google profile is missing verified identity fields"); return fail(req, "google_profile"); }

    const email = profile.email.trim().toLowerCase();
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user && intent === "login") return fail(req, "google_account_required", "/login");
    if (!user) {
      const passwordHash = await bcrypt.hash(randomBytes(48).toString("hex"), 12);
      try {
        user = await prisma.user.create({
          data: {
            email,
            displayName: (profile.name || email.split("@")[0]).slice(0, 70),
            passwordHash,
            role: requestedRole,
            status: requestedRole === "PROVIDER" ? "PENDING" : "ACTIVE",
          },
        });
      } catch {
        user = await prisma.user.findUnique({ where: { email } });
        if (!user) throw new Error("GOOGLE_ACCOUNT_CREATE_FAILED");
      }
    }

    if (user.status === "SUSPENDED") return fail(req, "google_failed");
    try { await createSession({ id: user.id, role: user.role, status: user.status }); } catch (sessionError) { console.error("Google session creation failed:", sessionError); return fail(req, "google_session"); }

    const destination = user.role === "SUPER_ADMIN" ? "/admin"
      : user.role === "PROVIDER" && user.status === "PENDING" ? "/pending"
      : user.role === "PROVIDER" ? "/provider" : "/services";
    const response = NextResponse.redirect(new URL(destination, req.url));
    for (const name of ["khedmty_google_state", "khedmty_google_verifier", "khedmty_google_role", "khedmty_google_intent"]) {
      response.cookies.set(name, "", { path: "/api/auth/google/callback", maxAge: 0 });
    }
    return response;
  } catch (error) {
    console.error("Google authentication error:", error);
    return fail(req, "google_failed");
  }
}
