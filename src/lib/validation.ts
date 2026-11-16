import { z } from "zod";

export const registerSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(10).max(72),
  role: z.enum(["CUSTOMER", "PROVIDER"]).default("CUSTOMER"),
  displayName: z.string().trim().min(2).max(70)
});

export const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(72)
});
