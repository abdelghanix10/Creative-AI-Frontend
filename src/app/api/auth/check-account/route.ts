import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      emailOrUsername: string;
    };

    const { emailOrUsername } = body;

    if (!emailOrUsername) {
      return NextResponse.json(
        { error: "Email or username is required" },
        { status: 400 },
      );
    }

    // Try to find user by email first, then by username
    let user = await db.user.findUnique({
      where: {
        email: emailOrUsername,
      },
      select: {
        id: true,
        email: true,
        username: true,
        isActive: true,
      },
    });

    // If not found by email, try username
    if (!user) {
      user = await db.user.findUnique({
        where: {
          username: emailOrUsername,
        },
        select: {
          id: true,
          email: true,
          username: true,
          isActive: true,
        },
      });
    }

    if (!user) {
      // Don't reveal whether user exists or not for security
      return NextResponse.json({
        exists: false,
        isActive: true, // Default to true to not reveal account existence
      });
    }

    return NextResponse.json({
      exists: true,
      isActive: user.isActive,
    });
  } catch (error) {
    console.error("Error checking account status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
