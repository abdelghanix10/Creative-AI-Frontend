import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { getUserSubscription } from "~/actions/subscription";
import { db } from "~/server/db";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔍 API: Fetching subscription for user:", session.user.id);
    console.log(
      "📋 API: Session subscription tier:",
      session.user.subscriptionTier,
    );

    // Get subscription from database
    const subscription = await getUserSubscription(session.user.id);
    console.log(
      "💾 API: Database subscription:",
      subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            planName: subscription.plan?.name,
          }
        : "null",
    );

    // Also get the user's current tier from the user table as fallback
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionTier: true },
    });
    console.log(
      "👤 API: User table subscription tier:",
      user?.subscriptionTier,
    );

    // Determine current tier priority: subscription plan > user.subscriptionTier > session.subscriptionTier > "Free"
    const currentTier =
      subscription?.plan?.name ??
      user?.subscriptionTier ??
      session.user.subscriptionTier ??
      "Free";

    console.log("🎯 API: Final current tier:", currentTier);

    return NextResponse.json({
      subscription,
      currentTier,
    });
  } catch (error) {
    console.error("❌ API: Error fetching user subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
