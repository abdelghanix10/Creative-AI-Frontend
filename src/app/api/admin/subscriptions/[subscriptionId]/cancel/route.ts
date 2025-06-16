import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { requireAdmin } from "~/lib/admin-middleware";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> },
) {
  try {
    // Check admin access
    await requireAdmin();

    const { subscriptionId } = await params; // Get the subscription from database with user info
    const subscription = await db.subscription.findUnique({
      where: { id: subscriptionId },
      include: { user: true },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    // Cancel the subscription in Stripe
    if (subscription.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      } catch (error) {
        console.error("Failed to cancel Stripe subscription:", error);
        // Continue with database update even if Stripe fails
        // This handles cases where Stripe subscription no longer exists
      }
    }

    // Update the subscription in database and reset user to free tier
    const updatedSubscription = await db.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: "cancelled",
        cancelAtPeriodEnd: false,
      },
    }); // Update user to free tier but keep existing credits
    await db.user.update({
      where: { id: subscription.userId },
      data: {
        subscriptionTier: "Free",
        stripeSubscriptionId: null,
        // Credits remain unchanged
      },
    });

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
    });
  } catch (error) {
    console.error("Failed to cancel subscription:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 },
    );
  }
}
