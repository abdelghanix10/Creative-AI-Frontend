import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function POST(_request: NextRequest) {
  console.log("Credit check API called");
  try {
    const session = await auth();
    console.log("Session:", session?.user?.id);

    if (!session?.user?.id) {
      console.log("No session or user ID");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user credits before processing
    console.log("Checking credits for user:", session.user.id);
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true },
    });

    console.log("User found:", user);

    if (!user) {
      console.log("User not found in database");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("User credits:", user.credits);

    if (user.credits < 100) {
      console.log("Insufficient credits");
      return NextResponse.json(
        {
          error: "Insufficient credits. Video generation requires 100 credits.",
          hasCredits: false,
        },
        { status: 402 },
      );
    }

    console.log("Credits check passed");
    return NextResponse.json({
      hasCredits: true,
      credits: user.credits,
    });
  } catch (error) {
    console.error("Error checking video credits:", error);
    return NextResponse.json(
      { error: "Failed to check credits" },
      { status: 500 },
    );
  }
}
