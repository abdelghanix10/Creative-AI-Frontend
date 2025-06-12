import { NextResponse } from "next/server";

export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,

    // Email Configuration
    emailConfig: {
      enabled: process.env.EMAIL_ENABLED,
      from: process.env.EMAIL_FROM,
      smtp: {
        host: process.env.SMTP_HOST ? "✅ configured" : "❌ missing",
        port: process.env.SMTP_PORT || "❌ missing",
        secure: process.env.SMTP_SECURE,
        user: process.env.SMTP_USER ? "✅ configured" : "❌ missing",
        pass: process.env.SMTP_PASS ? "✅ configured" : "❌ missing",
      },
    },

    // Stripe Configuration
    stripeConfig: {
      secretKey: process.env.STRIPE_SECRET_KEY ? "✅ configured" : "❌ missing",
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
        ? "✅ configured"
        : "❌ missing",
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        ? "✅ configured"
        : "❌ missing",
    },

    // App Configuration
    appConfig: {
      url: process.env.NEXT_PUBLIC_APP_URL || "❌ missing",
      authSecret: process.env.AUTH_SECRET ? "✅ configured" : "❌ missing",
      databaseUrl: process.env.DATABASE_URL ? "✅ configured" : "❌ missing",
    },

    // Health Checks
    healthChecks: {
      emailReady: !!(
        process.env.EMAIL_ENABLED === "true" &&
        process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS
      ),
      stripeReady: !!(
        process.env.STRIPE_SECRET_KEY &&
        process.env.STRIPE_WEBHOOK_SECRET &&
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      ),
      appReady: !!(
        process.env.NEXT_PUBLIC_APP_URL &&
        process.env.AUTH_SECRET &&
        process.env.DATABASE_URL
      ),
    },

    // Common Issues
    commonIssues: [],
  };

  // Check for common issues
  if (process.env.EMAIL_ENABLED !== "true") {
    diagnostics.commonIssues.push(
      "❌ EMAIL_ENABLED is not set to 'true' - emails will not be sent",
    );
  }

  if (!process.env.SMTP_HOST) {
    diagnostics.commonIssues.push(
      "❌ SMTP_HOST is missing - email delivery will fail",
    );
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    diagnostics.commonIssues.push(
      "❌ STRIPE_WEBHOOK_SECRET is missing - webhooks will fail",
    );
  }

  if (diagnostics.commonIssues.length === 0) {
    diagnostics.commonIssues.push("✅ No common configuration issues detected");
  }

  return NextResponse.json(diagnostics, {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}

export async function POST() {
  try {
    // Test database connection
    const { db } = await import("~/server/db");
    const userCount = await db.user.count();
    const planCount = await db.subscriptionPlan.count();

    return NextResponse.json({
      database: {
        status: "✅ connected",
        userCount,
        planCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        database: {
          status: "❌ error",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
