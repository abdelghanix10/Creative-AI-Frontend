"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { toast } from "react-hot-toast";
import { Calendar, CreditCard, DollarSign, X } from "lucide-react";

interface SubscriptionData {
  id: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  interval: string;
  user: {
    id: string;
    name?: string;
    email: string;
  };
  plan: {
    id: string;
    displayName: string;
    price: number;
  };
  stripeSubscriptionId?: string;
}

export function SubscriptionManagement() {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedSubscription, setSelectedSubscription] =
    useState<SubscriptionData | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const fetchSubscriptions = async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      const response = await fetch("/api/admin/subscriptions");
      if (response.ok) {
        const data = (await response.json()) as {
          subscriptions: SubscriptionData[];
        };
        setSubscriptions(data.subscriptions);
      } else {
        toast.error("Failed to load subscriptions");
      }
    } catch (error) {
      console.error("Failed to fetch subscriptions:", error);
      toast.error("Failed to load subscriptions");
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
      setIsInitialLoading(false);
    }
  };

  const cancelSubscription = async (subscriptionId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/admin/subscriptions/${subscriptionId}/cancel`,
        {
          method: "POST",
        },
      );
      if (response.ok) {
        toast.success("Subscription cancelled successfully");
        await fetchSubscriptions(false);
      } else {
        const error = await response.text();
        toast.error(`Failed to cancel subscription: ${error}`);
      }
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
      toast.error("Failed to cancel subscription");
    } finally {
      setIsLoading(false);
    }
  };

  const reactivateSubscription = async (subscriptionId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/admin/subscriptions/${subscriptionId}/reactivate`,
        {
          method: "POST",
        },
      );
      if (response.ok) {
        toast.success("Subscription reactivated successfully");
        await fetchSubscriptions(false);
      } else {
        const error = await response.text();
        toast.error(`Failed to reactivate subscription: ${error}`);
      }
    } catch (error) {
      console.error("Failed to reactivate subscription:", error);
      toast.error("Failed to reactivate subscription");
    } finally {
      setIsLoading(false);
    }
  };
  const filteredSubscriptions = subscriptions.filter((subscription) => {
    const matchesSearch =
      subscription.user.email
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ??
      subscription.user.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ??
      subscription.plan.displayName
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || subscription.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800";
      case "trialing":
        return "bg-blue-100 text-blue-800";
      case "canceled":
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "incomplete":
      case "past_due":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleViewDetails = (subscription: SubscriptionData) => {
    setSelectedSubscription(subscription);
    setIsDetailsDialogOpen(true);
  };

  // Calculate statistics
  const activeSubscriptions = subscriptions.filter(
    (s) => s.status === "active",
  ).length;
  const totalRevenue = subscriptions
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + s.plan.price, 0);
  const avgRevenuePerUser =
    activeSubscriptions > 0 ? totalRevenue / activeSubscriptions : 0;

  useEffect(() => {
    void fetchSubscriptions();
  }, []);
  // Skeleton components
  const StatisticsSkeleton = () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }, (_, index) => (
        <Card key={index}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-8 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const SubscriptionListSkeleton = () => (
    <Card className="flex flex-col gap-2">
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-48" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="flex flex-col items-start justify-between gap-2 border-b border-gray-200 pb-4 md:flex-row md:items-center"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-64" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="space-y-1 text-right">
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {" "}
      {/* Statistics Cards */}
      {isInitialLoading ? (
        <StatisticsSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Active Subscriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <div className="text-2xl font-bold">{activeSubscriptions}</div>
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
                  {formatAmount(totalRevenue)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Revenue/User
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="text-2xl font-bold">
                  {formatAmount(avgRevenuePerUser)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Filters */}
      <Card className="flex flex-col gap-2">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="search">Search Subscriptions</Label>{" "}
              <Input
                id="search"
                placeholder="Search by user, email, or plan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isInitialLoading || isLoading}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select
                value={filterStatus}
                onValueChange={setFilterStatus}
                disabled={isInitialLoading || isLoading}
              >
                <SelectTrigger className="h-full" id="status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                  <SelectItem value="trialing">Trialing</SelectItem>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>{" "}
      {/* Subscriptions List */}
      {isInitialLoading ? (
        <SubscriptionListSkeleton />
      ) : (
        <Card className="flex flex-col gap-2">
          <CardHeader>
            <CardTitle>
              Subscriptions ({filteredSubscriptions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredSubscriptions.map((subscription) => (
                <div
                  key={subscription.id}
                  className="flex justify-between gap-4 border-b border-gray-200 pb-4 items-center"
                >
                  <div className="flex w-full flex-col items-start justify-between gap-2 md:flex-row md:items-center">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="font-medium">
                            {subscription.user.name ?? subscription.user.email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {subscription.user.email}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge
                              className={getStatusColor(subscription.status)}
                            >
                              {subscription.status}
                            </Badge>{" "}
                            <span className="text-xs text-muted-foreground">
                              {subscription.plan.displayName} •
                              {formatAmount(subscription.plan.price)}/
                              {subscription.interval}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-sm font-medium">
                        {formatDate(subscription.currentPeriodStart)} -{" "}
                        {formatDate(subscription.currentPeriodEnd)}
                      </p>
                      {subscription.cancelAtPeriodEnd && (
                        <p className="text-xs text-red-600">
                          Cancels at period end
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(subscription)}
                      >
                        Details
                      </Button>

                      {subscription.status === "active" ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => cancelSubscription(subscription.id)}
                          disabled={isLoading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      ) : subscription.status === "canceled" ? (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() =>
                            reactivateSubscription(subscription.id)
                          }
                          disabled={isLoading}
                        >
                          Reactivate
                        </Button>
                      ) : null}
                    </div>
                  </div>{" "}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {/* Subscription Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Subscription Details</DialogTitle>
            <DialogDescription>
              Detailed information about the subscription.
            </DialogDescription>
          </DialogHeader>

          {selectedSubscription && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Customer</Label>
                  <p className="text-sm">
                    {selectedSubscription.user.name ??
                      selectedSubscription.user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedSubscription.user.email}
                  </p>
                </div>{" "}
                <div>
                  <Label>Plan</Label>
                  <p className="text-sm">
                    {selectedSubscription.plan.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatAmount(selectedSubscription.plan.price)}/
                    {selectedSubscription.interval}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    <Badge
                      className={getStatusColor(selectedSubscription.status)}
                    >
                      {selectedSubscription.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Billing Interval</Label>
                  <p className="text-sm capitalize">
                    {selectedSubscription.interval}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Current Period Start</Label>
                  <p className="text-sm">
                    {formatDate(selectedSubscription.currentPeriodStart)}
                  </p>
                </div>
                <div>
                  <Label>Current Period End</Label>
                  <p className="text-sm">
                    {formatDate(selectedSubscription.currentPeriodEnd)}
                  </p>
                </div>
              </div>

              {selectedSubscription.stripeSubscriptionId && (
                <div>
                  <Label>Stripe Subscription ID</Label>
                  <p className="font-mono text-sm">
                    {selectedSubscription.stripeSubscriptionId}
                  </p>
                </div>
              )}

              {selectedSubscription.cancelAtPeriodEnd && (
                <div className="rounded-md bg-red-50 p-3">
                  <p className="text-sm text-red-800">
                    This subscription is set to cancel at the end of the current
                    period.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDetailsDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
