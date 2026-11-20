import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be configured.");
  return createHash("sha256").update(secret).digest();
}

export type ProviderApplicationData = {
  fullName: string;
  phone: string;
  nationalId: string;
  profession: string;
  experience: string;
  bio: string;
};

export function encryptProviderApplication(data: ProviderApplicationData) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);
  return ["enc:v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(":");
}

export function decryptProviderApplication(value: string): ProviderApplicationData | null {
  try {
    const [version, ivText, tagText, encryptedText] = value.split(":");
    if (version !== "enc" || ivText !== "v1" || !tagText || !encryptedText) return null;
    const parts = value.split(":");
    const iv = Buffer.from(parts[2], "base64url");
    const tag = Buffer.from(parts[3], "base64url");
    const ciphertext = Buffer.from(parts[4], "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    const data = JSON.parse(plain) as ProviderApplicationData;
    return data && typeof data.nationalId === "string" ? data : null;
  } catch {
    return null;
  }
}
