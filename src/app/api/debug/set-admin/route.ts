import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Update the current user to admin
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: { role: "ADMIN" },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      },
    });
    return NextResponse.json({
      message: "User role updated to ADMIN",
      user: updatedUser,
      sessionUpdateRequired: true,
    });
  } catch (error) {
    console.error("Set admin error:", error);
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 },
    );
  }
}
