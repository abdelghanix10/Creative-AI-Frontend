"use client";

import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Loader2, Check, ArrowUp, ArrowDown } from "lucide-react";
import { useToast } from "~/hooks/use-toast";

interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  price: number;
  yearlyPrice?: number;
  credits: number;
  features: string[];
  isActive: boolean;
  stripePriceId?: string;
  stripeYearlyPriceId?: string;
}

interface UserSubscription {
  id: string;
  planId: string;
  status: string;
  interval: string;
  plan: SubscriptionPlan;
}

interface SubscriptionUpgradeProps {
  currentSubscription?: UserSubscription;
}

export function SubscriptionUpgrade({
  currentSubscription,
}: SubscriptionUpgradeProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [changingTo, setChangingTo] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const { toast } = useToast();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/subscription/plans");
      if (!response.ok) throw new Error("Failed to fetch plans");

      const data = await response.json();
      setPlans(data.plans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast({
        title: "Error",
        description: "Failed to load subscription plans",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanChange = async (
    planId: string,
    interval: "monthly" | "yearly",
  ) => {
    if (!currentSubscription) {
      // Redirect to checkout for new subscription
      window.location.href = `/api/billing/checkout?planId=${planId}&interval=${interval}`;
      return;
    }

    setChangingTo(planId);
    try {
      const response = await fetch("/api/subscription/change", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId,
          interval,
        }),
      });

      if (!response.ok) throw new Error("Failed to change subscription");

      const data = await response.json();

      if (data.url) {
        // Redirect to Stripe for plan change
        window.location.href = data.url;
      } else {
        toast({
          title: "Success",
          description: "Your subscription has been updated successfully",
        });
        // Refresh the page to show updated subscription
        window.location.reload();
      }
    } catch (error) {
      console.error("Error changing subscription:", error);
      toast({
        title: "Error",
        description: "Failed to change subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setChangingTo(null);
    }
  };

  const getPlanComparison = (plan: SubscriptionPlan) => {
    if (!currentSubscription) return null;

    const currentPlan = currentSubscription.plan;
    if (plan.id === currentPlan.id) return "current";

    // Compare by price as a proxy for plan tier
    const currentPrice =
      billingInterval === "yearly"
        ? (currentPlan.yearlyPrice ?? currentPlan.price * 12)
        : currentPlan.price;
    const planPrice =
      billingInterval === "yearly"
        ? (plan.yearlyPrice ?? plan.price * 12)
        : plan.price;

    return planPrice > currentPrice ? "upgrade" : "downgrade";
  };

  const getPriceDisplay = (plan: SubscriptionPlan) => {
    if (billingInterval === "yearly" && plan.yearlyPrice) {
      const monthlyEquivalent = plan.yearlyPrice / 12;
      const savings = (
        ((plan.price * 12 - plan.yearlyPrice) / (plan.price * 12)) *
        100
      ).toFixed(0);
      return (
        <div>
          <span className="text-2xl font-bold">
            ${monthlyEquivalent.toFixed(2)}
          </span>
          <span className="text-muted-foreground">/month</span>
          <div className="text-sm text-green-600">
            Save {savings}% with yearly billing
          </div>
        </div>
      );
    }
    return (
      <div>
        <span className="text-2xl font-bold">${plan.price}</span>
        <span className="text-muted-foreground">/month</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Billing Interval Toggle */}
      <div className="flex justify-center">
        <div className="flex rounded-lg bg-muted p-1">
          <Button
            variant={billingInterval === "monthly" ? "default" : "ghost"}
            size="sm"
            onClick={() => setBillingInterval("monthly")}
          >
            Monthly
          </Button>
          <Button
            variant={billingInterval === "yearly" ? "default" : "ghost"}
            size="sm"
            onClick={() => setBillingInterval("yearly")}
          >
            Yearly
          </Button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const comparison = getPlanComparison(plan);
          const isChanging = changingTo === plan.id;
          const priceId =
            billingInterval === "yearly"
              ? plan.stripeYearlyPriceId
              : plan.stripePriceId;

          return (
            <Card
              key={plan.id}
              className={`relative ${comparison === "current" ? "border-primary" : ""}`}
            >
              {comparison === "current" && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 transform">
                  Current Plan
                </Badge>
              )}

              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.displayName}
                  {comparison === "upgrade" && (
                    <ArrowUp className="h-4 w-4 text-green-600" />
                  )}
                  {comparison === "downgrade" && (
                    <ArrowDown className="h-4 w-4 text-orange-600" />
                  )}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">{getPriceDisplay(plan)}</div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {plan.credits} credits/month
                  </div>
                </div>

                <div className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Check className="h-4 w-4 text-green-600" />
                      {feature}
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full"
                  variant={comparison === "current" ? "outline" : "default"}
                  disabled={comparison === "current" || isChanging || !priceId}
                  onClick={() => handlePlanChange(plan.id, billingInterval)}
                >
                  {isChanging ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : comparison === "current" ? (
                    "Current Plan"
                  ) : comparison === "upgrade" ? (
                    "Upgrade to this plan"
                  ) : comparison === "downgrade" ? (
                    "Downgrade to this plan"
                  ) : (
                    "Select this plan"
                  )}
                </Button>

                {!priceId && billingInterval === "yearly" && (
                  <p className="text-center text-xs text-muted-foreground">
                    Yearly billing not available for this plan
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {currentSubscription && (
        <div className="mt-8 rounded-lg bg-muted p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Plan changes will be prorated automatically.
            Upgrades take effect immediately, while downgrades take effect at
            the end of your current billing period.
          </p>
        </div>
      )}
    </div>
  );
}
