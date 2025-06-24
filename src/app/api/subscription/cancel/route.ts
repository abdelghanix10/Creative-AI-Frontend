import { NextResponse } from "next/server";
import { cancelUserSubscription } from "~/actions/subscription";

export async function POST(req: Request) {
  try {
    const { immediately = false } = await req.json();

    const result = await cancelUserSubscription(immediately);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
