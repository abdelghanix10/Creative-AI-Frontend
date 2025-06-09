"use server";

import { redirect } from "next/navigation";
import { stripe } from "~/lib/stripe";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function getSubscriptionPlans() {
  return await db.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { price: "asc" },
  });
}

export async function getUserSubscription(userId: string) {
  return await db.subscription.findFirst({
    where: {
      userId,
      status: { in: ["active", "trialing"] },
    },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserInvoices(userId: string, limit = 10) {
  return await db.invoice.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getUserPayments(userId: string, limit = 10) {
  return await db.payment.findMany({
    where: { userId },
    include: { invoice: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function createCheckoutSession(
  planId: string,
  interval: "monthly" | "yearly" = "monthly",
) {
  const session = await auth();
  if (!session?.user.id) {
    throw new Error("User not authenticated");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const plan = await db.subscriptionPlan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    throw new Error("Invalid plan");
  }

  const stripePriceId =
    interval === "yearly" ? plan.stripeYearlyPriceId : plan.stripePriceId;

  if (!stripePriceId) {
    throw new Error("Price ID not found for this plan and interval");
  }

  let customerId = user.stripeCustomerId;

  // If the user doesn't have a Stripe customer ID, create one
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: user.name ?? undefined,
      metadata: {
        userId: user.id,
      },
    });

    customerId = customer.id;

    await db.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price: stripePriceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/settings/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/settings/billing?canceled=true`,
    metadata: {
      userId: user.id,
      planId: planId,
      interval: interval,
    },
  });

  if (!checkoutSession.url) {
    throw new Error("Failed to create checkout session");
  }

  return { url: checkoutSession.url };
}

export async function updateUserCreditsBasedOnPlan() {
  const session = await auth();
  if (!session?.user.id) {
    throw new Error("User not authenticated");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Get current subscription to determine plan
  const subscription = await getUserSubscription(user.id);

  if (!subscription) {
    // No active subscription, use Free plan credits
    const freePlan = await db.subscriptionPlan.findUnique({
      where: { name: "Free" },
    });

    if (freePlan) {
      await db.user.update({
        where: { id: user.id },
        data: { credits: freePlan.credits },
      });
    }
  } else {
    // Update credits based on subscription plan
    await db.user.update({
      where: { id: user.id },
      data: { credits: subscription.plan.credits },
    });
  }

  return { success: true };
}
