import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user data from database
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        subscriptionTier: true,
      },
    });

    return NextResponse.json({
      session: session.user,
      databaseUser: user,
    });
  } catch (error) {
    console.error("Debug user error:", error);
    return NextResponse.json(
      { error: "Failed to get user data" },
      { status: 500 },
    );
  }
}
