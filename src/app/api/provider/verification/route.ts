import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptProviderApplication } from "@/lib/provider-application";
import { createStorageDownload, storageReady } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !((user.role === "PROVIDER" && user.status === "PENDING") || (user.role === "CUSTOMER" && user.status === "ACTIVE"))) {
      return NextResponse.json({ message: "استكمال طلب الانضمام متاح للحسابات المؤهلة فقط." }, { status: 403 });
    }
    const body = await request.json();
    const fullName = String(body.fullName || "").trim();
    const phone = String(body.phone || "").trim();
    const profession = String(body.profession || "").trim();
    const experience = String(body.experience || "").trim();
    const bio = String(body.bio || "").trim();
    const dateOfBirth = String(body.dateOfBirth || "").trim();
    const birthMatch = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(dateOfBirth);
    const birthDate = birthMatch ? new Date(Number(birthMatch[1]), Number(birthMatch[2]) - 1, Number(birthMatch[3])) : null;
    const validBirthDate = !!birthMatch && !!birthDate && birthDate.getFullYear() === Number(birthMatch[1]) && birthDate.getMonth() === Number(birthMatch[2]) - 1 && birthDate.getDate() === Number(birthMatch[3]) && birthDate.getTime() < Date.now();
    const portfolioPaths = Array.isArray(body.portfolioPaths) ? body.portfolioPaths.map((p: unknown) => String(p)) : [];
    const ownedPath = (path: string) => path.startsWith(user.id + "/portfolio/") && path.length <= 500 && !path.includes("..");
    if (fullName.length < 3 || fullName.length > 100 || !/^01[0125][0-9]{8}$/.test(phone) ||
        !validBirthDate || profession.length < 2 || profession.length > 80 || experience.length > 1000 ||
        bio.length < 30 || bio.length > 1500 || portfolioPaths.length < 1 || portfolioPaths.length > 5 ||
        !portfolioPaths.every(ownedPath) || new Set(portfolioPaths).size !== portfolioPaths.length) {
      return NextResponse.json({ message: "راجع الاسم والهاتف والمجال والنبذة، وارفع من 1 إلى 5 نماذج أعمال." }, { status: 400 });
    }
    const latest = await prisma.auditLog.findFirst({
      where: { targetId: user.id, action: { in: ["PROVIDER_APPLICATION_SUBMITTED", "PROVIDER_APPLICATION_REJECTED", "PROVIDER_APPLICATION_APPROVED"] } },
      orderBy: { createdAt: "desc" }, select: { action: true },
    });
    if (latest?.action === "PROVIDER_APPLICATION_SUBMITTED") {
      return NextResponse.json({ message: "طلبك قيد المراجعة بالفعل." }, { status: 409 });
    }
    if (!storageReady()) return NextResponse.json({ message: "التخزين غير متاح حالياً. حاول لاحقاً." }, { status: 503 });
    const portfolioFiles = await Promise.all(portfolioPaths.map((path: string) => createStorageDownload("provider-verification", path, 300)));
    if (portfolioFiles.some(url => !url)) return NextResponse.json({ message: "تعذر العثور على أحد نماذج الأعمال. أعد رفع الملفات." }, { status: 400 });

    const encrypted = encryptProviderApplication({
      fullName, phone, nationalId: "", dateOfBirth, profession, experience, bio, portfolioPaths,
    });
    await prisma.auditLog.create({
      data: { actorId: user.id, targetId: user.id, action: "PROVIDER_APPLICATION_SUBMITTED", details: encrypted },
    });
    return NextResponse.json({ success: true, message: "تم إرسال طلب الانضمام ونماذج الأعمال للإدارة للمراجعة." }, { status: 201 });
  } catch (error) {
    console.error("PROVIDER_APPLICATION_SUBMIT_ERROR", error);
    return NextResponse.json({ message: "تعذر إرسال طلب الانضمام حاليًا." }, { status: 500 });
  }
}
