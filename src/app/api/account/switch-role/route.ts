import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  if (user.role === "SUPER_ADMIN") return NextResponse.redirect(new URL("/admin", request.url), 303);
  if (user.role !== "PROVIDER" || user.status !== "ACTIVE") {
    return NextResponse.redirect(new URL(user.role === "PROVIDER" ? "/pending" : "/account", request.url), 303);
  }

  const unfinishedOrders = await prisma.order.count({
    where: {
      providerId: user.id,
      status: { notIn: ["COMPLETED", "CANCELLED", "REJECTED"] },
    },
  });
  if (unfinishedOrders > 0) {
    return NextResponse.redirect(new URL("/provider?switch=orders", request.url), 303);
  }

  await prisma.$transaction(async (tx) => {
    await tx.service.updateMany({
      where: { providerId: user.id, status: { in: ["APPROVED", "PENDING_REVIEW"] } },
      data: { status: "PAUSED" },
    });
    const changed = await tx.user.updateMany({
      where: { id: user.id, role: "PROVIDER", status: "ACTIVE" },
      data: { role: "CUSTOMER" },
    });
    if (changed.count !== 1) throw new Error("ROLE_SWITCH_CONFLICT");
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        targetId: user.id,
        action: "PROVIDER_SWITCHED_TO_CUSTOMER",
        details: "عاد مقدم الخدمة إلى وضع العميل. تم إيقاف الخدمات المنشورة مؤقتًا.",
      },
    });
  });

  return NextResponse.redirect(new URL("/account?switched=customer", request.url), 303);
}
