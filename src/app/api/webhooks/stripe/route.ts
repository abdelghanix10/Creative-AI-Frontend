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
  createPayment,
} from "~/actions/subscription";
import {
  sendWelcomeEmail,
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendSubscriptionCancelledEmail,
  sendInvoiceEmail,
  sendSubscriptionUpgradeEmail,
} from "~/lib/email";

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
    console.log(`📧 Email enabled: ${process.env.EMAIL_ENABLED}`);

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
            },          }); // Create subscription record
          // Safely convert Stripe timestamps to Date objects
          const periodStart = subscription.current_period_start 
            ? new Date(subscription.current_period_start * 1000)
            : new Date();
          const periodEnd = subscription.current_period_end 
            ? new Date(subscription.current_period_end * 1000)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default to 30 days from now

          await createSubscription(
            session.metadata.userId,
            session.metadata.planId,
            subscription.id,
            subscription.items.data[0]?.price.id ?? "",
            session.metadata.interval as "monthly" | "yearly",
            periodStart,
            periodEnd,
          );

          // Send welcome email
          const welcomeUser = await db.user.findUnique({
            where: { id: session.metadata.userId },
            select: { email: true, name: true },
          });
          if (welcomeUser?.email) {
            try {
              console.log(`📧 Sending welcome email to: ${welcomeUser.email}`);
              await sendWelcomeEmail(
                welcomeUser.email,
                welcomeUser.name ?? "User",
                plan.displayName,
                plan.credits.toString(),
              );
              console.log(
                `✅ Welcome email sent successfully to: ${welcomeUser.email}`,
              );
            } catch (emailError) {
              console.error("❌ Failed to send welcome email:", emailError);
            }
          } else {
            console.log("⚠️ No email address found for welcome email");
          }
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

        if (!subscription.metadata?.userId) {
          console.error("User ID missing from subscription metadata");
          return new NextResponse("User ID is required", { status: 400 });
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
          newPlan.price > currentSubscription.plan.price; // Update subscription record with new plan info
        await updateSubscription(subscription.id, {
          status: subscription.status,
          currentPeriodStart: new Date(
            subscription.current_period_start * 1000,
          ),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          ...(newPlan && { planId: newPlan.id }),
        });

        // Update user's plan and credits if plan changed
        if (
          newPlan &&
          currentSubscription &&
          currentSubscription.planId !== newPlan.id
        ) {
          const user = await db.user.findUnique({
            where: { id: subscription.metadata.userId },
            select: { credits: true, email: true, name: true },
          });

          if (user) {
            // Calculate credit difference (for upgrades, add the difference)
            const creditDifference = isUpgrade
              ? newPlan.credits - currentSubscription.plan.credits
              : 0;

            await db.user.update({
              where: { id: subscription.metadata.userId },
              data: {
                subscriptionTier: newPlan.name,
                ...(creditDifference > 0 && {
                  credits: (user.credits ?? 0) + creditDifference,
                }),
              },
            });

            // Send upgrade email
            if (isUpgrade && user.email) {
              try {
                console.log(
                  `📧 Sending upgrade email to: ${user.email} for ${currentSubscription.plan.displayName} → ${newPlan.displayName}`,
                );
                await sendSubscriptionUpgradeEmail(
                  user.email,
                  user.name ?? "User",
                  currentSubscription.plan.displayName,
                  newPlan.displayName,
                );
                console.log(
                  `✅ Upgrade email sent successfully to: ${user.email}`,
                );
              } catch (emailError) {
                console.error("❌ Failed to send upgrade email:", emailError);
              }
            }
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

        if (!subscription.metadata?.userId) {
          console.error("User ID missing from subscription metadata");
          return new NextResponse("User ID is required", { status: 400 });
        }

        // Get the Free plan details from database
        const freePlan = await db.subscriptionPlan.findUnique({
          where: { name: "Free" },
        });

        // Update subscription record
        await updateSubscription(subscription.id, {
          status: "canceled",
        });

        // Revert user to free plan
        await db.user.update({
          where: { id: subscription.metadata.userId },
          data: {
            stripeSubscriptionId: null,
            subscriptionTier: "Free",
            credits: freePlan?.credits ?? 100,
          },
        });

        // Send subscription cancelled email
        const cancelUser = await db.user.findUnique({
          where: { id: subscription.metadata.userId },
          select: { email: true, name: true },
        });

        if (cancelUser?.email) {
          try {
            await sendSubscriptionCancelledEmail(
              cancelUser.email,
              cancelUser.name ?? "User",
              new Date(subscription.canceled_at! * 1000).toLocaleDateString(),
            );
          } catch (emailError) {
            console.error("Failed to send cancellation email:", emailError);
          }
        }
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

            // Send invoice email
            if (user.email) {
              try {
                console.log(
                  `📧 Sending invoice email to: ${user.email}, amount: ${invoice.amount_due / 100}`,
                );
                await sendInvoiceEmail(
                  user.email,
                  user.name ?? "User",
                  (invoice.amount_due / 100).toString(),
                  invoice.currency.toUpperCase(),
                  invoice.due_date
                    ? new Date(invoice.due_date * 1000).toLocaleDateString()
                    : "N/A",
                  invoice.hosted_invoice_url ?? "",
                );
                console.log(
                  `✅ Invoice email sent successfully to: ${user.email}`,
                );
              } catch (emailError) {
                console.error("❌ Failed to send invoice email:", emailError);
              }
            }
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
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object; // For payment intent events, we need to look up the invoice differently
        if (paymentIntent.latest_charge) {
          const charge = await stripe.charges.retrieve(
            paymentIntent.latest_charge as string,
          );

          // Check if charge has invoice property
          if (charge.invoice) {
            // Find the related invoice in our database
            const invoice = await db.invoice.findFirst({
              where: { stripeInvoiceId: charge.invoice as string },
              include: { user: { select: { email: true, name: true } } },
            });

            if (invoice) {
              console.log(
                `💳 Creating payment record for invoice: ${invoice.id}, amount: ${paymentIntent.amount / 100}`,
              );

              await createPayment(
                invoice.userId,
                invoice.id,
                paymentIntent.id,
                paymentIntent.amount, // Keep in cents for the function (it converts internally)
                paymentIntent.currency,
                "succeeded", // Use succeeded instead of paymentIntent.status
                paymentIntent.payment_method_types[0] ?? "card",
                paymentIntent.description ?? undefined,
              );

              // Send payment success email
              if (invoice.user.email) {
                try {
                  console.log(
                    `📧 Sending payment success email to: ${invoice.user.email}`,
                  );
                  await sendPaymentSuccessEmail(
                    invoice.user.email,
                    invoice.user.name ?? "User",
                    (paymentIntent.amount / 100).toString(),
                    paymentIntent.currency.toUpperCase(),
                    new Date().toLocaleDateString(),
                  );
                  console.log(
                    `✅ Payment success email sent to: ${invoice.user.email}`,
                  );
                } catch (emailError) {
                  console.error(
                    "❌ Failed to send payment success email:",
                    emailError,
                  );
                }
              }
              console.log("✅ Payment created successfully:", paymentIntent.id);
            } else {
              console.log(
                `⚠️ No invoice found for charge: ${(charge as any).invoice}`,
              );
            }
          } else {
            console.log(
              `⚠️ No invoice found for payment intent: ${paymentIntent.id}`,
            );
          }
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object; // For payment intent events, we need to look up the invoice differently
        if (paymentIntent.latest_charge) {
          const chargeResponse = await stripe.charges.retrieve(
            paymentIntent.latest_charge as string,
          );
          const charge = chargeResponse as Stripe.Charge;

          if ((charge as any).invoice) {
            // Find the related invoice in our database
            const invoice = await db.invoice.findFirst({
              where: { stripeInvoiceId: (charge as any).invoice as string },
              include: { user: { select: { email: true, name: true } } },
            });

            if (invoice) {
              console.log(
                `💳❌ Creating failed payment record for invoice: ${invoice.id}`,
              );

              await createPayment(
                invoice.userId,
                invoice.id,
                paymentIntent.id,
                paymentIntent.amount, // Keep in cents
                paymentIntent.currency,
                "failed",
                paymentIntent.payment_method_types[0] ?? "card",
                paymentIntent.description ?? undefined,
              );

              // Send payment failed email
              if (invoice.user.email) {
                try {
                  console.log(
                    `📧 Sending payment failed email to: ${invoice.user.email}`,
                  );
                  await sendPaymentFailedEmail(
                    invoice.user.email,
                    invoice.user.name ?? "User",
                    (paymentIntent.amount / 100).toString(),
                    paymentIntent.currency.toUpperCase(),
                    paymentIntent.last_payment_error?.message ??
                      "Payment failed",
                  );
                  console.log(
                    `✅ Payment failed email sent to: ${invoice.user.email}`,
                  );
                } catch (emailError) {
                  console.error(
                    "❌ Failed to send payment failed email:",
                    emailError,
                  );
                }
              }
              console.log("❌ Failed payment recorded:", paymentIntent.id);
            }
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
