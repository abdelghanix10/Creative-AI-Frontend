import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get failed payments
    const failedPayments = await db.payment.findMany({
      where: {
        userId: session.user.id,
        status: {
          in: ["failed", "requires_payment_method", "requires_action"],
        },
        createdAt: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
        },
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceUrl: true,
            dueDate: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get current subscription to check for issues
    const currentSubscription = await db.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ["active", "past_due", "unpaid"] },
      },
      include: {
        plan: true,
      },
    });

    // Generate payment issues based on subscription status and failed payments
    const issues = [];

    if (currentSubscription?.status === "past_due") {
      issues.push({
        type: "overdue",
        message:
          "Your subscription payment is overdue. Please update your payment method to avoid service interruption.",
        actionRequired: true,
      });
    }

    if (currentSubscription?.status === "unpaid") {
      issues.push({
        type: "failed",
        message:
          "Your subscription is unpaid. Access to premium features may be limited.",
        actionRequired: true,
      });
    }

    if (failedPayments.some((p) => p.status === "requires_action")) {
      issues.push({
        type: "requires_action",
        message:
          "Some payments require additional authentication. Please complete the payment process.",
        actionRequired: true,
      });
    }

    // Check for recent failed payments
    const recentFailures = failedPayments.filter(
      (p) =>
        new Date(p.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    );

    if (recentFailures.length > 0) {
      issues.push({
        type: "failed",
        message: `${recentFailures.length} payment(s) failed in the last week. Please check your payment method.`,
        actionRequired: true,
      });
    }

    return NextResponse.json({
      failedPayments,
      issues,
      subscriptionStatus: currentSubscription?.status,
    });
  } catch (error) {
    console.error("Error fetching payment issues:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
