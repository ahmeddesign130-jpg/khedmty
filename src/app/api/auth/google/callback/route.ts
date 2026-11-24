import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/auth";
import { createRemoteJWKSet, jwtVerify } from "jose";

export const dynamic = "force-dynamic";
const PRODUCTION_HOST = "khedmty-swart.vercel.app";
const googleJwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

function googleRedirectUri(req: NextRequest) {
  const origin = process.env.VERCEL_ENV === "preview" ? req.nextUrl.origin : `https://${PRODUCTION_HOST}`;
  return new URL("/api/auth/google/callback", origin).toString();
}

function fail(req: NextRequest, code: string) {
  const response = NextResponse.redirect(new URL("/login?error=" + code, req.url));
  for (const name of ["khedmty_google_state", "khedmty_google_verifier"]) {
    response.cookies.set(name, "", { path: "/api/auth/google/callback", maxAge: 0 });
  }
  return response;
}

export async function GET(req: NextRequest) {
  try {
    if (process.env.VERCEL_ENV !== "preview" && req.nextUrl.hostname !== PRODUCTION_HOST) {
      const canonicalUrl = new URL("/api/auth/google/callback", `https://${PRODUCTION_HOST}`);
      canonicalUrl.search = req.nextUrl.search;
      return NextResponse.redirect(canonicalUrl);
    }
    const params = req.nextUrl.searchParams;
    if (params.get("error")) return fail(req, "google_denied");
    const code = params.get("code");
    const state = params.get("state");
    const savedState = req.cookies.get("khedmty_google_state")?.value;
    const verifier = req.cookies.get("khedmty_google_verifier")?.value;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = googleRedirectUri(req);

    if (!code || !state || !savedState || state !== savedState || !verifier || !clientId || !clientSecret) {
      console.warn("Google OAuth callback validation failed", {
        hasCode: Boolean(code), hasState: Boolean(state), hasSavedState: Boolean(savedState),
        stateMatches: Boolean(state && savedState && state === savedState),
        hasVerifier: Boolean(verifier), hasClientId: Boolean(clientId), hasClientSecret: Boolean(clientSecret),
        host: req.nextUrl.hostname,
      });
      return fail(req, "google_failed");
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: redirectUri, grant_type: "authorization_code", code_verifier: verifier,
      }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) {
      console.error("Google token exchange failed", tokenResponse.status);
      return fail(req, "google_token");
    }
    const tokenData = await tokenResponse.json() as { id_token?: string };
    if (!tokenData.id_token) return fail(req, "google_token");

    const verified = await jwtVerify(tokenData.id_token, googleJwks, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: clientId,
    });
    const claims = verified.payload;
    const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
    const subject = typeof claims.sub === "string" ? claims.sub : "";
    const emailVerified = claims.email_verified === true || claims.email_verified === "true";
    if (!subject || !email || !emailVerified) return fail(req, "google_profile");

    const account = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, email: true, role: true, status: true, emailVerifiedAt: true },
    });
    if (!account) return fail(req, "google_account_required");
    if (account.status === "SUSPENDED") return fail(req, "google_disabled");

    const verifiedAccount = !account.emailVerifiedAt || (account.role === "CUSTOMER" && account.status !== "ACTIVE")
      ? await prisma.user.update({
          where: { id: account.id },
          data: {
            emailVerifiedAt: account.emailVerifiedAt ?? new Date(),
            status: account.role === "CUSTOMER" ? "ACTIVE" : account.status,
          },
          select: { id: true, role: true, status: true },
        })
      : account;
    const destination = verifiedAccount.role === "SUPER_ADMIN" ? "/admin"
      : verifiedAccount.role === "PROVIDER" && verifiedAccount.status === "PENDING" ? "/register/provider-details"
      : verifiedAccount.role === "PROVIDER" ? "/provider" : "/services";
    const sessionToken = await createSession({ id: verifiedAccount.id, role: verifiedAccount.role, status: verifiedAccount.status });
    const response = NextResponse.redirect(new URL(destination, req.url));
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, SESSION_COOKIE_OPTIONS);
    for (const name of ["khedmty_google_state", "khedmty_google_verifier"]) {
      response.cookies.set(name, "", { path: "/api/auth/google/callback", maxAge: 0 });
    }
    return response;
  } catch (error) {
    console.error("Google authentication error:", error instanceof Error ? error.name : "UnknownError");
    return fail(req, "google_failed");
  }
}
