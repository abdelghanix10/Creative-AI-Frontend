import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { requireAdmin } from "~/lib/admin-middleware";

export async function GET(_request: NextRequest) {
  try {
    // Check admin access
    await requireAdmin();

    // Get subscriptions with user and plan information
    const subscriptions = await db.subscription.findMany({
      select: {
        id: true,
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        interval: true,
        stripeSubscriptionId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        plan: {
          select: {
            id: true,
            displayName: true,
            price: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      subscriptions,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error("Failed to fetch subscriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 },
    );
  }
}
