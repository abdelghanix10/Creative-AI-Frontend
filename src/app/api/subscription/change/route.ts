import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { stripe } from "~/lib/stripe";
import { db } from "~/server/db";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      planId: string;
      interval: "monthly" | "yearly";
    };
    const { planId, interval } = body;

    if (!planId || !interval) {
      return NextResponse.json(
        { error: "Missing planId or interval" },
        { status: 400 },
      );
    }

    // Get current subscription
    const currentSubscription = await db.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: "active",
      },
      include: {
        plan: true,
      },
    });

    if (!currentSubscription) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 },
      );
    }

    // Get new plan
    const newPlan = await db.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!newPlan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Get the appropriate price ID
    const priceId =
      interval === "yearly"
        ? newPlan.stripeYearlyPriceId
        : newPlan.stripePriceId;

    if (!priceId) {
      return NextResponse.json(
        {
          error: `${interval} billing not available for this plan`,
        },
        { status: 400 },
      );
    } // Get the current Stripe subscription to find the item ID
    const stripeSubscription = await stripe.subscriptions.retrieve(
      currentSubscription.stripeSubscriptionId!,
    );

    // Get the subscription item ID (not the subscription ID)
    const subscriptionItemId = stripeSubscription.items.data[0]?.id;

    if (!subscriptionItemId) {
      return NextResponse.json(
        { error: "Subscription item not found" },
        { status: 404 },
      );
    } // Update subscription in Stripe
    await stripe.subscriptions.update(
      currentSubscription.stripeSubscriptionId!,
      {
        items: [
          {
            id: subscriptionItemId, // Use the correct subscription item ID
            price: priceId,
          },
        ],
        proration_behavior: "create_prorations",
        metadata: {
          userId: session.user.id,
        },
      },
    ); // Update subscription in database
    await db.subscription.update({
      where: { id: currentSubscription.id },
      data: {
        planId: newPlan.id,
        stripePriceId: priceId,
        interval: interval as "monthly" | "yearly",
        updatedAt: new Date(),
      },
    });

    // Update user's subscription tier
    await db.user.update({
      where: { id: session.user.id },
      data: {
        subscriptionTier: newPlan.name,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Subscription updated successfully",
    });
  } catch (error) {
    console.error("Error changing subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
