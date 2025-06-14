import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { requireAdmin } from "~/lib/admin-middleware";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check if user is admin
    await requireAdmin();

    const { id } = await params;
    const body = (await request.json()) as {
      name?: string;
      displayName?: string;
      description?: string;
      credits?: number;
      price?: number;
      yearlyPrice?: number;
      features?: string[];
      isActive?: boolean;
    };

    // Validate that the plan exists
    const existingPlan = await db.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!existingPlan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Handle Stripe price updates
    let newStripeYearlyPriceId = existingPlan.stripeYearlyPriceId;

    // If yearly price is being updated and there's a monthly price
    if (body.yearlyPrice !== undefined && existingPlan.stripePriceId) {
      try {
        // Get the product ID from the existing monthly price
        const monthlyPrice = await stripe.prices.retrieve(
          existingPlan.stripePriceId,
        );

        if (body.yearlyPrice && body.yearlyPrice > 0) {
          // If we don't have a yearly price or the amount changed, create a new one
          if (
            !existingPlan.stripeYearlyPriceId ||
            (existingPlan.yearlyPrice &&
              Math.round(existingPlan.yearlyPrice * 100) !== body.yearlyPrice)
          ) {
            // Archive old yearly price if it exists
            if (existingPlan.stripeYearlyPriceId) {
              await stripe.prices.update(existingPlan.stripeYearlyPriceId, {
                active: false,
              });
            }

            // Create new yearly price
            const newYearlyPrice = await stripe.prices.create({
              unit_amount: body.yearlyPrice,
              currency: "usd",
              recurring: {
                interval: "year",
              },
              product: monthlyPrice.product as string,
            });
            newStripeYearlyPriceId = newYearlyPrice.id;
          }
        } else {
          // If yearly price is being removed (set to 0 or null)
          if (existingPlan.stripeYearlyPriceId) {
            await stripe.prices.update(existingPlan.stripeYearlyPriceId, {
              active: false,
            });
            newStripeYearlyPriceId = null;
          }
        }
      } catch (stripeError) {
        console.error("Failed to update Stripe yearly price:", stripeError);
        return NextResponse.json(
          { error: "Failed to update Stripe yearly price" },
          { status: 500 },
        );
      }
    }

    // Update the plan
    const updatedPlan = await db.subscriptionPlan.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.displayName && { displayName: body.displayName }),
        ...(body.description !== undefined && {
          description: body.description,
        }),
        ...(body.credits !== undefined && { credits: body.credits }),
        ...(body.price !== undefined && { price: body.price / 100 }), // Convert from cents to dollars
        ...(body.yearlyPrice !== undefined && {
          yearlyPrice: body.yearlyPrice ? body.yearlyPrice / 100 : null,
        }),
        ...(body.features && { features: JSON.stringify(body.features) }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(newStripeYearlyPriceId !== existingPlan.stripeYearlyPriceId && {
          stripeYearlyPriceId: newStripeYearlyPriceId,
        }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      plan: updatedPlan,
    });
  } catch (error) {
    console.error("Failed to update subscription plan:", error);
    return NextResponse.json(
      { error: "Failed to update subscription plan" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check if user is admin
    await requireAdmin();

    const { id } = await params;

    // Check if plan exists and get Stripe price IDs
    const existingPlan = await db.subscriptionPlan.findUnique({
      where: { id },
      include: {
        subscriptions: true,
      },
    });

    if (!existingPlan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Check if plan has active subscriptions
    if (existingPlan.subscriptions.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete plan with active subscriptions" },
        { status: 400 },
      );
    }

    // Optionally archive the Stripe prices instead of deleting them
    // (Stripe doesn't allow deletion of prices, only archiving)
    if (existingPlan.stripePriceId) {
      try {
        await stripe.prices.update(existingPlan.stripePriceId, {
          active: false,
        });
      } catch (stripeError) {
        console.warn("Failed to archive Stripe price:", stripeError);
        // Continue with database deletion even if Stripe operation fails
      }
    }

    if (existingPlan.stripeYearlyPriceId) {
      try {
        await stripe.prices.update(existingPlan.stripeYearlyPriceId, {
          active: false,
        });
      } catch (stripeError) {
        console.warn("Failed to archive Stripe yearly price:", stripeError);
        // Continue with database deletion even if Stripe operation fails
      }
    }

    // Delete the plan from database
    await db.subscriptionPlan.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Plan deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete subscription plan:", error);
    return NextResponse.json(
      { error: "Failed to delete subscription plan" },
      { status: 500 },
    );
  }
}
