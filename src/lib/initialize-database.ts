import { db } from "~/server/db";

/**
 * Check if subscription plans are properly seeded and run seed if needed
 */
export async function initializeDatabase() {
  try {
    // Check how many subscription plans exist
    const planCount = await db.subscriptionPlan.count();

    console.log(`Found ${planCount} subscription plans in database`);

    // If less than 3 plans, run the seed
    if (planCount < 3) {
      console.log("Running database seed...");

      // Create subscription plans
      await db.subscriptionPlan.upsert({
        where: { name: "Free" },
        update: {},
        create: {
          name: "Free",
          displayName: "Free",
          description: "100 free credits—no credit card required.",
          credits: 100,
          price: 0,
          yearlyPrice: 0,
          features: JSON.stringify([
            "AI text, image & voice generation",
            "100 credits included",
            "1GB cloud storage",
            "Basic AI models",
            "Email support",
          ]),
          isActive: true,
        },
      });

      await db.subscriptionPlan.upsert({
        where: { name: "Lite" },
        update: {},
        create: {
          name: "Lite",
          displayName: "Lite",
          description: "Perfect for individual creators and small teams.",
          credits: 9000,
          price: 9.99,
          yearlyPrice: 95.9,
          features: JSON.stringify([
            "2,500 credits/month",
            "AI text, image & voice generation",
            "5GB cloud storage",
            "Standard AI models",
            "Email support",
          ]),
          isActive: true,
          stripePriceId: "price_1RRdR9BTHexbw6Zm70vmnRnl",
          stripeYearlyPriceId: "price_1RYA8JBTHexbw6ZmwzAb9eBA",
        },
      });

      await db.subscriptionPlan.upsert({
        where: { name: "Pro" },
        update: {},
        create: {
          name: "Pro",
          displayName: "Pro",
          description: "Ideal for freelancers and growing content teams.",
          credits: 25000,
          price: 19.99,
          yearlyPrice: 191.9,
          features: JSON.stringify([
            "5,000 credits/month",
            "Advanced AI models",
            "25GB cloud storage",
            "Priority email support",
            "Export in HD (images & audio)",
          ]),
          isActive: true,
          stripePriceId: "price_1RRdRSBTHexbw6ZmO8nfcKvJ",
          stripeYearlyPriceId: "price_1RYA7cBTHexbw6ZmMBjeV6vJ",
        },
      });

      console.log("Database seeded successfully!");
    } else {
      console.log("Database already properly seeded");
    }
  } catch (error) {
    console.error("Error initializing database:", error);
    // Don't throw error to prevent app from crashing on startup
  }
}
