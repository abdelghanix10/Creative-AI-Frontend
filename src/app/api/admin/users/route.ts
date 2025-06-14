import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { requireAdmin } from "~/lib/admin-middleware";

export async function GET(_request: NextRequest) {
  try {
    // Check admin access
    await requireAdmin();
    // Get user information with subscription data
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionTier: true,
        role: true,
        isActive: true,
        createdAt: true,
        subscriptions: {
          where: {
            status: {
              in: ["active", "trialing", "past_due"],
            },
          },
          select: {
            id: true,
            status: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
            plan: {
              select: {
                name: true,
                displayName: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        email: "asc",
      },
    });

    // Transform the data
    const transformedUsers = users.map((user) => {
      const activeSubscription = user.subscriptions[0];

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        subscriptionTier: user.subscriptionTier,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        subscription: activeSubscription
          ? {
              id: activeSubscription.id,
              status: activeSubscription.status,
              currentPeriodEnd: activeSubscription.currentPeriodEnd,
              cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd,
              plan:
                activeSubscription.plan.displayName ||
                activeSubscription.plan.name,
            }
          : null,
      };
    });

    return NextResponse.json({
      users: transformedUsers,
      total: users.length,
    });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}
