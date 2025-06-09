import { z } from "zod";

// Validation schemas
export const updateNameSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must be less than 50 characters"),
});

export const updateEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords don't match",
    path: ["confirmPassword"],
  });

export type UpdateNameFormValues = z.infer<typeof updateNameSchema>;
export type UpdateEmailFormValues = z.infer<typeof updateEmailSchema>;
export type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>;
