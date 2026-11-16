import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";
import { hash } from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "راجع البيانات المدخلة." },
        { status: 400 }
      );
    }

    const { email, password, displayName, role } = result.data;

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "البريد الإلكتروني مستخدم بالفعل." },
        { status: 409 }
      );
    }

    const passwordHash = await hash(password, 12);

    await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        status: "PENDING",
        profile: {
          create: { displayName }
        }
      }
    });

    return NextResponse.json(
      { message: "تم إنشاء الحساب بنجاح، الحساب في انتظار التفعيل." },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { message: "حدث خطأ أثناء إنشاء الحساب." },
      { status: 500 }
    );
  }
}
