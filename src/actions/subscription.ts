"use server";

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
    // Add subscription plan credits to existing credits
    await db.user.update({
      where: { id: user.id },
      data: { credits: user.credits + subscription.plan.credits },
    });
  }

  return { success: true };
}

// Create subscription record when payment is successful
export async function createSubscription(
  userId: string,
  planId: string,
  stripeSubscriptionId: string,
  stripePriceId: string,
  interval: "monthly" | "yearly",
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
) {
  try {
    const subscription = await db.subscription.create({
      data: {
        userId,
        planId,
        status: "active",
        currentPeriodStart,
        currentPeriodEnd,
        stripeSubscriptionId,
        stripePriceId,
        interval,
      },
      include: { plan: true },
    });

    return subscription;
  } catch (error) {
    console.error("Error creating subscription:", error);
    throw new Error("Failed to create subscription");
  }
}

// Update subscription status and details
export async function updateSubscription(
  stripeSubscriptionId: string,
  data: {
    status?: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
    planId?: string;
  },
) {
  try {
    const subscription = await db.subscription.update({
      where: { stripeSubscriptionId },
      data,
      include: { plan: true },
    });

    return subscription;
  } catch (error) {
    console.error("Error updating subscription:", error);
    throw new Error("Failed to update subscription");
  }
}

// Cancel subscription
export async function cancelSubscription(userId: string, immediately = false) {
  const session = await auth();
  if (!session?.user.id || session.user.id !== userId) {
    throw new Error("User not authenticated");
  }

  const subscription = await getUserSubscription(userId);
  if (!subscription) {
    throw new Error("No active subscription found");
  }

  try {
    if (immediately) {
      // Cancel immediately
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId!);

      await db.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "canceled",
          cancelAtPeriodEnd: false,
        },
      });
    } else {
      // Cancel at period end
      await stripe.subscriptions.update(subscription.stripeSubscriptionId!, {
        cancel_at_period_end: true,
      });

      await db.subscription.update({
        where: { id: subscription.id },
        data: { cancelAtPeriodEnd: true },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error canceling subscription:", error);
    throw new Error("Failed to cancel subscription");
  }
}

// Create invoice record
export async function createInvoice(
  userId: string,
  subscriptionId: string | null,
  stripeInvoiceId: string,
  amount: number,
  currency = "usd",
  status: string,
  description?: string,
  invoiceNumber?: string,
  invoiceUrl?: string,
  dueDate?: Date,
) {
  try {
    const invoice = await db.invoice.create({
      data: {
        userId,
        subscriptionId,
        stripeInvoiceId,
        amount: amount / 100, // Convert cents to dollars
        currency,
        status,
        description,
        invoiceNumber,
        invoiceUrl,
        dueDate,
      },
    });

    return invoice;
  } catch (error) {
    console.error("Error creating invoice:", error);
    throw new Error("Failed to create invoice");
  }
}

// Update invoice status
export async function updateInvoice(
  stripeInvoiceId: string,
  data: {
    status?: string;
    paidAt?: Date;
    amount?: number;
    description?: string;
    invoiceUrl?: string;
  },
) {
  try {
    const invoice = await db.invoice.update({
      where: { stripeInvoiceId },
      data: {
        ...data,
        amount: data.amount ? data.amount / 100 : undefined, // Convert cents to dollars
      },
    });

    return invoice;
  } catch (error) {
    console.error("Error updating invoice:", error);
    throw new Error("Failed to update invoice");
  }
}

// Create payment record
export async function createPayment(
  userId: string,
  invoiceId: string | null,
  stripePaymentId: string,
  amount: number,
  currency = "usd",
  status: string,
  paymentMethod?: string,
  description?: string,
) {
  try {
    const payment = await db.payment.create({
      data: {
        userId,
        invoiceId,
        stripePaymentId,
        amount: amount / 100, // Convert cents to dollars
        currency,
        status,
        paymentMethod,
        description,
      },
    });

    return payment;
  } catch (error) {
    console.error("Error creating payment:", error);
    throw new Error("Failed to create payment");
  }
}

// Update payment status
export async function updatePayment(
  stripePaymentId: string,
  data: {
    status?: string;
    refunded?: boolean;
    refundedAmount?: number;
  },
) {
  try {
    const payment = await db.payment.update({
      where: { stripePaymentId },
      data: {
        ...data,
        refundedAmount: data.refundedAmount
          ? data.refundedAmount / 100
          : undefined,
      },
    });

    return payment;
  } catch (error) {
    console.error("Error updating payment:", error);
    throw new Error("Failed to update payment");
  }
}

// Get subscription by Stripe ID
export async function getSubscriptionByStripeId(stripeSubscriptionId: string) {
  try {
    const subscription = await db.subscription.findFirst({
      where: { stripeSubscriptionId },
      include: { plan: true, user: true },
    });

    return subscription;
  } catch (error) {
    console.error("Error fetching subscription by Stripe ID:", error);
    return null;
  }
}

// Sync subscription plans from Stripe (admin function)
export async function syncSubscriptionPlans() {
  const session = await auth();
  if (!session?.user.id) {
    throw new Error("User not authenticated");
  }

  // This would be an admin-only function in a real app
  // For now, we'll create default plans if they don't exist
  try {
    const existingPlans = await db.subscriptionPlan.findMany();

    if (existingPlans.length === 0) {
      const defaultPlans = [
        {
          name: "Free",
          displayName: "Free Plan",
          description: "Get started with basic features",
          credits: 100,
          price: 0,
          yearlyPrice: 0,
          features: JSON.stringify([
            "100 credits per month",
            "Basic AI features",
            "Standard support",
          ]),
          isActive: true,
        },
        {
          name: "Lite",
          displayName: "Lite Plan",
          description: "Perfect for personal use",
          credits: 1000,
          price: 9.99,
          yearlyPrice: 99.99,
          features: JSON.stringify([
            "1,000 credits per month",
            "All AI features",
            "Priority support",
            "Advanced templates",
          ]),
          isActive: true,
        },
        {
          name: "Pro",
          displayName: "Pro Plan",
          description: "Best for professionals",
          credits: 5000,
          price: 29.99,
          yearlyPrice: 299.99,
          features: JSON.stringify([
            "5,000 credits per month",
            "All AI features",
            "Premium support",
            "Custom templates",
            "API access",
          ]),
          isActive: true,
        },
      ];

      await db.subscriptionPlan.createMany({
        data: defaultPlans,
      });

      return { message: "Default plans created successfully" };
    }

    return { message: "Plans already exist" };
  } catch (error) {
    console.error("Error syncing subscription plans:", error);
    throw new Error("Failed to sync subscription plans");
  }
}

// Get user's billing history (invoices and payments)
export async function getUserBillingHistory(userId: string, limit = 20) {
  try {
    const [invoices, payments] = await Promise.all([
      db.invoice.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      db.payment.findMany({
        where: { userId },
        include: { invoice: true },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    ]);

    return { invoices, payments };
  } catch (error) {
    console.error("Error fetching billing history:", error);
    throw new Error("Failed to fetch billing history");
  }
}

// Process subscription renewal
export async function processSubscriptionRenewal(stripeSubscriptionId: string) {
  try {
    const subscription = await getSubscriptionByStripeId(stripeSubscriptionId);

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    // Add credits to user's account
    await db.user.update({
      where: { id: subscription.userId },
      data: {
        credits: {
          increment: subscription.plan.credits,
        },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error processing subscription renewal:", error);
    throw new Error("Failed to process subscription renewal");
  }
}

// Get subscription metrics (admin function)
export async function getSubscriptionMetrics() {
  const session = await auth();
  if (!session?.user.id) {
    throw new Error("User not authenticated");
  }

  try {
    const [
      totalSubscriptions,
      activeSubscriptions,
      canceledSubscriptions,
      successfulPayments,
      totalRevenueFromPayments,
      totalRevenueFromInvoices,
      activeSubscriptionsWithPlans,
    ] = await Promise.all([
      db.subscription.count(),
      db.subscription.count({ where: { status: "active" } }),
      db.subscription.count({ where: { status: "canceled" } }),
      db.payment.count({ where: { status: "succeeded" } }),
      db.payment.aggregate({
        where: { status: "succeeded" },
        _sum: { amount: true },
      }),
      db.invoice.aggregate({
        where: { status: "paid" },
        _sum: { amount: true },
      }),
      db.subscription.findMany({
        where: { status: "active" },
        select: {
          planId: true,
          plan: {
            select: {
              id: true,
              name: true,
              displayName: true,
            },
          },
        },
      }),
    ]);

    // Calculate total revenue from both payments and invoices
    const paymentsTotal = totalRevenueFromPayments._sum.amount ?? 0;
    const invoicesTotal = totalRevenueFromInvoices._sum.amount ?? 0;

    // Use the higher value (in case of data inconsistency) or sum them if they're tracking different things
    const totalRevenue = Math.max(paymentsTotal, invoicesTotal);

    // Process plan distribution
    const planDistribution = activeSubscriptionsWithPlans.reduce(
      (acc, sub) => {
        const existingPlan = acc.find((p) => p.planId === sub.planId);
        if (existingPlan) {
          existingPlan._count.planId++;
        } else {
          acc.push({
            planId: sub.planId,
            plan: sub.plan,
            _count: { planId: 1 },
          });
        }
        return acc;
      },
      [] as Array<{
        planId: string;
        plan: { id: string; name: string; displayName: string };
        _count: { planId: number };
      }>,
    );

    // Debug logging
    console.log("📊 Subscription Metrics Debug:", {
      totalSubscriptions,
      activeSubscriptions,
      canceledSubscriptions,
      successfulPayments,
      paymentsTotal,
      invoicesTotal,
      totalRevenue,
      planDistribution: planDistribution.length,
    });

    return {
      totalSubscriptions,
      activeSubscriptions,
      canceledSubscriptions,
      totalRevenue,
      planDistribution,
      debug: {
        successfulPayments,
        paymentsTotal,
        invoicesTotal,
      },
    };
  } catch (error) {
    console.error("Error fetching subscription metrics:", error);
    throw new Error("Failed to fetch subscription metrics");
  }
}

// Simplified cancel subscription function
export async function cancelUserSubscription(immediately = false) {
  const session = await auth();
  if (!session?.user.id) {
    throw new Error("User not authenticated");
  }

  const subscription = await getUserSubscription(session.user.id);
  if (!subscription) {
    throw new Error("No active subscription found");
  }

  // Get current user data including credits
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { credits: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  try {
    if (immediately) {
      // Validation: Check if user's credits are <= plan credits before allowing immediate cancellation
      if (user.credits < subscription.plan.credits) {
        throw new Error(
          `Cannot cancel immediately. You have ${user.credits} credits remaining, which exceeds your plan limit of ${subscription.plan.credits} credits. Please use your credits first or cancel at the end of your billing period.`,
        );
      }

      // Cancel immediately
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId!);

      // Get the Free plan details from database
      const freePlan = await db.subscriptionPlan.findUnique({
        where: { name: "Free" },
      });

      await db.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "canceled",
          cancelAtPeriodEnd: false,
        },
      });

      // Revert user to free plan
      await db.user.update({
        where: { id: session.user.id },
        data: {
          stripeSubscriptionId: null,
          subscriptionTier: "Free",
          credits: freePlan?.credits ?? 100,
        },
      });

      // Process refund for immediate cancellation
      try {
        await processRefundForImmediateCancellation(
          subscription.stripeSubscriptionId!,
        );
      } catch (refundError) {
        console.error("Refund processing failed:", refundError);
        // Don't throw here - subscription is already canceled, refund can be handled manually if needed
      }
    } else {
      // Cancel at period end
      await stripe.subscriptions.update(subscription.stripeSubscriptionId!, {
        cancel_at_period_end: true,
      });

      await db.subscription.update({
        where: { id: subscription.id },
        data: { cancelAtPeriodEnd: true },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error canceling subscription:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to cancel subscription",
    );
  }
}

// Helper function to process refund for immediate cancellation
async function processRefundForImmediateCancellation(
  stripeSubscriptionId: string,
) {
  try {
    console.log(`Processing refund for subscription: ${stripeSubscriptionId}`);

    // Get the latest invoice for this subscription
    const invoices = await stripe.invoices.list({
      subscription: stripeSubscriptionId,
      limit: 1,
    });

    if (invoices.data.length === 0) {
      console.log("No invoices found for refund processing");
      return;
    }

    const latestInvoice = invoices.data[0];

    if (!latestInvoice?.amount_paid) {
      console.log("No valid invoice found for refund");
      return;
    }

    // For now, log the refund action - in production you would implement the actual refund logic
    console.log(
      `Refund would be processed for invoice ${latestInvoice.id} with amount $${latestInvoice.amount_paid / 100}`,
    );

    // TODO: Implement actual prorated refund calculation and processing
    // This would involve calculating the unused portion of the subscription period
    // and creating a refund through Stripe's refund API

    return { message: "Refund logged for processing" };
  } catch (error) {
    console.error("Error processing refund:", error);
    throw error;
  }
}
