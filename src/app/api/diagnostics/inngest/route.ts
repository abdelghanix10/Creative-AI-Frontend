import { NextResponse } from "next/server";
import { env } from "~/env";
import { inngest } from "~/inngest/client";

export async function GET() {
  try {
    const diagnostics = {
      environment: env.NODE_ENV,
      hasEventKey: !!env.INNGEST_EVENT_KEY,
      hasSigningKey: !!env.INNGEST_SIGNING_KEY,
      eventKeyLength: env.INNGEST_EVENT_KEY?.length || 0,
      signingKeyLength: env.INNGEST_SIGNING_KEY?.length || 0,
      timestamp: new Date().toISOString(),
    };

    // Test sending a simple event
    try {
      await inngest.send({
        name: "test.connection",
        data: { test: true, timestamp: Date.now() },
      });
      diagnostics.inngestConnection = "success";
    } catch (error) {
      diagnostics.inngestConnection = `error: ${error instanceof Error ? error.message : 'unknown'}`;
    }

    return NextResponse.json({
      status: "ok",
      diagnostics,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
