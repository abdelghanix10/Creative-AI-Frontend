import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { getUserBillingHistory } from "~/actions/subscription";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") ?? "20");

    const billingHistory = await getUserBillingHistory(session.user.id, limit);

    return NextResponse.json(billingHistory);
  } catch (error) {
    console.error("Error fetching billing history:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
