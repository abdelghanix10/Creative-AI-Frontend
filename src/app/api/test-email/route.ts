import { NextResponse } from "next/server";
import { sendWelcomeEmail, sendPaymentSuccessEmail } from "~/lib/email";

export async function POST(req: Request) {
  try {
    const { type, email } = (await req.json()) as {
      type: string;
      email: string;
    };

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    console.log(`Testing email type: ${type} to ${email}`);

    switch (type) {
      case "welcome":
        await sendWelcomeEmail(email, "Test User", "Pro Plan", "1000");
        break;
      case "payment":
        await sendPaymentSuccessEmail(
          email,
          "Test User",
          "29.99",
          "USD",
          new Date().toLocaleDateString(),
        );
        break;
      default:
        await sendWelcomeEmail(email, "Test User", "Pro Plan", "1000");
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${email}`,
      type,
    });
  } catch (error) {
    console.error("Test email error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        details: error,
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Email test endpoint",
    usage:
      "POST with { email: 'test@example.com', type: 'welcome' | 'payment' }",
    environment: {
      emailEnabled: process.env.EMAIL_ENABLED,
      smtpHost: process.env.SMTP_HOST ? "configured" : "missing",
      smtpUser: process.env.SMTP_USER ? "configured" : "missing",
      emailFrom: process.env.EMAIL_FROM || "not set",
    },
  });
}
