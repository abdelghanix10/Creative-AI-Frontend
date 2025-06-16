import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { requireAdmin } from "~/lib/admin-middleware";
import { stripe } from "~/lib/stripe";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> },
) {
  try {
    await requireAdmin();

    const { subscriptionId } = await params;

    // Get the subscription from database to get Stripe subscription ID
    const subscription = await db.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    if (!subscription.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "No Stripe subscription ID found" },
        { status: 400 },
      );
    }

    // Check current status in Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId,
    );

    if (stripeSubscription.status === "active") {
      // Already active in Stripe, just update database
      const updatedSubscription = await db.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: "active",
          cancelAtPeriodEnd: false,
        },
      });

      return NextResponse.json({
        subscription: updatedSubscription,
        message: "Subscription was already active in Stripe, database updated",
      });
    } // If subscription is canceled in Stripe, we cannot reactivate it directly
    if (stripeSubscription.status === "canceled") {
      // Get the user to create a new subscription
      const user = await db.user.findUnique({
        where: { id: subscription.userId },
      });

      if (!user?.stripeCustomerId) {
        return NextResponse.json(
          { error: "User or Stripe customer not found" },
          { status: 400 },
        );
      }

      // Check if customer has any payment methods
      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: "card",
      });

      if (paymentMethods.data.length === 0) {
        return NextResponse.json(
          {
            error:
              "Cannot reactivate canceled subscription - no payment method attached to customer",
            action: "redirect_to_checkout",
            message:
              "Customer needs to go through checkout process again to add a payment method and create a new subscription",
          },
          { status: 400 },
        );
      }

      // If customer has payment methods, try to create a new subscription
      try {
        // Get the price ID based on the plan and interval
        const priceId =
          subscription.interval === "yearly"
            ? subscription.plan.stripeYearlyPriceId
            : subscription.plan.stripePriceId;

        if (!priceId) {
          return NextResponse.json(
            { error: "Price ID not found for plan" },
            { status: 400 },
          );
        }

        // Create a new subscription in Stripe with default payment method
        const newStripeSubscription = await stripe.subscriptions.create({
          customer: user.stripeCustomerId,
          items: [{ price: priceId }],
          default_payment_method: paymentMethods.data[0]?.id,
          metadata: {
            userId: user.id,
            planId: subscription.planId,
            interval: subscription.interval,
          },
        }); // Update the subscription in database with new Stripe subscription ID
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        const periodStart = (newStripeSubscription as any).current_period_start
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
            new Date((newStripeSubscription as any).current_period_start * 1000)
          : new Date();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        const periodEnd = (newStripeSubscription as any).current_period_end
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
            new Date((newStripeSubscription as any).current_period_end * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default to 30 days from now

        const updatedSubscription = await db.subscription.update({
          where: { id: subscriptionId },
          data: {
            status: "active",
            cancelAtPeriodEnd: false,
            stripeSubscriptionId: newStripeSubscription.id,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
          },
        });

        return NextResponse.json({
          subscription: updatedSubscription,
          message: "New subscription created in Stripe and reactivated",
        });
      } catch (stripeError: unknown) {
        // If still fails, provide clear guidance
        const errorMessage =
          stripeError instanceof Error ? stripeError.message : "Unknown error";
        return NextResponse.json(
          {
            error: "Cannot reactivate canceled subscription",
            stripeError: errorMessage,
            action: "redirect_to_checkout",
            message:
              "Customer needs to go through checkout process again to create a new subscription",
          },
          { status: 400 },
        );
      }
    }

    // For other statuses (incomplete, past_due, etc.), try to reactivate
    let updatedStripeSubscription;

    if (stripeSubscription.cancel_at_period_end) {
      // If subscription is set to cancel at period end, remove that setting
      updatedStripeSubscription = await stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: false,
        },
      );
    } else {
      // For other cases, we might need to handle differently based on status
      updatedStripeSubscription = stripeSubscription;
    }

    // Update the subscription in database
    const updatedSubscription = await db.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: updatedStripeSubscription.status as
          | "active"
          | "canceled"
          | "incomplete"
          | "incomplete_expired"
          | "past_due"
          | "trialing"
          | "unpaid",
        cancelAtPeriodEnd: false,
        currentPeriodStart: new Date(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
          (updatedStripeSubscription as any).current_period_start * 1000,
        ),
        currentPeriodEnd: new Date(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
          (updatedStripeSubscription as any).current_period_end * 1000,
        ),
      },
    });

    return NextResponse.json({
      subscription: updatedSubscription,
      stripeStatus: updatedStripeSubscription.status,
      message: "Subscription reactivated successfully",
    });
  } catch (error) {
    console.error("Failed to reactivate subscription:", error);
    return NextResponse.json(
      { error: "Failed to reactivate subscription" },
      { status: 500 },
    );
  }
}
