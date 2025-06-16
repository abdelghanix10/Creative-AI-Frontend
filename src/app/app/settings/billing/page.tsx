"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import {
  createCheckoutSession,
  getSubscriptionPlans,
  getUserInvoices,
  cancelUserSubscription,
} from "~/actions/subscription";
import { PageLayout } from "~/components/client/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useUserCredits } from "~/hooks/use-user-credits";
import { useUserSubscription } from "~/hooks/use-user-subscription";
import {
  Calendar,
  Check,
  CreditCard,
  Crown,
  DollarSign,
  History,
  Sparkles,
} from "lucide-react";
import { Skeleton } from "~/components/ui/skeleton";
import { motion } from "framer-motion";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

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
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelType, setCancelType] = useState<"immediate" | "period-end">(
    "period-end",
  ); // Add a ref to track if data has been fetched
  const dataFetched = useRef(false);
  const hasProcessedUrlParams = useRef(false);
  // Handle URL parameters (success/canceled) separately
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");

    // Only process URL params once per navigation
    if ((success || canceled) && !hasProcessedUrlParams.current) {
      hasProcessedUrlParams.current = true;

      if (success) {
        toast.success("Subscription updated successfully!");
        // Refetch subscription data only
        void Promise.all([refetchSubscription(), refetchCredits()]);
      }

      if (canceled) {
        toast.error("Subscription update canceled.");
      }

      // Clean up URL
      router.replace("/app/settings/billing");
    } else if (!success && !canceled) {
      // Reset the flag when there are no URL params
      hasProcessedUrlParams.current = false;
    }
  }, [searchParams, router, refetchSubscription, refetchCredits]);

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
    } else if (session !== undefined) {
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

  // Handle subscription cancellation
  const handleCancelSubscription = async (immediately = false) => {
    try {
      setLoading(immediately ? "cancel-immediate" : "cancel-period-end");
      await cancelUserSubscription(immediately);
      toast.success(
        immediately
          ? "Subscription canceled immediately. Refund will be processed if applicable."
          : "Subscription will be canceled at the end of your current billing period",
      );
      await Promise.all([refetchSubscription(), refetchCredits()]);
      setCancelDialogOpen(false);
    } catch (error) {
      console.error("Error canceling subscription:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to cancel subscription";
      toast.error(errorMessage);
    } finally {
      setLoading(null);
    }
  };

  // Open cancel dialog with the specified type
  const openCancelDialog = (type: "immediate" | "period-end") => {
    setCancelType(type);
    setCancelDialogOpen(true);
  };

  // Check if immediate cancellation is allowed
  const canCancelImmediately = () => {
    if (!subscription?.plan?.credits || credits === null) return true;
    return credits <= subscription.plan.credits;
  };
  const isCurrentPlan = (planName: string) => currentTier === planName;
  const canUpgrade = (planName: string) => {
    // Only Free tier can upgrade to Lite or Pro
    // Lite and Pro tiers cannot upgrade
    if (currentTier === "Free") {
      return planName === "Lite" || planName === "Pro";
    }
    return false;
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

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
      case "succeeded":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
      case "payment_failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
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
                <p className="text-sm text-muted-foreground">Plan</p>
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
        </Card>{" "}
        {/* Sub OverView */}
        <Card className="flex flex-col gap-2 border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex items-center space-x-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <p className="text-lg font-semibold">{currentTier}</p>
                </div>
              </div>

              {subscription && (
                <>
                  {" "}
                  <div className="flex items-center space-x-4">
                    <div className="rounded-full bg-blue-100 p-3">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Next Billing
                      </p>
                      <p className="text-lg font-semibold">
                        {subscription.currentPeriodEnd
                          ? formatDate(subscription.currentPeriodEnd)
                          : "N/A"}
                      </p>
                      {subscription.interval && (
                        <p className="text-xs text-muted-foreground">
                          {subscription.interval === "yearly"
                            ? "Annual"
                            : "Monthly"}{" "}
                          billing
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="rounded-full bg-green-100 p-3">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge className={getStatusColor(subscription.status)}>
                        {subscription.status}
                      </Badge>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        {/* Additional Information */}
        <Card className="flex flex-col gap-2 border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
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
              </div>{" "}
              <div>
                <h4 className="font-medium text-foreground">Billing Cycle</h4>
                <p className="text-sm text-muted-foreground">
                  {subscription?.interval
                    ? subscription.interval === "yearly"
                      ? "Annual"
                      : "Monthly"
                    : "N/A"}
                </p>
              </div>
            </div>{" "}
            {currentTier !== "Free" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <h4 className="mb-2 font-medium text-foreground">
                    Manage Subscription
                  </h4>{" "}
                  <p className="mb-4 text-sm text-foreground">
                    You can cancel your subscription at any time. Choose to
                    cancel immediately or at the end of your current billing
                    period.
                  </p>
                  {canCancelImmediately() && (
                    <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                      <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> You cannot cancel immediately
                        because you have {credits} credits, which exceeds your
                        plan limit of {subscription?.plan?.credits} credits.
                        Please use your credits first or choose to cancel at the
                        end of your billing period.
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openCancelDialog("period-end")}
                      disabled={loading === "cancel-period-end"}
                    >
                      {loading === "cancel-period-end"
                        ? "Canceling..."
                        : "Cancel at Period End"}
                    </Button>{" "}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openCancelDialog("immediate")}
                      disabled={
                        loading === "cancel-immediate" || canCancelImmediately()
                      }
                      title={
                        canCancelImmediately()
                          ? "You have too many credits to cancel immediately"
                          : ""
                      }
                    >
                      {loading === "cancel-immediate"
                        ? "Canceling..."
                        : "Cancel Immediately"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Invoice History */}
        {invoices.length > 0 && (
          <Card className="flex flex-col gap-2 border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Invoice History
              </CardTitle>
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
        {/* Subscription Plans */}
        <div className="!mb-6">
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
                          </p>
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
                              Contact Support
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
                          )}
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
                            </p>
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
                                Contact Support
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
          </div>{" "}
        </div>
      </div>

      {/* Cancel Subscription Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>{" "}
            <DialogDescription>
              {cancelType === "immediate"
                ? `Are you sure you want to cancel your subscription immediately? You can only cancel immediately if your current credits (${credits ?? 0}) do not exceed your plan limit. You will receive a prorated refund for the unused portion of your current billing period. You will lose access to your plan features right away.`
                : "Are you sure you want to cancel your subscription? Your plan will remain active until the end of your current billing period, and then it will be canceled automatically."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={loading !== null}
            >
              Keep Subscription
            </Button>
            <Button
              variant={cancelType === "immediate" ? "destructive" : "default"}
              onClick={() =>
                handleCancelSubscription(cancelType === "immediate")
              }
              disabled={loading !== null}
            >
              {loading !== null
                ? "Processing..."
                : cancelType === "immediate"
                  ? "Cancel Immediately"
                  : "Cancel at Period End"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
