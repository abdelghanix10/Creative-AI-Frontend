import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Get the user's current role from database
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        email: true,
        name: true,
        subscriptionTier: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return the user data and a flag indicating if session needs updating
    const sessionUpdateRequired = user.role !== session.user.role;

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
        sessionRole: session.user.role,
      },
      sessionUpdateRequired,
      message: sessionUpdateRequired
        ? "Session role is outdated. Please refresh your session."
        : "Session role is up to date.",
    });
  } catch (error) {
    console.error("Error checking session sync:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
