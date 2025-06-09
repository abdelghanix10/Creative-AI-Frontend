import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "~/lib/stripe";
import { db } from "~/server/db";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (event.type === "checkout.session.completed") {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    if (!session?.metadata?.userId) {
      return new NextResponse("User ID is required", { status: 400 });
    }

    await db.user.update({
      where: { id: session.metadata.userId },
      data: {
        stripeSubscriptionId: subscription.id,
        subscriptionTier: session.metadata.planId,
        credits: session.metadata.planId === "Lite" ? 5000 : 10000,
      },
    });
  }

  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata.userId;

    if (!userId) {
      return new NextResponse("User ID is required", { status: 400 });
    }

    // Handle subscription updates
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata.userId;

    if (!userId) {
      return new NextResponse("User ID is required", { status: 400 });
    }

    await db.user.update({
      where: { id: userId },
      data: {
        stripeSubscriptionId: null,
        subscriptionTier: "Free",
        credits: 1000,
      },
    });
  }

  return new NextResponse(null, { status: 200 });
}