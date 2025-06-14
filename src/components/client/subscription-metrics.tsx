"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { useSubscriptionMetrics } from "~/hooks/use-subscription-management";
import {
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";

interface SubscriptionMetricsProps {
  isAdmin?: boolean;
}

export function SubscriptionMetrics({
  isAdmin = false,
}: SubscriptionMetricsProps) {
  const { metrics, isLoading, fetchMetrics } = useSubscriptionMetrics();
  const [syncing, setSyncing] = useState(false);
  useEffect(() => {
    // Always try to fetch metrics, let the server handle auth
    void fetchMetrics();
  }, [fetchMetrics]);

  const syncPlans = async () => {
    try {
      setSyncing(true);
      const response = await fetch("/api/admin/sync-plans", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to sync plans");
      }
      const result = (await response.json()) as { message?: string };
      toast.success(result.message ?? "Plans synced successfully");
    } catch (error) {
      console.error("Error syncing plans:", error);
      toast.error("Failed to sync plans");
    } finally {
      setSyncing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return "0%";
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-muted-foreground">
            <AlertCircle className="mr-2 h-5 w-5" />
            Admin access required
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading && !metrics) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-16" />
                <Skeleton className="mt-1 h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const activeRate = metrics
    ? formatPercentage(metrics.activeSubscriptions, metrics.totalSubscriptions)
    : "0%";

  const churnRate = metrics
    ? formatPercentage(
        metrics.canceledSubscriptions,
        metrics.totalSubscriptions,
      )
    : "0%";

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button onClick={syncPlans} disabled={syncing} variant="outline">
          {syncing ? "Syncing..." : "Sync Plans"}
        </Button>
        <Button
          onClick={() => fetchMetrics()}
          disabled={isLoading}
          variant="outline"
        >
          {isLoading ? "Refreshing..." : "Refresh Metrics"}
        </Button>
      </div>

      {/* Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Subscribers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.totalSubscriptions ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.activeSubscriptions ?? 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.totalRevenue ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">All-time revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeRate}
            </div>
            <p className="text-xs text-muted-foreground">
              Of total subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{churnRate}</div>
            <p className="text-xs text-muted-foreground">
              Canceled subscriptions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution */}
      {metrics?.planDistribution && metrics.planDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.planDistribution.map((plan) => {
                const percentage = formatPercentage(
                  plan._count.planId,
                  metrics.activeSubscriptions,
                );

                return (
                  <div
                    key={plan.planId}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Plan {plan.planId}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">
                        {plan._count.planId} subscribers
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {percentage}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Subscription Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Active</span>
                <Badge className="bg-green-100 text-green-800">
                  {metrics?.activeSubscriptions ?? 0}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Canceled</span>
                <Badge className="bg-red-100 text-red-800">
                  {metrics?.canceledSubscriptions ?? 0}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Total</span>
                <Badge variant="outline">
                  {metrics?.totalSubscriptions ?? 0}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => toast("Feature coming soon", { icon: "ℹ️" })}
            >
              Export Subscribers
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => toast("Feature coming soon", { icon: "ℹ️" })}
            >
              Revenue Report
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => toast("Feature coming soon", { icon: "ℹ️" })}
            >
              Failed Payments
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
