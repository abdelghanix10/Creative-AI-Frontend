"use server";

import bcrypt from "bcryptjs";
import type { SignUpFormValues } from "~/schemas/auth";
import { signUpSchema } from "~/schemas/auth";
import { db } from "~/server/db";

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

    // Check if username already exists
    const existingUsernameUser = await db.user.findUnique({
      where: { username: validatedData.username },
    });

    if (existingUsernameUser) {
      return { error: "Username already in use" };
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

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
