import { NextResponse } from "next/server";
import { requireAdmin } from "~/lib/admin-middleware";
import { getSubscriptionMetrics } from "~/actions/subscription";

export async function GET() {
  try {
    // Check admin access
    await requireAdmin();

    const metrics = await getSubscriptionMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Authentication required") {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 },
        );
      }
      if (error.message === "Admin access required") {
        return NextResponse.json(
          { error: "Admin access required" },
          { status: 403 },
        );
      }
    }

    console.error("Error fetching subscription metrics:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
