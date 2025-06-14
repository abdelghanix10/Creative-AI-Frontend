import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { requireAdmin } from "~/lib/admin-middleware";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

export async function GET() {
  try {
    // Check if user is admin (this also validates authentication)
    await requireAdmin();

    // Get all subscription plans
    const plans = await db.subscriptionPlan.findMany({
      orderBy: {
        price: "asc",
      },
    }); // Transform the data to match the expected interface
    const transformedPlans = plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      displayName: plan.displayName,
      description: plan.description,
      credits: plan.credits,
      price: Math.round(plan.price * 100), // Convert to cents
      yearlyPrice: plan.yearlyPrice
        ? Math.round(plan.yearlyPrice * 100)
        : undefined,
      interval: "month" as const,
      features: JSON.parse(plan.features) as string[],
      stripePriceId: plan.stripePriceId,
      stripeYearlyPriceId: plan.stripeYearlyPriceId,
      isActive: plan.isActive,
    }));

    return NextResponse.json({
      plans: transformedPlans,
    });
  } catch (error) {
    console.error("Failed to fetch subscription plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription plans" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin (this also validates authentication)
    await requireAdmin();
    const body = (await request.json()) as {
      name: string;
      displayName?: string;
      description?: string;
      credits?: number;
      price: number;
      yearlyPrice?: number;
      features?: string[];
      isActive?: boolean;
      stripePriceId?: string;
    };

    const {
      name,
      displayName,
      description,
      credits,
      price,
      yearlyPrice,
      features,
      isActive,
      stripePriceId,
    } = body;

    // Validate required fields
    if (!name || !price) {
      return NextResponse.json(
        { error: "Name and price are required" },
        { status: 400 },
      );
    } // Create or get Stripe prices if stripePriceId is not provided
    let stripeMonthlyPrice: Stripe.Price;
    let stripeYearlyPrice: Stripe.Price | null = null;

    if (stripePriceId) {
      // Verify the price exists in Stripe
      try {
        stripeMonthlyPrice = await stripe.prices.retrieve(stripePriceId);
      } catch {
        return NextResponse.json(
          { error: "Invalid Stripe price ID" },
          { status: 400 },
        );
      }
    } else {
      // Create a new price in Stripe
      try {
        // First create a product
        const product = await stripe.products.create({
          name,
          description: description ?? undefined,
        });

        // Create monthly price
        stripeMonthlyPrice = await stripe.prices.create({
          unit_amount: price,
          currency: "usd",
          recurring: {
            interval: "month",
          },
          product: product.id,
        });

        // Create yearly price if yearlyPrice is provided
        if (yearlyPrice && yearlyPrice > 0) {
          stripeYearlyPrice = await stripe.prices.create({
            unit_amount: yearlyPrice,
            currency: "usd",
            recurring: {
              interval: "year",
            },
            product: product.id,
          });
        }
      } catch (stripeError) {
        console.error("Failed to create Stripe price:", stripeError);
        return NextResponse.json(
          { error: "Failed to create Stripe price" },
          { status: 500 },
        );
      }
    } // Create the plan in database
    const plan = await db.subscriptionPlan.create({
      data: {
        name: name.toLowerCase().replace(/\s+/g, "_"), // Create a slug-like name
        displayName: displayName ?? name,
        description: description ?? null,
        credits: credits ?? 0,
        price: price / 100, // Convert from cents to dollars
        yearlyPrice: yearlyPrice ? yearlyPrice / 100 : null,
        features: JSON.stringify(features ?? []),
        stripePriceId: stripeMonthlyPrice.id,
        stripeYearlyPriceId: stripeYearlyPrice?.id ?? null,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      plan,
    });
  } catch (error) {
    console.error("Failed to create subscription plan:", error);
    return NextResponse.json(
      { error: "Failed to create subscription plan" },
      { status: 500 },
    );
  }
}
