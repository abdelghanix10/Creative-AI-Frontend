import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get dashboard statistics
    const [totalUsers, activeSubscriptions, subscriptionPlans] =
      await Promise.all([
        db.user.count(),
        db.subscription.count({
          where: { status: "active" },
        }),
        db.subscriptionPlan.count({
          where: { isActive: true },
        }),
      ]);

    // Calculate monthly revenue
    const activeSubscriptionsWithPlans = await db.subscription.findMany({
      where: { status: "active" },
      include: { plan: true },
    });

    const monthlyRevenue = activeSubscriptionsWithPlans.reduce(
      (sum, subscription) => {
        const planPrice = subscription.plan.price;
        return (
          sum + (subscription.interval === "month" ? planPrice : planPrice / 12)
        );
      },
      0,
    );

    return NextResponse.json({
      totalUsers,
      activeSubscriptions,
      monthlyRevenue: Math.round(monthlyRevenue * 100), // Convert to cents
      totalPlans: subscriptionPlans,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
