import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seed...");

  // Create subscription plans
  const freePlan = await prisma.subscriptionPlan.upsert({
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

  const litePlan = await prisma.subscriptionPlan.upsert({
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
        "9000 credits/month",
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

  const proPlan = await prisma.subscriptionPlan.upsert({
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
        "25000 credits/month",
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

  console.log("Subscription plans created:");
  console.log("- Free Plan:", freePlan.name);
  console.log("- Lite Plan:", litePlan.name);
  console.log("- Pro Plan:", proPlan.name);

  console.log("Database seeded successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error seeding database:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
