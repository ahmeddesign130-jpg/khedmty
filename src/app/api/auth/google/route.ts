import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PREVIEW_HOST = "khedmty-git-feature-wallet-checkout-refresh-ahmeddesign130-jpg.vercel.app";

function googleRedirectUri(req: NextRequest) {
  if (process.env.VERCEL_ENV === "preview") {
    return `https://${PREVIEW_HOST}/api/auth/google/callback`;
  }
  return process.env.GOOGLE_REDIRECT_URI || new URL("/api/auth/google/callback", req.url).toString();
}

export async function GET(req: NextRequest) {
  // Start OAuth on the same stable Preview host that receives Google's callback.
  // This keeps the short-lived state/verifier cookies on the callback's host.
  if (process.env.VERCEL_ENV === "preview" && req.nextUrl.hostname !== PREVIEW_HOST) {
    const canonicalUrl = new URL("/api/auth/google", `https://${PREVIEW_HOST}`);
    canonicalUrl.search = req.nextUrl.search;
    return NextResponse.redirect(canonicalUrl);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(new URL("/login?error=google_not_configured", req.url));

  // Google is supported for sign-in only. Account creation always uses the email + OTP flow.
  const intent = "login";
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
  response.cookies.set("khedmty_google_intent", intent, cookieOptions);
  return response;
}
