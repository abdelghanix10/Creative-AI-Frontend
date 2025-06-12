import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { cancelSubscription } from "~/actions/subscription";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { immediately = false } = await req.json();

    const result = await cancelSubscription(session.user.id, immediately);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
