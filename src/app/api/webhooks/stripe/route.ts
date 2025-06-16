import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "~/lib/stripe";
import { db } from "~/server/db";
import {
  createSubscription,
  updateSubscription,
  createInvoice,
  updateInvoice,
} from "~/actions/subscription";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("Stripe-Signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook signature verification failed:", errorMessage);
    return new NextResponse(`Webhook Error: ${errorMessage}`, { status: 400 });
  }
  try {
    console.log(`🔄 Processing Stripe webhook: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string,
          );

          if (!session?.metadata?.userId || !session?.metadata?.planId) {
            console.error("User ID or Plan ID missing from session metadata");
            return new NextResponse("User ID and Plan ID are required", {
              status: 400,
            });
          }

          // Get the actual plan details from database
          const plan = await db.subscriptionPlan.findUnique({
            where: { id: session.metadata.planId },
          });

          if (!plan) {
            console.error("Plan not found:", session.metadata.planId);
            return new NextResponse("Plan not found", { status: 400 });
          } // Get current user to add credits to existing balance
          const currentUser = await db.user.findUnique({
            where: { id: session.metadata.userId },
            select: { credits: true },
          });

          // Update user with subscription details
          await db.user.update({
            where: { id: session.metadata.userId },
            data: {
              stripeSubscriptionId: subscription.id,
              subscriptionTier: plan.name,
              credits: (currentUser?.credits ?? 0) + plan.credits,
            },
          }); // Get the price ID from the subscription to determine interval
          const priceId = subscription.items.data[0]?.price.id;

          // Determine the actual interval based on the price ID used
          let actualInterval: "monthly" | "yearly" = session.metadata
            .interval as "monthly" | "yearly";
          if (plan && priceId) {
            if (priceId === plan.stripeYearlyPriceId) {
              actualInterval = "yearly";
            } else if (priceId === plan.stripePriceId) {
              actualInterval = "monthly";
            }
          }

          // Create subscription record
          // Safely convert Stripe timestamps to Date objects
          const periodStart = (subscription as any).current_period_start
            ? new Date((subscription as any).current_period_start * 1000)
            : new Date();

          // Calculate period end based on interval and Stripe data
          let periodEnd: Date;
          if ((subscription as any).current_period_end) {
            periodEnd = new Date(
              (subscription as any).current_period_end * 1000,
            );
          } else {
            // Fallback calculation based on interval if Stripe doesn't provide end date
            const intervalMonths = actualInterval === "yearly" ? 12 : 1;
            periodEnd = new Date(periodStart);
            periodEnd.setMonth(periodEnd.getMonth() + intervalMonths);
          }

          // Log subscription details for debugging
          console.log(`📅 Subscription Period Details:
            - Requested Interval: ${session.metadata.interval}
            - Actual Interval: ${actualInterval}
            - Price ID: ${priceId}
            - Plan Monthly Price ID: ${plan?.stripePriceId}
            - Plan Yearly Price ID: ${plan?.stripeYearlyPriceId}
            - Start: ${periodStart.toISOString()}
            - End: ${periodEnd.toISOString()}
            - Duration: ${Math.round((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))} days
            - Stripe Period Start: ${(subscription as any).current_period_start}
            - Stripe Period End: ${(subscription as any).current_period_end}
            - Subscription ID: ${subscription.id}`);

          await createSubscription(
            session.metadata.userId,
            session.metadata.planId,
            subscription.id,
            priceId ?? "",
            actualInterval,
            periodStart,
            periodEnd,
          );

          console.log(
            "Subscription created successfully for user:",
            session.metadata.userId,
          );
          console.log(
            `✅ Subscription: ${subscription.id}, Plan: ${plan.name}, Credits added: ${plan.credits}`,
          );
        }
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object;

        // First try to get userId from metadata, then fall back to database lookup
        let userId = subscription.metadata?.userId;

        if (!userId) {
          console.log(
            "User ID missing from subscription metadata, looking up by subscription ID",
          );
          // Look up user by stripeSubscriptionId
          const user = await db.user.findFirst({
            where: { stripeSubscriptionId: subscription.id },
            select: { id: true },
          });

          if (!user) {
            console.error("User not found for subscription:", subscription.id);
            return new NextResponse("User not found for subscription", {
              status: 400,
            });
          }

          userId = user.id;
          console.log(
            `Found user ${userId} for subscription ${subscription.id}`,
          );
        }

        // Get the current subscription from our database to detect changes
        const currentSubscription = await db.subscription.findFirst({
          where: { stripeSubscriptionId: subscription.id },
          include: { plan: true },
        });

        // Get the new price ID from the subscription
        const newPriceId = subscription.items.data[0]?.price.id;

        // Find the new plan based on the price ID
        const newPlan = await db.subscriptionPlan.findFirst({
          where: {
            OR: [
              { stripePriceId: newPriceId },
              { stripeYearlyPriceId: newPriceId },
            ],
          },
        });

        // Detect if this is an upgrade (different plan)
        const isUpgrade =
          currentSubscription &&
          newPlan &&
          currentSubscription.planId !== newPlan.id &&
          newPlan.price > currentSubscription.plan.price;

        // Determine the interval based on the price ID
        let interval: "monthly" | "yearly" = "monthly";
        if (newPlan) {
          if (newPriceId === newPlan.stripeYearlyPriceId) {
            interval = "yearly";
          } else if (newPriceId === newPlan.stripePriceId) {
            interval = "monthly";
          }
        } // Calculate correct period end based on interval and Stripe data
        const periodStart = new Date(
          (subscription as any).current_period_start * 1000,
        );
        const periodEnd = new Date(
          (subscription as any).current_period_end * 1000,
        );

        // Log subscription update details for debugging
        console.log(`📅 Subscription Update Details:
          - Subscription ID: ${subscription.id}
          - Price ID: ${newPriceId}
          - Detected Interval: ${interval}
          - Stripe Period Start: ${(subscription as any).current_period_start}
          - Stripe Period End: ${(subscription as any).current_period_end}
          - Calculated Start: ${periodStart.toISOString()}
          - Calculated End: ${periodEnd.toISOString()}
          - Duration: ${Math.round((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))} days`); // Update subscription record with new plan info and correct interval

        await updateSubscription(subscription.id, {
          status: subscription.status,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
          ...(newPlan && { planId: newPlan.id }),
        });

        // Also update the interval in the subscription record if we have a plan
        if (newPlan) {
          await db.subscription.updateMany({
            where: { stripeSubscriptionId: subscription.id },
            data: { interval },
          });
        }

        // Update user's plan and credits if plan changed
        if (
          newPlan &&
          currentSubscription &&
          currentSubscription.planId !== newPlan.id
        ) {
          const user = await db.user.findUnique({
            where: { id: userId },
            select: { credits: true, email: true, name: true },
          });

          if (user) {
            // Calculate credit difference (for upgrades, add the difference)
            const creditDifference = isUpgrade
              ? newPlan.credits - currentSubscription.plan.credits
              : 0;
            await db.user.update({
              where: { id: userId },
              data: {
                subscriptionTier: newPlan.name,
                ...(creditDifference > 0 && {
                  credits: (user.credits ?? 0) + creditDifference,
                }),
              },
            });
          }
        }

        console.log("Subscription updated successfully:", subscription.id);
        if (isUpgrade) {
          console.log("Subscription upgrade detected and processed");
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object;

        // First try to get userId from metadata, then fall back to database lookup
        let userId = subscription.metadata?.userId;
        let user = null;

        if (!userId) {
          console.log(
            "User ID missing from subscription metadata, looking up by subscription ID",
          );
          // Look up user by stripeSubscriptionId
          user = await db.user.findFirst({
            where: { stripeSubscriptionId: subscription.id },
            select: { id: true, email: true, name: true },
          });

          if (user) {
            userId = user.id;
            console.log(
              `Found user ${userId} for subscription ${subscription.id}`,
            );
          }
        }

        // If we still don't have a user, try to find via subscription table
        if (!userId) {
          console.log(
            "Looking up user via subscription table for subscription:",
            subscription.id,
          );
          const dbSubscription = await db.subscription.findFirst({
            where: { stripeSubscriptionId: subscription.id },
            include: {
              user: { select: { id: true, email: true, name: true } },
            },
          });

          if (dbSubscription?.user) {
            userId = dbSubscription.user.id;
            user = dbSubscription.user;
            console.log(
              `Found user ${userId} via subscription table for subscription ${subscription.id}`,
            );
          }
        }

        if (!userId) {
          console.error(
            "User not found for subscription deletion:",
            subscription.id,
          );
          // Don't return an error - just log and continue
          // This prevents webhook failures for already cleaned up subscriptions
          console.log("Skipping subscription deletion - user not found");
          break;
        } // Update subscription record
        await updateSubscription(subscription.id, {
          status: "canceled",
        });

        // Revert user to free plan but keep existing credits
        await db.user.update({
          where: { id: userId },
          data: {
            stripeSubscriptionId: null,
            subscriptionTier: "Free",
            // Credits remain unchanged
          },
        });

        console.log("Subscription canceled successfully:", subscription.id);
        break;
      }

      case "invoice.created": {
        const invoice = event.data.object;
        if ((invoice as any).subscription && invoice.customer_email) {
          // Find user by customer ID or email
          const user = await db.user.findFirst({
            where: {
              OR: [
                { stripeCustomerId: invoice.customer as string },
                { email: invoice.customer_email },
              ],
            },
          });

          if (user) {
            console.log(
              `📄 Creating invoice for user ${user.id}, amount: ${invoice.amount_due / 100}`,
            ); // Find related subscription
            const subscription = await db.subscription.findFirst({
              where: {
                stripeSubscriptionId: (invoice as any).subscription as string,
              },
            });
            await createInvoice(
              user.id,
              subscription?.id ?? null, // Use null instead of empty string
              invoice.id!,
              invoice.amount_due, // Keep in cents (function converts internally)
              invoice.currency,
              invoice.status ?? "draft",
              invoice.description ?? undefined,
              invoice.number ?? undefined,
              invoice.hosted_invoice_url ?? undefined,
              invoice.due_date ? new Date(invoice.due_date * 1000) : undefined,
            );

            console.log("✅ Invoice created successfully:", invoice.id);
          } else {
            const customerStr =
              typeof invoice.customer === "string"
                ? invoice.customer
                : (invoice.customer?.id ?? "unknown");
            console.log(
              `⚠️ No user found for invoice customer: ${customerStr} / ${invoice.customer_email}`,
            );
          }
        } else {
          console.log(
            `⚠️ Invoice missing subscription or customer email: ${invoice.id}`,
          );
        }
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;

        if (invoice.id) {
          // Check if invoice exists in our database before updating
          const existingInvoice = await db.invoice.findFirst({
            where: { stripeInvoiceId: invoice.id },
          });

          if (existingInvoice) {
            await updateInvoice(invoice.id, {
              status: "paid",
              paidAt: new Date(),
            });
            console.log("✅ Invoice payment succeeded:", invoice.id);
          } else {
            console.log("⚠️ Invoice not found in database:", invoice.id);
          }
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;

        if (invoice.id) {
          // Check if invoice exists in our database before updating
          const existingInvoice = await db.invoice.findFirst({
            where: { stripeInvoiceId: invoice.id },
          });

          if (existingInvoice) {
            await updateInvoice(invoice.id, {
              status: "payment_failed",
            });
            console.log("❌ Invoice payment failed:", invoice.id);
          } else {
            console.log("⚠️ Invoice not found in database:", invoice.id);
          }
        }
        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object;
        console.log(`✅ Subscription created: ${subscription.id}`);
        // This is handled by checkout.session.completed for new subscriptions
        break;
      }

      case "invoice.finalized": {
        const invoice = event.data.object;
        console.log(`📄 Invoice finalized: ${invoice.id}`);
        // This happens before invoice.created, so we don't need to do anything here
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        console.log(`💰 Invoice paid: ${invoice.id}`);

        // Check if invoice exists in our database before updating
        const existingInvoice = await db.invoice.findFirst({
          where: { stripeInvoiceId: invoice.id },
        });
        if (existingInvoice && invoice.id) {
          await updateInvoice(invoice.id, {
            status: "paid",
            paidAt: new Date(),
          });
          console.log("✅ Invoice marked as paid:", invoice.id);
        } else {
          console.log("⚠️ Invoice not found in database:", invoice.id);
        }
        break;
      }

      case "charge.succeeded": {
        const charge = event.data.object;
        console.log(
          `💳 Charge succeeded: ${charge.id}, amount: ${charge.amount / 100}`,
        );
        // This is typically handled by payment_intent.succeeded
        break;
      }

      case "payment_method.attached": {
        const paymentMethod = event.data.object;
        console.log(`💳 Payment method attached: ${paymentMethod.id}`);
        // This is just informational, no action needed
        break;
      }

      case "payment_intent.created": {
        const paymentIntent = event.data.object;
        console.log(
          `💰 Payment intent created: ${paymentIntent.id}, amount: ${paymentIntent.amount / 100}`,
        );
        // This is just the start of the payment process, no action needed
        break;
      }

      case "payment_intent.canceled": {
        const paymentIntent = event.data.object;
        console.log(
          `💰❌ Payment intent canceled: ${paymentIntent.id}, amount: ${paymentIntent.amount / 100}`,
        );
        // This is informational - payment was canceled, no action needed in most cases
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
        break;
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new NextResponse("Webhook processing failed", { status: 500 });
  }
}
