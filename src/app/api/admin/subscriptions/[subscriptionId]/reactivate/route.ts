import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { requireAdmin } from "~/lib/admin-middleware";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> },
) {
  try {
    await requireAdmin();

    const { subscriptionId } = await params;

    // Reactivate the subscription
    const updatedSubscription = await db.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: "active",
        cancelAtPeriodEnd: false,
      },
    });

    return NextResponse.json({ subscription: updatedSubscription });
  } catch (error) {
    console.error("Failed to reactivate subscription:", error);
    return NextResponse.json(
      { error: "Failed to reactivate subscription" },
      { status: 500 },
    );
  }
}
