import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

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

interface Subscription {
  id: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  interval: string;
  plan: SubscriptionPlan;
}

interface SubscriptionResponse {
  subscription: Subscription | null;
  currentTier: string;
}

export function useUserSubscription() {
  const { data: session, update } = useSession();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cachedTier, setCachedTier] = useState<string | null>(null);

  // Initialize cached tier from localStorage or session
  useEffect(() => {
    if (session?.user?.id) {
      const storageKey = `subscription_tier_${session.user.id}`;
      const storedTier = localStorage.getItem(storageKey);
      if (storedTier) {
        setCachedTier(storedTier);
      } else if (session.user.subscriptionTier) {
        setCachedTier(session.user.subscriptionTier);
        localStorage.setItem(storageKey, session.user.subscriptionTier);
      }
    }
  }, [session?.user?.id, session?.user?.subscriptionTier]);

  const updateCachedTier = useCallback(
    (newTier: string) => {
      setCachedTier(newTier);
      if (session?.user?.id) {
        const storageKey = `subscription_tier_${session.user.id}`;
        localStorage.setItem(storageKey, newTier);
      }
    },
    [session?.user?.id],
  );
  const fetchSubscription = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      console.log("🔄 Fetching subscription for user:", session.user.id);
      console.log("📋 Current session tier:", session.user.subscriptionTier);
      console.log("💾 Current cached tier:", cachedTier);

      const response = await fetch("/api/user/subscription");

      if (!response.ok) {
        throw new Error("Failed to fetch subscription");
      }
      const data = (await response.json()) as SubscriptionResponse;
      console.log("🎯 API response:", data);

      setSubscription(data.subscription ?? null);

      // Update cached tier with the latest data
      const newTier =
        data.currentTier ?? session?.user?.subscriptionTier ?? "Free";
      console.log("🔄 Setting new tier:", newTier);
      updateCachedTier(newTier);

      // Update session if subscription tier has changed
      if (
        data.currentTier &&
        session &&
        data.currentTier !== session.user?.subscriptionTier
      ) {
        console.log(
          "🔄 Updating session tier from",
          session.user.subscriptionTier,
          "to",
          data.currentTier,
        );
        await update({
          subscriptionTier: data.currentTier,
        });
      }
    } catch (err) {
      console.error("❌ Error fetching subscription:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      // On error, maintain the current cached tier or use session fallback
      if (!cachedTier && session?.user?.subscriptionTier) {
        console.log(
          "🔄 Using session fallback tier:",
          session.user.subscriptionTier,
        );
        updateCachedTier(session.user.subscriptionTier);
      }
    } finally {
      setLoading(false);
    }
  }, [session, update, cachedTier, updateCachedTier]);

  useEffect(() => {
    // Only fetch if we have a session
    if (session?.user?.id) {
      void fetchSubscription();
    } else {
      setLoading(false);
    }
  }, [session?.user?.id, fetchSubscription]);

  const refetchSubscription = async () => {
    if (!session?.user) return;

    try {
      setError(null);
      const response = await fetch("/api/user/subscription");

      if (!response.ok) {
        throw new Error("Failed to fetch subscription");
      }
      const data = (await response.json()) as SubscriptionResponse;
      setSubscription(data.subscription ?? null);

      // Update cached tier with the latest data
      const newTier =
        data.currentTier ?? session?.user?.subscriptionTier ?? "Free";
      updateCachedTier(newTier);

      // Update session if subscription tier has changed
      if (
        data.currentTier &&
        session &&
        data.currentTier !== session.user?.subscriptionTier
      ) {
        await update({
          subscriptionTier: data.currentTier,
        });
      }
    } catch (err) {
      console.error("Error refetching subscription:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };
  // Use cached tier first, then subscription data, then session, then "Free"
  const currentTier =
    cachedTier ??
    subscription?.plan?.name ??
    session?.user?.subscriptionTier ??
    "Free";

  // Debug logging
  console.log("🎯 Current tier calculation:", {
    cachedTier,
    subscriptionPlanName: subscription?.plan?.name,
    sessionSubscriptionTier: session?.user?.subscriptionTier,
    finalCurrentTier: currentTier,
  });

  return {
    subscription,
    currentTier,
    loading,
    error,
    refetchSubscription,
  };
}
