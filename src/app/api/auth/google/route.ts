import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const PRODUCTION_HOST = "khedmty-swart.vercel.app";

function googleRedirectUri(req: NextRequest) {
  const origin = process.env.VERCEL_ENV === "preview" ? req.nextUrl.origin : `https://${PRODUCTION_HOST}`;
  return new URL("/api/auth/google/callback", origin).toString();
}

export async function GET(req: NextRequest) {
  const canonicalHost = process.env.VERCEL_ENV === "preview" ? req.nextUrl.hostname : PRODUCTION_HOST;
  if (req.nextUrl.hostname !== canonicalHost) {
    const canonicalUrl = new URL("/api/auth/google", `https://${canonicalHost}`);
    canonicalUrl.search = req.nextUrl.search;
    return NextResponse.redirect(canonicalUrl);
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(new URL("/login?error=google_not_configured", req.url));

  // Google sign-in is available to customers/providers only, never to the primary admin.
  const state = randomBytes(32).toString("hex");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const redirectUri = googleRedirectUri(req);
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(url);
  const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/api/auth/google/callback", maxAge: 600 };
  response.cookies.set("khedmty_google_state", state, cookieOptions);
  response.cookies.set("khedmty_google_verifier", verifier, cookieOptions);
  return response;
}
