import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptProviderApplication } from "@/lib/provider-application";
import { createStorageDownload, storageReady } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !((user.role === "PROVIDER" && user.status === "PENDING") || (user.role === "CUSTOMER" && user.status === "ACTIVE"))) {
      return NextResponse.json({ message: "غير مصرح." }, { status: 403 });
    }
    const latest = await prisma.auditLog.findFirst({
      where: { targetId: user.id, action: "PROVIDER_APPLICATION_DRAFT_SAVED" },
      orderBy: { createdAt: "desc" }, select: { details: true },
    });
    if (!latest?.details) return NextResponse.json({ draft: null });
    const { decryptProviderApplication } = await import("@/lib/provider-application");
    return NextResponse.json({ draft: decryptProviderApplication(latest.details) });
  } catch (error) {
    console.error("PROVIDER_DRAFT_LOAD_ERROR", error);
    return NextResponse.json({ message: "تعذر تحميل البيانات المحفوظة." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !((user.role === "PROVIDER" && user.status === "PENDING") || (user.role === "CUSTOMER" && user.status === "ACTIVE"))) {
      return NextResponse.json({ message: "غير مصرح." }, { status: 403 });
    }
    const body = await request.json();
    const fullName = String(body.fullName || "").slice(0, 100);
    const phone = String(body.phone || "").slice(0, 30);
    const profession = String(body.profession || "").slice(0, 80);
    const experience = String(body.experience || "").slice(0, 1000);
    const bio = String(body.bio || "").slice(0, 1500);
    const dateOfBirth = String(body.dateOfBirth || "").slice(0, 10);
    const previous = await prisma.auditLog.findFirst({
      where: { targetId: user.id, action: "PROVIDER_APPLICATION_DRAFT_SAVED" },
      orderBy: { createdAt: "desc" }, select: { id: true, details: true },
    });
    const { decryptProviderApplication } = await import("@/lib/provider-application");
    const oldDraft = previous?.details ? decryptProviderApplication(previous.details) : null;
    const portfolioPaths = Array.isArray(body.portfolioPaths)
      ? body.portfolioPaths.map((p: unknown) => String(p)).slice(0, 5)
      : (oldDraft?.portfolioPaths || []).filter((path: string) => /\.(jpg|jpeg|png|webp)$/i.test(path));
    const ownedPath = (path: string) => path.startsWith(user.id + "/portfolio/") && path.length <= 500 && !path.includes("..") && /\.(jpg|jpeg|png|webp)$/i.test(path);
    if (portfolioPaths.some((path: string) => !ownedPath(path)) || new Set(portfolioPaths).size !== portfolioPaths.length) {
      return NextResponse.json({ message: "ملفات نماذج الأعمال غير صالحة." }, { status: 400 });
    }
    const encrypted = encryptProviderApplication({
      fullName, phone, nationalId: "", dateOfBirth, profession, experience, bio, portfolioPaths,
    });
    if (previous) {
      await prisma.auditLog.update({ where: { id: previous.id }, data: { actorId: user.id, details: encrypted } });
    } else {
      await prisma.auditLog.create({
        data: { actorId: user.id, targetId: user.id, action: "PROVIDER_APPLICATION_DRAFT_SAVED", details: encrypted },
      });
    }
    return NextResponse.json({ success: true, savedAt: new Date().toISOString() });
  } catch (error) {
    console.error("PROVIDER_DRAFT_SAVE_ERROR", error);
    return NextResponse.json({ message: "تعذر حفظ المسودة حاليًا." }, { status: 500 });
  }
}


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
    const nationalId = String(body.nationalId || "").replace(/\D/g, "");
    const dateOfBirth = String(body.dateOfBirth || "").trim();
    const birthMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
    const birthDate = birthMatch ? new Date(Number(birthMatch[1]), Number(birthMatch[2]) - 1, Number(birthMatch[3])) : null;
    const idYear = nationalId.length === 14 && /^[23]/.test(nationalId) ? (nationalId[0] === "2" ? 1900 : 2000) + Number(nationalId.slice(1, 3)) : 0;
    const idMonth = Number(nationalId.slice(3, 5));
    const idDay = Number(nationalId.slice(5, 7));
    const idDate = idYear ? new Date(idYear, idMonth - 1, idDay) : null;
    const idDateIsValid = !!idDate && idDate.getFullYear() === idYear && idDate.getMonth() === idMonth - 1 && idDate.getDate() === idDay;
    const validBirthDate = nationalId.length === 14 && idDateIsValid && dateOfBirth === `${idYear}-${String(idMonth).padStart(2, "0")}-${String(idDay).padStart(2, "0")}` && !!birthMatch && !!birthDate && birthDate.getFullYear() === Number(birthMatch[1]) && birthDate.getMonth() === Number(birthMatch[2]) - 1 && birthDate.getDate() === Number(birthMatch[3]) && birthDate.getTime() < Date.now();
    const portfolioPaths = Array.isArray(body.portfolioPaths) ? body.portfolioPaths.map((p: unknown) => String(p)) : [];
    const ownedPath = (path: string) => path.startsWith(user.id + "/portfolio/") && path.length <= 500 && !path.includes("..") && /\.(jpg|jpeg|png|webp)$/i.test(path);
    if (fullName.length < 3 || fullName.length > 100 || !/^01[0125][0-9]{8}$/.test(phone) ||
        !validBirthDate || profession.length < 2 || profession.length > 80 || experience.length > 1000 ||
        bio.length < 10 || bio.length > 1500 || portfolioPaths.length < 1 || portfolioPaths.length > 5 ||
        !portfolioPaths.every(ownedPath) || new Set(portfolioPaths).size !== portfolioPaths.length) {
      return NextResponse.json({ message: "راجع الاسم والهاتف وتاريخ الميلاد والمجال والنبذة (10 أحرف على الأقل)، وارفع من 1 إلى 5 صور لنماذج أعمالك." }, { status: 400 });
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
    return NextResponse.json({ success: true, message: "تم إرسال طلب الانضمام وصور نماذج الأعمال للإدارة للمراجعة." }, { status: 201 });
  } catch (error) {
    console.error("PROVIDER_APPLICATION_SUBMIT_ERROR", error);
    return NextResponse.json({ message: "تعذر إرسال طلب الانضمام حاليًا." }, { status: 500 });
  }
}
