import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email().max(255).toLowerCase().trim(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be in YYYY-MM-DD format")
    .refine((date) => !isNaN(new Date(date).getTime()), "Invalid date")
    .refine(
      (date) => new Date(date) <= new Date(),
      "Date of birth cannot be in the future",
    ), // YYYY-MM-DD format
  gender: z.enum(["male", "female", "other"]),
  surname: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email().max(255).toLowerCase().trim(),
  password: z.string().min(8),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "token is required"),
  newPassword: z.string().min(8),
});

export {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
