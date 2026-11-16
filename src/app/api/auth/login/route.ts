import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "البريد الإلكتروني أو كلمة المرور غير صحيحة." },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json(
        { message: "البريد الإلكتروني أو كلمة المرور غير صحيحة." },
        { status: 401 }
      );
    }

    const passwordIsValid = await compare(password, user.passwordHash);

    if (!passwordIsValid) {
      return NextResponse.json(
        { message: "البريد الإلكتروني أو كلمة المرور غير صحيحة." },
        { status: 401 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { message: "حسابك في انتظار التفعيل أو غير نشط." },
        { status: 403 }
      );
    }

    await createSession(user.id);

    return NextResponse.json({
      message: "تم تسجيل الدخول بنجاح."
    });
  } catch {
    return NextResponse.json(
      { message: "حدث خطأ أثناء تسجيل الدخول." },
      { status: 500 }
    );
  }
}
