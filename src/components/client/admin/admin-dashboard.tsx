"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Users, CreditCard, DollarSign, Activity } from "lucide-react";
import { SubscriptionMetrics } from "~/components/client/admin/subscription-metrics";

interface AdminDashboardProps {
  userId: string;
  initialStats?: {
    totalUsers: number;
    activeSubscriptions: number;
    monthlyRevenue: number;
    totalPlans: number;
  };
}

export function AdminDashboard({
  userId: _userId,
  initialStats,
}: AdminDashboardProps) {
  const [isLoading] = useState(!initialStats);
  const [stats] = useState({
    totalUsers: initialStats?.totalUsers ?? 0,
    activeSubscriptions: initialStats?.activeSubscriptions ?? 0,
    monthlyRevenue: initialStats?.monthlyRevenue ?? 0,
    totalPlans: initialStats?.totalPlans ?? 0,
  });

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (isLoading && !initialStats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Active Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <div className="text-2xl font-bold">
                {stats.activeSubscriptions}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div className="text-2xl font-bold">
                {formatAmount(stats.monthlyRevenue)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Available Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div className="text-2xl font-bold">{stats.totalPlans}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics */}
      <SubscriptionMetrics isAdmin={true} />
    </div>
  );
}
