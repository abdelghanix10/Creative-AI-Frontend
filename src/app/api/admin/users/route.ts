import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { requireAdmin } from "~/lib/admin-middleware";

export async function GET(_request: NextRequest) {
  try {
    // Check admin access
    await requireAdmin(); // Get users with their subscriptions
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionTier: true,
        role: true,
        subscriptions: {
          select: {
            id: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
            createdAt: true,
            plan: {
              select: {
                displayName: true,
                price: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1, // Get the most recent subscription
        },
      },
      orderBy: {
        email: "asc",
      },
    });

    // Transform the data
    const transformedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      subscriptionTier: user.subscriptionTier,
      role: user.role,
      subscription: user.subscriptions[0]
        ? {
            id: user.subscriptions[0].id,
            status: user.subscriptions[0].status,
            currentPeriodStart: user.subscriptions[0].currentPeriodStart,
            currentPeriodEnd: user.subscriptions[0].currentPeriodEnd,
            cancelAtPeriodEnd: user.subscriptions[0].cancelAtPeriodEnd,
            createdAt: user.subscriptions[0].createdAt,
            plan: user.subscriptions[0].plan?.displayName,
            price: user.subscriptions[0].plan?.price,
          }
        : null,
    }));

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
