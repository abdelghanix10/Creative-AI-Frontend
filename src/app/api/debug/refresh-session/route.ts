import { NextResponse } from "next/server";
import { auth } from "~/server/auth";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // This endpoint doesn't need to do anything special
    // The client will use this to trigger a session update
    return NextResponse.json({
      message: "Session refresh endpoint called",
      userId: session.user.id,
      instructions: "Use NextAuth update() function on client side",
    });
  } catch (error) {
    console.error("Session refresh error:", error);
    return NextResponse.json(
      { error: "Failed to refresh session" },
      { status: 500 },
    );
  }
}
