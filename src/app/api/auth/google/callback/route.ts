import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/login?error=google_disabled", req.url), 303);
}
