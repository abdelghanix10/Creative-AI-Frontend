import { NextResponse } from "next/server";
import { requireAdmin } from "~/lib/admin-middleware";
import { syncSubscriptionPlans } from "~/actions/subscription";

export async function POST() {
  try {
    // Check admin access
    await requireAdmin();

    const result = await syncSubscriptionPlans();
    return NextResponse.json(result);
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

    console.error("Error syncing subscription plans:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
