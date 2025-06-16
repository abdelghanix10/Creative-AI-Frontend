import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import {
  cancelUserSubscription,
  createCheckoutSession,
} from "~/actions/subscription";

export interface BillingHistory {
  invoices: Array<{
    id: string;
    amount: number;
    status: string;
    description?: string | null;
    invoiceUrl?: string | null;
    paidAt?: Date | null;
    createdAt: Date;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    status: string;
    paymentMethod?: string | null;
    description?: string | null;
    createdAt: Date;
    invoice?: {
      id: string;
      description?: string | null;
    } | null;
  }>;
}

export function useSubscriptionManagement() {
  const [isLoading, setIsLoading] = useState(false);
  const [billingHistory, setBillingHistory] = useState<BillingHistory | null>(
    null,
  );
  const cancelSubscription = useCallback(async (immediately = false) => {
    try {
      setIsLoading(true);
      await cancelUserSubscription(immediately);
      toast.success(
        immediately
          ? "Subscription canceled immediately"
          : "Subscription will be canceled at the end of the current billing period",
      );
      return { success: true };
    } catch (error) {
      console.error("Error canceling subscription:", error);
      toast.error("Failed to cancel subscription");
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createCheckout = useCallback(
    async (planId: string, interval: "monthly" | "yearly" = "monthly") => {
      try {
        setIsLoading(true);
        const { url } = await createCheckoutSession(planId, interval);
        window.location.href = url;
        return { success: true, url };
      } catch (error) {
        console.error("Error creating checkout session:", error);
        toast.error("Failed to create checkout session");
        return { success: false };
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const downloadInvoice = useCallback(async (invoiceUrl: string) => {
    try {
      window.open(invoiceUrl, "_blank");
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast.error("Failed to open invoice");
    }
  }, []);
  return {
    isLoading,
    billingHistory,
    cancelSubscription,
    createCheckout,
    downloadInvoice,
  };
}

// Hook for subscription metrics (admin use)
export function useSubscriptionMetrics() {
  const [metrics, setMetrics] = useState<{
    totalSubscriptions: number;
    activeSubscriptions: number;
    canceledSubscriptions: number;
    totalRevenue: number;
    planDistribution: Array<{
      planId: string;
      plan: { id: string; name: string; displayName: string };
      _count: { planId: number };
    }>;
    debug?: {
      successfulPayments: number;
      paymentsTotal: number;
      invoicesTotal: number;
    };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/metrics");

      if (!response.ok) {
        if (response.status === 403) {
          toast.error("Admin access required. Please refresh your session.");
        } else {
          throw new Error("Failed to fetch metrics");
        }
        return null;
      }

      const data = await response.json();
      setMetrics(data);
      return data;
    } catch (error) {
      console.error("Error fetching subscription metrics:", error);
      toast.error("Failed to load subscription metrics");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    metrics,
    isLoading,
    fetchMetrics,
  };
}
