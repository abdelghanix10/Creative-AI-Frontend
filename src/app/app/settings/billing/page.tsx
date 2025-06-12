"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import {
  createCheckoutSession,
  getSubscriptionPlans,
  getUserInvoices,
} from "~/actions/subscription";
import { PageLayout } from "~/components/client/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useUserCredits } from "~/hooks/use-user-credits";
import { useUserSubscription } from "~/hooks/use-user-subscription";
import { Check, Crown, Sparkles } from "lucide-react";
import { Skeleton } from "~/components/ui/skeleton";
import { motion } from "framer-motion";

interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  credits: number;
  price: number;
  yearlyPrice: number | null;
  features: string;
  isActive: boolean;
  stripePriceId?: string | null;
  stripeYearlyPriceId?: string | null;
}

interface Invoice {
  id: string;
  amount: number;
  status: string;
  description?: string | null;
  invoiceUrl?: string | null;
  paidAt?: Date | null;
  createdAt: Date;
}

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { credits, loading: creditsLoading, refetchCredits } = useUserCredits();
  const { subscription, currentTier, refetchSubscription } =
    useUserSubscription();
  const [loading, setLoading] = useState<string | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  // Add a ref to track if data has been fetched
  const dataFetched = useRef(false);

  // Memoized function to refetch all data after successful subscription
  const refetchAllData = useCallback(async () => {
    await Promise.all([refetchSubscription(), refetchCredits()]);
    // Reset the dataFetched flag to allow refetching after subscription changes
    dataFetched.current = true;
  }, [refetchSubscription, refetchCredits]);

  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");

    if (success) {
      toast.success("Subscription updated successfully!");
      // Refetch all subscription-related data after successful upgrade
      void refetchAllData();
      router.replace("/app/settings/billing");
    }

    if (canceled) {
      toast.error("Subscription update canceled.");
      router.replace("/app/settings/billing");
    }
  }, [searchParams, router, refetchAllData]);

  // Fetch plans and user data only once when the page loads
  useEffect(() => {
    // Skip if data has already been fetched
    if (dataFetched.current) {
      return;
    }

    const fetchData = async () => {
      try {
        setPlansLoading(true);

        // Fetch subscription plans
        try {
          const subscriptionPlans = await getSubscriptionPlans();
          setPlans(subscriptionPlans ?? []);
        } catch (error) {
          console.error("Error fetching subscription plans:", error);
          setPlans([]);
        }

        // Fetch user invoices if logged in
        if (session?.user?.id) {
          try {
            const userInvoices = await getUserInvoices(session.user.id);
            setInvoices(userInvoices ?? []);
          } catch (error) {
            console.error("Error fetching user invoices:", error);
            setInvoices([]);
          }
        }

        // Mark data as fetched
        dataFetched.current = true;
      } catch (error) {
        console.error("Error fetching billing data:", error);
        toast.error("Failed to load billing information");
      } finally {
        setPlansLoading(false);
      }
    };

    if (session?.user) {
      void fetchData();
    } else {
      // Still fetch plans for guest users, but only once
      void getSubscriptionPlans()
        .then((plans) => {
          setPlans(plans ?? []);
          dataFetched.current = true;
          setPlansLoading(false);
        })
        .catch((error) => {
          console.error(error);
          setPlansLoading(false);
        });
    }
  }, [session]);

  const handleSubscribe = async (
    planId: string,
    interval: "monthly" | "yearly" = "monthly",
  ) => {
    try {
      setLoading(planId);
      const { url } = await createCheckoutSession(planId, interval);
      router.push(url);
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast.error("Failed to create checkout session");
    } finally {
      setLoading(null);
    }
  };

  const isCurrentPlan = (planName: string) => currentTier === planName;
  const canUpgrade = (planName: string) => {
    const tierOrder = ["Free", "Lite", "Pro"];
    return tierOrder.indexOf(planName) > tierOrder.indexOf(currentTier);
  };
  const formatPrice = (price: number) => {
    if (price === 0) return "$0";
    return `$${price.toFixed(2)}`;
  };

  const parseFeatures = (featuresJson: string): string[] => {
    try {
      return JSON.parse(featuresJson) as string[];
    } catch {
      return [];
    }
  };

  const getYearlyPrice = (monthlyPrice: number, yearlyPrice: number | null) => {
    return yearlyPrice ?? monthlyPrice * 12 * 0.8; // 20% discount if no yearly price set
  };

  if (plansLoading) {
    return (
      <PageLayout
        title="Billing & Subscription"
        service="settings"
        showSidebar={false}
      >
        <div className="space-y-8">
          <Card className="border-2 p-4">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-96 w-full" />
            ))}
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Billing & Subscription"
      service="settings"
      showSidebar={false}
    >
      <div className="space-y-8">
        {/* Current Subscription Overview */}
        <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>{" "}
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold text-foreground">
                    {currentTier}
                  </p>
                  {currentTier !== "Free" && (
                    <Crown className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Credits Remaining
                </p>
                {creditsLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <p className="text-xl font-bold text-foreground">
                    {credits?.toLocaleString() ?? 0}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Credits</p>
                <p className="text-xl font-bold text-foreground">
                  {(() => {
                    const currentPlan = plans.find(
                      (p) => p.name === currentTier,
                    );
                    return currentPlan?.credits.toLocaleString() ?? "0";
                  })()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Subscription Plans */}{" "}
        <div>
          <h2 className="mb-6 text-center text-2xl font-bold text-foreground">
            Available Subscription Plans
          </h2>
          <div className="mx-auto max-w-5xl">
            <Tabs defaultValue="monthly" className="w-full">
              <div className="mb-8 flex justify-center">
                <TabsList className="rounded-full p-1">
                  <TabsTrigger value="monthly" className="rounded-full px-6">
                    Monthly
                  </TabsTrigger>
                  <TabsTrigger value="annually" className="rounded-full px-6">
                    Annually (Save 20%)
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="monthly">
                <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
                  {plans.map((plan, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                    >
                      <Card
                        className={`relative h-full overflow-hidden ${
                          plan.name === "Pro"
                            ? "border-primary shadow-lg"
                            : isCurrentPlan(plan.name)
                              ? "border-green-500 shadow-lg"
                              : "border-border/40 shadow-md"
                        } bg-gradient-to-b from-background to-muted/10 backdrop-blur`}
                      >
                        {plan.name === "Pro" && (
                          <div className="absolute right-0 top-0 rounded-bl-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                            Most Popular
                          </div>
                        )}
                        {isCurrentPlan(plan.name) && (
                          <div className="absolute left-0 top-0 rounded-br-lg bg-green-600 px-3 py-1 text-xs font-medium text-white">
                            <Check className="mr-1 inline h-3 w-3" />
                            Current Plan
                          </div>
                        )}
                        <CardContent className="flex h-full flex-col p-6">
                          <h3 className="text-2xl font-bold text-foreground">
                            {plan.displayName}
                          </h3>
                          <div className="mt-4 flex items-baseline">
                            <span className="text-4xl font-bold text-foreground">
                              {formatPrice(plan.price)}
                            </span>
                            <span className="ml-1 text-muted-foreground">
                              /month
                            </span>
                          </div>
                          <p className="mt-2 text-muted-foreground">
                            {plan.description ??
                              `${plan.credits.toLocaleString()} credits per month`}
                          </p>{" "}
                          <ul className="my-6 flex-grow space-y-3">
                            {parseFeatures(plan.features).map((feature, j) => (
                              <li key={j} className="flex items-center">
                                <Check className="mr-2 size-4 text-primary" />
                                <span className="text-foreground">
                                  {feature}
                                </span>
                              </li>
                            ))}
                          </ul>
                          {isCurrentPlan(plan.name) ? (
                            <Button
                              className="mt-auto w-full rounded-full"
                              disabled
                              variant="outline"
                            >
                              Current Plan
                            </Button>
                          ) : canUpgrade(plan.name) ? (
                            <Button
                              className={`mt-auto w-full rounded-full ${
                                plan.name === "Pro"
                                  ? "bg-primary hover:bg-primary/90"
                                  : "bg-muted hover:bg-muted/80"
                              }`}
                              variant={
                                plan.name === "Pro" ? "default" : "outline"
                              }
                              onClick={() =>
                                handleSubscribe(plan.id, "monthly")
                              }
                              disabled={loading === plan.id}
                            >
                              {loading === plan.id
                                ? "Processing..."
                                : `Upgrade to ${plan.displayName}`}
                            </Button>
                          ) : (
                            <Button
                              className="mt-auto w-full rounded-full"
                              variant="outline"
                              disabled
                            >
                              Contact Support to Downgrade
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="annually">
                <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
                  {plans.map((plan, i) => {
                    const yearlyPrice = getYearlyPrice(
                      plan.price,
                      plan.yearlyPrice,
                    );
                    const monthlyEquivalent = yearlyPrice / 12;

                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                      >
                        <Card
                          className={`relative h-full overflow-hidden ${
                            plan.name === "Pro"
                              ? "border-primary shadow-lg"
                              : isCurrentPlan(plan.name)
                                ? "border-green-500 shadow-lg"
                                : "border-border/40 shadow-md"
                          } bg-gradient-to-b from-background to-muted/10 backdrop-blur`}
                        >
                          {plan.name === "Pro" && (
                            <div className="absolute right-0 top-0 rounded-bl-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                              Most Popular
                            </div>
                          )}
                          {isCurrentPlan(plan.name) && (
                            <div className="absolute left-0 top-0 rounded-br-lg bg-green-600 px-3 py-1 text-xs font-medium text-white">
                              <Check className="mr-1 inline h-3 w-3" />
                              Current Plan
                            </div>
                          )}{" "}
                          <CardContent className="flex h-full flex-col p-6">
                            <h3 className="text-2xl font-bold text-foreground">
                              {plan.displayName}
                            </h3>
                            <div className="mt-4 flex items-baseline">
                              <span className="text-4xl font-bold text-foreground">
                                {formatPrice(monthlyEquivalent)}
                              </span>
                              <span className="ml-1 text-muted-foreground">
                                /month
                              </span>
                              {plan.price > 0 && (
                                <span className="ml-2 text-sm text-muted-foreground line-through">
                                  {formatPrice(plan.price)}
                                </span>
                              )}
                            </div>
                            <p className="mt-2 text-muted-foreground">
                              {plan.description ??
                                `${plan.credits.toLocaleString()} credits per month`}
                              {plan.price > 0 &&
                                " • Save 20% with annual billing"}
                            </p>{" "}
                            <ul className="my-6 flex-grow space-y-3">
                              {parseFeatures(plan.features).map(
                                (feature, j) => (
                                  <li key={j} className="flex items-center">
                                    <Check className="mr-2 size-4 text-primary" />
                                    <span className="text-foreground">
                                      {feature}
                                    </span>
                                  </li>
                                ),
                              )}
                              {plan.price > 0 && (
                                <li className="flex items-center">
                                  <Check className="mr-2 size-4 text-primary" />
                                  <span className="text-foreground">
                                    Save 20% with annual billing
                                  </span>
                                </li>
                              )}
                            </ul>
                            {isCurrentPlan(plan.name) ? (
                              <Button
                                className="mt-auto w-full rounded-full"
                                disabled
                                variant="outline"
                              >
                                Current Plan
                              </Button>
                            ) : canUpgrade(plan.name) ? (
                              <Button
                                className={`mt-auto w-full rounded-full ${
                                  plan.name === "Pro"
                                    ? "bg-primary hover:bg-primary/90"
                                    : "bg-muted hover:bg-muted/80"
                                }`}
                                variant={
                                  plan.name === "Pro" ? "default" : "outline"
                                }
                                onClick={() =>
                                  handleSubscribe(plan.id, "yearly")
                                }
                                disabled={loading === plan.id}
                              >
                                {loading === plan.id
                                  ? "Processing..."
                                  : `Upgrade to ${plan.displayName} (Annual)`}
                              </Button>
                            ) : (
                              <Button
                                className="mt-auto w-full rounded-full"
                                variant="outline"
                                disabled
                              >
                                Contact Support to Downgrade
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        {/* Additional Information */}{" "}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">
              Billing Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium text-foreground">Payment Method</h4>
                <p className="text-sm text-muted-foreground">
                  {currentTier === "Free"
                    ? "No payment method required"
                    : "Managed through Stripe"}
                </p>
              </div>
              <div>
                <h4 className="font-medium text-foreground">Billing Cycle</h4>
                <p className="text-sm text-muted-foreground">
                  {subscription?.interval
                    ? subscription.interval.charAt(0).toUpperCase() +
                      subscription.interval.slice(1)
                    : "N/A"}
                </p>
              </div>
            </div>

            {currentTier !== "Free" && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm text-foreground">
                  <strong>Note:</strong> To manage your subscription, cancel, or
                  update payment methods, please contact our support team.
                  We&apos;ll be happy to assist you with any billing changes.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Invoice History */}{" "}
        {invoices.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Invoice History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invoices.slice(0, 5).map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between border-b border-border pb-2"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {formatPrice(invoice.amount)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.description ?? "Subscription payment"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(invoice.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-medium ${
                          invoice.status === "paid"
                            ? "text-green-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {invoice.status.charAt(0).toUpperCase() +
                          invoice.status.slice(1)}
                      </p>
                      {invoice.invoiceUrl && (
                        <a
                          href={invoice.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:text-primary/80 hover:underline"
                        >
                          View Invoice
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
