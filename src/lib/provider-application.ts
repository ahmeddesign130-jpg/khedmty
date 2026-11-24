import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function deriveKey(secret: string) { return createHash("sha256").update(secret).digest(); }
function activeKey() {
  const secret = process.env.PII_ENCRYPTION_KEY || process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("PII_ENCRYPTION_KEY or AUTH_SECRET must be configured.");
  return deriveKey(secret);
}
function legacyKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be configured.");
  return deriveKey(secret);
}

export type ProviderApplicationData = {
  fullName: string;
  phone: string;
  nationalId: string;
  profession: string;
  experience: string;
  bio: string;
  portfolioPaths?: string[];
  dateOfBirth?: string;
  idFrontPath?: string;
  idBackPath?: string;
};

export function encryptProviderApplication(data: ProviderApplicationData) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", activeKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);
  return ["enc:v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(":");
}

function decryptWithKey(value: string, encryptionKey: Buffer): ProviderApplicationData | null {
  try {
    const parts = value.split(":");
    if (parts.length !== 5 || parts[0] !== "enc" || parts[1] !== "v1" || !parts[2] || !parts[3] || !parts[4]) return null;
    const iv = Buffer.from(parts[2], "base64url");
    const tag = Buffer.from(parts[3], "base64url");
    const ciphertext = Buffer.from(parts[4], "base64url");
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    const data = JSON.parse(plain) as ProviderApplicationData;
    return data && typeof data.fullName === "string" && typeof data.phone === "string" &&
      typeof data.profession === "string" && typeof data.bio === "string" ? data : null;
  } catch { return null; }
}

export function decryptProviderApplication(value: string): ProviderApplicationData | null {
  try {
    const current = decryptWithKey(value, activeKey());
    if (current) return current;
    if (process.env.PII_ENCRYPTION_KEY) return decryptWithKey(value, legacyKey());
    return null;
  } catch { return null; }
}
