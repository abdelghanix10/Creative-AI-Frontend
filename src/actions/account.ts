"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import {
  updateNameSchema,
  updateEmailSchema,
  updatePasswordSchema,
  type UpdateNameFormValues,
  type UpdateEmailFormValues,
  type UpdatePasswordFormValues,
} from "~/schemas/account";

export async function updateUserName(data: UpdateNameFormValues) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Not authenticated" };
    }

    const validatedData = await updateNameSchema.parseAsync(data);

    await db.user.update({
      where: { id: session.user.id },
      data: { name: validatedData.name },
    });

    revalidatePath("/app/settings/account-settings");
    return { success: "Name updated successfully" };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0]?.message ?? "Invalid input" };
    }
    console.error("Error updating name:", error);
    return { error: "Failed to update name" };
  }
}

export async function updateUserEmail(data: UpdateEmailFormValues) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Not authenticated" };
    }

    const validatedData = await updateEmailSchema.parseAsync(data);

    // Check if email is already in use by another user
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser && existingUser.id !== session.user.id) {
      return { error: "Email is already in use" };
    }

    await db.user.update({
      where: { id: session.user.id },
      data: { email: validatedData.email },
    });

    revalidatePath("/app/settings/account-settings");
    return { success: "Email updated successfully" };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0]?.message ?? "Invalid input" };
    }
    console.error("Error updating email:", error);
    return { error: "Failed to update email" };
  }
}

export async function updateUserPassword(data: UpdatePasswordFormValues) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Not authenticated" };
    }

    const validatedData = await updatePasswordSchema.parseAsync(data);

    // Get current user with password
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user) {
      return { error: "User not found" };
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      validatedData.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      return { error: "Current password is incorrect" };
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(validatedData.newPassword, 10);

    await db.user.update({
      where: { id: session.user.id },
      data: { password: hashedNewPassword },
    });

    revalidatePath("/app/settings/account-settings");
    return { success: "Password updated successfully" };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0]?.message ?? "Invalid input" };
    }
    console.error("Error updating password:", error);
    return { error: "Failed to update password" };
  }
}
