import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const tables = await prisma.$queryRaw<Array<{
      users: string | null;
      profiles: string | null;
      services: string | null;
      orders: string | null;
      payments: string | null;
      settings: string | null;
      auditLogs: string | null;
      emailOtps: string | null;
      providerNet: string | null;
      orderCommissionRate: string | null;
    }>>`
      SELECT
        to_regclass('public."User"')::text AS users,
        to_regclass('public."Profile"')::text AS profiles,
        to_regclass('public."Service"')::text AS services,
        to_regclass('public."Order"')::text AS orders,
        to_regclass('public."Payment"')::text AS payments,
        to_regclass('public."PlatformSettings"')::text AS settings,
        to_regclass('public."AuditLog"')::text AS "auditLogs",
        to_regclass('public."EmailOtp"')::text AS "emailOtps",
        (SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Order' AND column_name = 'providerNet') AS "providerNet",
        (SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Order' AND column_name = 'commissionRate') AS "orderCommissionRate"
    `;

    const missingTables = tables.length === 1 ? Object.entries(tables[0]).filter(([, value]) => !value).map(([name]) => name) : ["User", "Profile", "Service", "Order", "Payment", "PlatformSettings", "AuditLog"];
    const schemaReady = missingTables.length === 0;
    if (!schemaReady) {
      return NextResponse.json(
        { status: "degraded" },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { status: "ok" },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      { status: "degraded" },
      { status: 503 }
    );
  }
}
