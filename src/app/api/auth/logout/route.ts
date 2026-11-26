import { NextRequest, NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";
import { enforceSameOrigin } from "@/lib/security";

export async function POST(request: NextRequest) {
  if (!enforceSameOrigin(request)) return NextResponse.redirect(new URL("/login", request.url), 303);
  await clearSession();
  return NextResponse.redirect(new URL("/", request.url), 303);
}
