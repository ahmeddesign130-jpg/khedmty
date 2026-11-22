import nodemailer from "nodemailer";

type EmailPurpose = "registration" | "password_reset";

function getTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error("SMTP_USER and SMTP_PASS must be configured");
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT is invalid");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

export async function sendKhedmtyCode(
  email: string,
  code: string,
  purpose: EmailPurpose,
) {
  const transporter = getTransporter();
  const isPasswordReset = purpose === "password_reset";
  const subject = isPasswordReset
    ? "كود استعادة كلمة المرور - خِدمتي"
    : "كود تأكيد البريد الإلكتروني - خِدمتي";
  const heading = isPasswordReset ? "استعادة كلمة المرور" : "أهلًا بك في خِدمتي";
  const instruction = isPasswordReset
    ? "استخدم الكود التالي لاستعادة كلمة المرور:"
    : "استخدم الكود التالي لتأكيد بريدك الإلكتروني:";
  const validity = isPasswordReset ? "5 دقائق" : "دقيقتين";
  const text = isPasswordReset
    ? `كود استعادة كلمة المرور في خِدمتي هو: ${code}. صالح لمدة ${validity}، ولا تشاركه مع أي شخص.`
    : `كود تأكيد بريدك في خِدمتي هو: ${code}. صالح لمدة ${validity}، ولا تشاركه مع أي شخص.`;
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from: { name: "خِدمتي", address: from! },
    to: email,
    subject,
    text,
    html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:2;color:#172033"><h2>${heading}</h2><p>${instruction}</p><div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px;background:#fff4e8;border-radius:12px;text-align:center;color:#172033">${code}</div><p>الكود صالح لمدة ${validity}، ولا تشاركه مع أي شخص.</p></div>`,
  });
}
