import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const fileSchema = z.object({
  objectPath: z.string().min(1).max(500),
  fileName: z.string().trim().min(1).max(180),
  mimeType: z.string().min(3).max(120),
  sizeBytes: z.number().int().positive().max(50 * 1024 * 1024),
});
const bodySchema = z.object({ files: z.array(fileSchema).min(1).max(10) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "PROVIDER" || user.status !== "ACTIVE") {
      return NextResponse.json({ message: "هذه العملية لمقدم الخدمة المعتمد فقط." }, { status: 403 });
    }
    const { id } = await params;
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: "بيانات الملفات غير صحيحة." }, { status: 400 });

    const order = await prisma.order.findFirst({
      where: { id, providerId: user.id, status: { in: ["IN_PROGRESS", "REVISION_REQUESTED"] } },
      select: { id: true, orderNo: true, customerId: true, status: true },
    });
    if (!order) return NextResponse.json({ message: "الطلب غير متاح للتسليم." }, { status: 403 });

    const allowedTypes = new Set([
      "image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm",
      "video/quicktime", "application/pdf", "application/zip",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]);
    const files = parsed.data.files;
    if (files.some(file => !allowedTypes.has(file.mimeType) ||
      !file.objectPath.startsWith(`${order.id}/${user.id}/`) ||
      file.objectPath.includes("..") || file.objectPath.startsWith("/") ||
      !Number.isSafeInteger(file.sizeBytes))) {
      return NextResponse.json({ message: "أحد الملفات لا يطابق شروط التسليم الآمن." }, { status: 400 });
    }

    await prisma.$transaction(async tx => {
      for (const file of files) {
        await tx.orderDeliveryFile.create({
          data: { orderId: order.id, uploaderId: user.id, ...file },
        });
      }
      const changed = await tx.order.updateMany({
        where: { id: order.id, providerId: user.id, status: order.status },
        data: { status: "DELIVERED" },
      });
      if (changed.count !== 1) throw new Error("DELIVERY_CONFLICT");
      await tx.notification.create({
        data: {
          userId: order.customerId,
          title: "تم تسليم ملفات طلبك",
          body: `أرفق مقدم الخدمة ملفات التسليم للطلب ${order.orderNo}. يمكنك فتح الطلب ومراجعة الملفات.`,
          href: `/orders/${order.id}`,
        },
      });
      await tx.auditLog.create({
        data: { actorId: user.id, action: "ORDER_DELIVERY_UPLOADED", targetId: order.id, details: `تم رفع ${files.length} ملف/ملفات وتسليم الطلب ${order.orderNo}` },
      });
    });

    return NextResponse.json({ message: "تم رفع الملفات وربطها بالطلب وإشعار العميل." }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "DELIVERY_CONFLICT") {
      return NextResponse.json({ message: "تغيرت حالة الطلب. حدّث الصفحة وحاول مرة أخرى." }, { status: 409 });
    }
    console.error("ORDER_DELIVERY_UPLOAD_ERROR", error);
    return NextResponse.json({ message: "تعذر حفظ ملفات التسليم." }, { status: 500 });
  }
}
