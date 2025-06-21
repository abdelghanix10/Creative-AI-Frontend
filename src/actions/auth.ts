"use server";

import type { SignUpFormValues } from "~/schemas/auth";
import { signUpSchema } from "~/schemas/auth";
import { db } from "~/server/db";
import { hashPassword } from "~/lib/password";

export async function signUp(data: SignUpFormValues) {
  try {
    const validatedData = await signUpSchema.parseAsync(data);

    // Check if email already exists
    const existingEmailUser = await db.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingEmailUser) {
      return { error: "Email already in use" };
    }

    // Check if username already exists (case-insensitive)
    const allUsers = await db.user.findMany({
      where: {
        username: {
          not: null,
        },
      },
      select: {
        username: true,
      },
    });

    const usernameExists = allUsers.some(
      (user) =>
        user.username?.toLowerCase() === validatedData.username.toLowerCase(),
    );

    if (usernameExists) {
      return { error: "Username already in use" };
    }

    const hashedPassword = await hashPassword(validatedData.password);

    await db.user.create({
      data: {
        name: validatedData.name,
        username: validatedData.username,
        email: validatedData.email,
        password: hashedPassword,
      },
    });

    return { success: "Account created successfully" };
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ZodError" &&
      "errors" in error &&
      Array.isArray(error.errors) &&
      error.errors.length > 0
    ) {
      const firstError = error.errors[0] as { message: string };
      return { error: firstError.message };
    }

    return { error: "Something went wrong. Please try again." };
  }
}
