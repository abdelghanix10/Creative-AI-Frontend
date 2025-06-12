import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { processSubscriptionRenewal } from "~/actions/subscription";

export async function POST(req: Request) {
  try {
    const { stripeSubscriptionId } = await req.json();

    if (!stripeSubscriptionId) {
      return new NextResponse("Stripe subscription ID is required", {
        status: 400,
      });
    }

    const result = await processSubscriptionRenewal(stripeSubscriptionId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error processing subscription renewal:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
