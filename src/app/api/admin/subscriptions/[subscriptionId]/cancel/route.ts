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

    const { subscriptionId } = await params;

    // Get the subscription from database
    const subscription = await db.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    } // Cancel the subscription in Stripe
    if (subscription.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      } catch (error) {
        console.error("Failed to cancel Stripe subscription:", error);
        // Continue with database update even if Stripe fails
        // This handles cases where Stripe subscription no longer exists
      }
    } // Update the subscription in database and reset user to free tier
    const updatedSubscription = await db.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: "cancelled",
        cancelAtPeriodEnd: false,
      },
    });

    // Update user to free tier and remove Stripe customer ID
    await db.user.update({
      where: { id: subscription.userId },
      data: {
        subscriptionTier: "Free",
        stripeCustomerId: null,
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
