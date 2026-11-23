import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/auth";
import { createRemoteJWKSet, jwtVerify } from "jose";

export const dynamic = "force-dynamic";

const PRODUCTION_HOST = "khedmty-swart.vercel.app";

// Cached Google signing keys let us verify the ID token without a second userinfo round trip.
const googleJwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

function googleRedirectUri() {
  if (process.env.VERCEL_ENV === "preview") {
    return "https://khedmty-git-feature-wallet-checkout-refresh-ahmeddesign130-jpg.vercel.app/api/auth/google/callback";
  }
  return `https://${PRODUCTION_HOST}/api/auth/google/callback`;
}

function fail(req: NextRequest, code: string, destination: "/login" | "/register" = "/login") {
  const response = NextResponse.redirect(new URL(destination + "?error=" + code, req.url));
  for (const name of ["khedmty_google_state", "khedmty_google_verifier", "khedmty_google_role", "khedmty_google_intent", "khedmty_google_terms"]) {
    response.cookies.set(name, "", { path: "/api/auth/google/callback", maxAge: 0 });
  }
  return response;
}

export async function GET(req: NextRequest) {
  try {
    // If an old or manually entered alias receives the callback, move it to the
    // canonical host. Normal sign-in starts on this host, so its cookies are present.
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
    // OAuth callback is sign-in only. It must never create a Khedmty account.
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = googleRedirectUri();

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
        redirect_uri: redirectUri, grant_type: "authorization_code",
        code_verifier: verifier,
      }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) { console.error("Google token exchange failed", tokenResponse.status, await tokenResponse.text().catch(() => "")); return fail(req, "google_token"); }
    const tokenData = await tokenResponse.json() as { id_token?: string };
    if (!tokenData.id_token) { console.error("Google token response did not include an ID token"); return fail(req, "google_token"); }

    // Validate Google's signed identity token locally (cached JWKS) instead of making
    // a second sequential HTTPS request to the userinfo endpoint.
    const verified = await jwtVerify(tokenData.id_token, googleJwks, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: clientId,
    });
    const claims = verified.payload;
    const emailClaim = typeof claims.email === "string" ? claims.email : "";
    const profile = {
      sub: typeof claims.sub === "string" ? claims.sub : "",
      email: emailClaim,
      email_verified: claims.email_verified === true || claims.email_verified === "true",
    };
    if (!profile.sub || !profile.email || profile.email_verified !== true) {
      console.error("Google ID token is missing verified identity fields");
      return fail(req, "google_profile");
    }

    const email = profile.email.trim().toLowerCase();
    const exactUser = await prisma.user.findUnique({ where: { email } });
    const user = exactUser ?? await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    console.info("Google account lookup completed", {
      matched: Boolean(user),
      matchedBy: exactUser ? "exact" : user ? "case_insensitive" : "none",
      emailDomain: email.split("@")[1] ?? "unknown",
    });
    // This is a sign-in flow: never send an existing user through account creation.
    if (!user) return fail(req, "google_account_required", "/login");

    if (user.status === "SUSPENDED") return fail(req, "google_failed");
    // Google's signed email_verified claim proves the email. Activate customers even
    // when their email was already verified but their account status was left PENDING.
    // Provider approval state remains unchanged until an admin approves the application.
    const needsActivation = !user.emailVerifiedAt ||
      (user.role === "CUSTOMER" && user.status !== "ACTIVE");
    const verifiedUser = needsActivation ? await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        status: user.role === "CUSTOMER" ? "ACTIVE" : user.status,
      },
    }) : user;

    let sessionToken: string;
    try {
      sessionToken = await createSession({ id: verifiedUser.id, role: verifiedUser.role, status: verifiedUser.status });
    } catch (sessionError) {
      console.error("Google session creation failed:", sessionError);
      return fail(req, "google_session");
    }

    const destination = verifiedUser.role === "SUPER_ADMIN" ? "/admin"
      : verifiedUser.role === "PROVIDER" && verifiedUser.status === "PENDING" ? "/register/provider-details"
      : verifiedUser.role === "PROVIDER" ? "/provider" : "/services";
    const response = NextResponse.redirect(new URL(destination, req.url));
    // Attach the session directly to the redirect response so the browser reliably stores it.
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, SESSION_COOKIE_OPTIONS);
    console.info("Google session cookie attached to redirect", { destination, role: verifiedUser.role });
    for (const name of ["khedmty_google_state", "khedmty_google_verifier", "khedmty_google_role", "khedmty_google_intent", "khedmty_google_terms"]) {
      response.cookies.set(name, "", { path: "/api/auth/google/callback", maxAge: 0 });
    }
    return response;
  } catch (error) {
    console.error("Google authentication error:", error);
    return fail(req, "google_failed");
  }
}
