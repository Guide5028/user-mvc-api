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

export { registerSchema, loginSchema };
