import { NextResponse } from "next/server";
import { db } from "~/server/db";

export async function GET() {
  try {
    const plans = await db.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    });

    // Parse features JSON
    const plansWithFeatures = plans.map((plan) => ({
      ...plan,
      features: JSON.parse(plan.features),
    }));

    return NextResponse.json({ plans: plansWithFeatures });
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
