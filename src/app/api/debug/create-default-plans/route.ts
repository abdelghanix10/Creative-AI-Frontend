import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";

export async function POST() {
  try {
    // Check if plans already exist
    const existingPlans = await db.subscriptionPlan.findMany();

    if (existingPlans.length > 0) {
      return NextResponse.json({
        message: "Plans already exist",
        plans: existingPlans,
      });
    }

    // Create default subscription plans
    const defaultPlans = [
      {
        name: "free",
        displayName: "Free",
        description: "Basic features for personal use",
        credits: 100,
        price: 0,
        yearlyPrice: 0,
        features: JSON.stringify([
          "100 monthly credits",
          "Basic AI generation",
          "Standard support",
        ]),
        isActive: true,
      },
      {
        name: "lite",
        displayName: "Lite",
        description: "Perfect for casual creators",
        credits: 500,
        price: 9.99,
        yearlyPrice: 99.99,
        features: JSON.stringify([
          "500 monthly credits",
          "Priority AI generation",
          "Email support",
          "HD quality exports",
        ]),
        isActive: true,
      },
      {
        name: "pro",
        displayName: "Pro",
        description: "For professional creators",
        credits: 2000,
        price: 29.99,
        yearlyPrice: 299.99,
        features: JSON.stringify([
          "2000 monthly credits",
          "Fast AI generation",
          "Priority support",
          "4K quality exports",
          "Commercial license",
        ]),
        isActive: true,
      },
    ];

    // Create the plans
    const createdPlans = await Promise.all(
      defaultPlans.map((plan) => db.subscriptionPlan.create({ data: plan })),
    );

    return NextResponse.json({
      message: "Default plans created successfully",
      plans: createdPlans,
    });
  } catch (error) {
    console.error("Failed to create default plans:", error);
    return NextResponse.json(
      { error: "Failed to create default plans" },
      { status: 500 },
    );
  }
}
