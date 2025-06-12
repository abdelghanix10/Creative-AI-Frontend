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
    });

    // Transform the data to match the expected interface
    const transformedPlans = plans.map((plan) => ({
      id: plan.id,
      name: plan.displayName,
      description: plan.description,
      price: Math.round(plan.price * 100), // Convert to cents
      interval: "month" as const,
      features: JSON.parse(plan.features) as string[],
      stripePriceId: plan.stripePriceId,
      active: plan.isActive,
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
      description?: string;
      price: number;
      interval: "month" | "year";
      features?: string[];
      stripePriceId?: string;
    };

    const { name, description, price, interval, features, stripePriceId } =
      body;

    // Validate required fields
    if (!name || !price || !interval) {
      return NextResponse.json(
        { error: "Name, price, and interval are required" },
        { status: 400 },
      );
    }

    // Create or get Stripe price if stripePriceId is not provided
    let stripePrice: Stripe.Price;
    if (stripePriceId) {
      // Verify the price exists in Stripe
      try {
        stripePrice = await stripe.prices.retrieve(stripePriceId);
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

        // Then create a price
        stripePrice = await stripe.prices.create({
          unit_amount: price,
          currency: "usd",
          recurring: {
            interval: interval,
          },
          product: product.id,
        });
      } catch (stripeError) {
        console.error("Failed to create Stripe price:", stripeError);
        return NextResponse.json(
          { error: "Failed to create Stripe price" },
          { status: 500 },
        );
      }
    }

    // Create the plan in database
    const plan = await db.subscriptionPlan.create({
      data: {
        name: name.toLowerCase().replace(/\s+/g, "_"), // Create a slug-like name
        displayName: name,
        description: description ?? null,
        credits: 0, // Default credits, can be updated later
        price: price / 100, // Convert from cents to dollars
        yearlyPrice: interval === "year" ? price / 100 : null,
        features: JSON.stringify(features ?? []),
        stripePriceId: stripePrice.id,
        stripeYearlyPriceId: interval === "year" ? stripePrice.id : null,
        isActive: true,
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
