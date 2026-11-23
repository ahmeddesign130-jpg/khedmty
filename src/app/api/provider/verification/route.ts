import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptProviderApplication } from "@/lib/provider-application";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "PROVIDER" || user.status !== "PENDING") {
      return NextResponse.json({ message: "استكمال التحقق متاح لمقدم الخدمة صاحب الحساب المعلّق فقط." }, { status: 403 });
    }
    const body = await request.json();
    const fullName = String(body.fullName || "").trim();
    const phone = String(body.phone || "").trim();
    const nationalId = String(body.nationalId || "").replace(/\D/g, "");
    const profession = String(body.profession || "").trim();
    const experience = String(body.experience || "").trim();
    const bio = String(body.bio || "").trim();
    const dateOfBirth = String(body.dateOfBirth || "");
    const idFrontPath = String(body.idFrontPath || "");
    const idBackPath = String(body.idBackPath || "");
    const dob = new Date(dateOfBirth + "T00:00:00.000Z");
    const age = Number.isNaN(dob.getTime()) ? 0 : Math.floor((Date.now() - dob.getTime()) / (365.2425 * 24 * 60 * 60 * 1000));
    const ownedPath = (path: string) => path.startsWith(user.id + "/verification/") && path.length <= 500 && !path.includes("..");
    if (fullName.length < 3 || fullName.length > 100 || !/^01[0125][0-9]{8}$/.test(phone) ||
        !/^[0-9]{14}$/.test(nationalId) || profession.length < 2 || profession.length > 80 ||
        experience.length > 500 || bio.length < 20 || bio.length > 1000 ||
        !dateOfBirth || age < 18 || age > 100 || !ownedPath(idFrontPath) || !ownedPath(idBackPath) || idFrontPath === idBackPath) {
      return NextResponse.json({ message: "راجع البيانات المطلوبة، وتأكد من السن والرقم القومي وصور البطاقة." }, { status: 400 });
    }
    const latest = await prisma.auditLog.findFirst({
      where: { targetId: user.id, action: { in: ["PROVIDER_APPLICATION_SUBMITTED", "PROVIDER_APPLICATION_REJECTED", "PROVIDER_APPLICATION_APPROVED"] } },
      orderBy: { createdAt: "desc" },
      select: { action: true },
    });
    if (latest?.action === "PROVIDER_APPLICATION_SUBMITTED") {
      return NextResponse.json({ message: "طلبك قيد المراجعة بالفعل." }, { status: 409 });
    }
    const encrypted = encryptProviderApplication({ fullName, phone, nationalId, profession, experience, bio, dateOfBirth, idFrontPath, idBackPath });
    await prisma.auditLog.create({
      data: { actorId: user.id, targetId: user.id, action: "PROVIDER_APPLICATION_SUBMITTED", details: encrypted },
    });
    return NextResponse.json({ success: true, message: "تم إرسال بيانات التحقق للإدارة بنجاح." }, { status: 201 });
  } catch (error) {
    console.error("PROVIDER_VERIFICATION_SUBMIT_ERROR", error);
    return NextResponse.json({ message: "تعذر إرسال طلب التحقق حاليًا." }, { status: 500 });
  }
}
