"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Users,
  CreditCard,
  RefreshCw,
  DollarSign,
  Activity,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { SubscriptionMetrics } from "./subscription-metrics";

interface AdminDashboardProps {
  userId: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  interval: "month" | "year";
  features: string[];
  stripePriceId?: string;
  active: boolean;
}

interface UserSubscriptionData {
  id: string;
  email: string;
  name?: string;
  subscriptionTier?: string;
  role?: string;
  subscription?: {
    id: string;
    status: string;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
    plan: string;
    price?: number;
  };
  createdAt: Date;
}

export function AdminDashboard({ userId: _userId }: AdminDashboardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<
    SubscriptionPlan[]
  >([]);
  const [users, setUsers] = useState<UserSubscriptionData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [newPlan, setNewPlan] = useState({
    name: "",
    description: "",
    price: 0,
    interval: "month" as "month" | "year",
    features: [""],
    stripePriceId: "",
  });
  const fetchSubscriptionPlans = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/plans");
      if (response.ok) {
        const data = (await response.json()) as { plans: SubscriptionPlan[] };
        setSubscriptionPlans(data.plans);
      }
    } catch (error) {
      console.error("Failed to fetch subscription plans:", error);
      toast.error("Failed to load subscription plans");
    } finally {
      setIsLoading(false);
    }
  };
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = (await response.json()) as {
          users: UserSubscriptionData[];
        };
        console.log("Fetched users data:", data.users); // Debug log
        setUsers(data.users);
      } else {
        console.error(
          "Failed to fetch users - Response not OK:",
          response.status,
        );
        toast.error("Failed to load users");
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  const syncPlansWithStripe = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/sync-plans", {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Plans synced with Stripe successfully");
        await fetchSubscriptionPlans();
      } else {
        const error = await response.text();
        toast.error(`Failed to sync plans: ${error}`);
      }
    } catch (error) {
      console.error("Failed to sync plans:", error);
      toast.error("Failed to sync plans with Stripe");
    } finally {
      setIsLoading(false);
    }
  };

  const createSubscriptionPlan = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newPlan,
          features: newPlan.features.filter((f) => f.trim() !== ""),
        }),
      });

      if (response.ok) {
        toast.success("Subscription plan created successfully");
        setNewPlan({
          name: "",
          description: "",
          price: 0,
          interval: "month",
          features: [""],
          stripePriceId: "",
        });
        await fetchSubscriptionPlans();
      } else {
        const error = await response.text();
        toast.error(`Failed to create plan: ${error}`);
      }
    } catch (error) {
      console.error("Failed to create plan:", error);
      toast.error("Failed to create subscription plan");
    } finally {
      setIsLoading(false);
    }
  };

  const cancelUserSubscription = async (subscriptionId: string) => {
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
        await fetchUsers();
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

  const updatePlanFeature = (index: number, value: string) => {
    const newFeatures = [...newPlan.features];
    newFeatures[index] = value;
    setNewPlan({ ...newPlan, features: newFeatures });
  };

  const addPlanFeature = () => {
    setNewPlan({ ...newPlan, features: [...newPlan.features, ""] });
  };

  const removePlanFeature = (index: number) => {
    const newFeatures = newPlan.features.filter((_, i) => i !== index);
    setNewPlan({ ...newPlan, features: newFeatures });
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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

  useEffect(() => {
    void fetchSubscriptionPlans();
    void fetchUsers();
  }, []);

  if (isLoading && subscriptionPlans.length === 0) {
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
              <div className="text-2xl font-bold">{users.length}</div>
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
                {
                  users.filter((u) => u.subscription?.status === "active")
                    .length
                }
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
                {formatAmount(
                  users
                    .filter((u) => u.subscription?.status === "active")
                    .reduce((sum, u) => {
                      const plan = subscriptionPlans.find(
                        (p) => p.name === u.subscription?.plan,
                      );
                      return (
                        sum +
                        (plan?.interval === "month"
                          ? plan.price
                          : (plan?.price ?? 0) / 12)
                      );
                    }, 0) / 100,
                )}
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
              <div className="text-2xl font-bold">
                {subscriptionPlans.length}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
          <TabsTrigger value="metrics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between border-b border-gray-200 pb-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="font-medium">
                            {user.name ?? user.email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Joined {formatDate(user.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>{" "}
                    <div className="flex items-center space-x-4">
                      <div className="space-y-1 text-right">
                        {user.subscription ? (
                          <>
                            <div className="flex items-center gap-2">
                              <Badge
                                className={getStatusColor(
                                  user.subscription.status,
                                )}
                              >
                                {user.subscription.status}
                              </Badge>
                              {user.role === "ADMIN" && (
                                <Badge variant="destructive">ADMIN</Badge>
                              )}
                            </div>{" "}
                            <p className="text-sm text-muted-foreground">
                              {user.subscription.plan ??
                                user.subscriptionTier ??
                                "Unknown Plan"}
                            </p>
                            {user.subscription.currentPeriodEnd && (
                              <p className="text-xs text-muted-foreground">
                                Until{" "}
                                {formatDate(user.subscription.currentPeriodEnd)}
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              {" "}
                              <Badge variant="secondary">
                                {user.subscriptionTier ?? "Free"}
                              </Badge>
                              {user.role === "ADMIN" && (
                                <Badge variant="destructive">ADMIN</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              No active subscription
                            </p>
                          </>
                        )}
                      </div>

                      {user.subscription &&
                        user.subscription.status === "active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              cancelUserSubscription(user.subscription!.id)
                            }
                            disabled={isLoading}
                          >
                            Cancel
                          </Button>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="plans" className="space-y-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Existing Plans */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Subscription Plans</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={syncPlansWithStripe}
                    disabled={isLoading}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync with Stripe
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {subscriptionPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-semibold">{plan.name}</h3>
                      <Badge variant={plan.active ? "default" : "secondary"}>
                        {plan.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="mb-2 text-sm text-muted-foreground">
                      {plan.description}
                    </p>
                    <p className="font-medium">
                      {formatAmount(plan.price / 100)} per {plan.interval}
                    </p>
                    <div className="mt-2">
                      <p className="text-sm font-medium">Features:</p>
                      <ul className="list-inside list-disc text-sm text-muted-foreground">
                        {plan.features.map((feature, index) => (
                          <li key={index}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Create New Plan */}
            <Card>
              <CardHeader>
                <CardTitle>Create New Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="plan-name">Plan Name</Label>
                  <Input
                    id="plan-name"
                    value={newPlan.name}
                    onChange={(e) =>
                      setNewPlan({ ...newPlan, name: e.target.value })
                    }
                    placeholder="Pro Plan"
                  />
                </div>

                <div>
                  <Label htmlFor="plan-description">Description</Label>
                  <Input
                    id="plan-description"
                    value={newPlan.description}
                    onChange={(e) =>
                      setNewPlan({ ...newPlan, description: e.target.value })
                    }
                    placeholder="Advanced features for professionals"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="plan-price">Price (cents)</Label>
                    <Input
                      id="plan-price"
                      type="number"
                      value={newPlan.price}
                      onChange={(e) =>
                        setNewPlan({
                          ...newPlan,
                          price: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="2999"
                    />
                  </div>
                  <div>
                    <Label htmlFor="plan-interval">Interval</Label>
                    <select
                      id="plan-interval"
                      value={newPlan.interval}
                      onChange={(e) =>
                        setNewPlan({
                          ...newPlan,
                          interval: e.target.value as "month" | "year",
                        })
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="month">Monthly</option>
                      <option value="year">Yearly</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="stripe-price-id">Stripe Price ID</Label>
                  <Input
                    id="stripe-price-id"
                    value={newPlan.stripePriceId}
                    onChange={(e) =>
                      setNewPlan({ ...newPlan, stripePriceId: e.target.value })
                    }
                    placeholder="price_xxx"
                  />
                </div>

                <div>
                  <Label>Features</Label>
                  {newPlan.features.map((feature, index) => (
                    <div
                      key={index}
                      className="mt-2 flex items-center space-x-2"
                    >
                      <Input
                        value={feature}
                        onChange={(e) =>
                          updatePlanFeature(index, e.target.value)
                        }
                        placeholder="Feature description"
                      />
                      {newPlan.features.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removePlanFeature(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addPlanFeature}
                    className="mt-2"
                  >
                    Add Feature
                  </Button>
                </div>

                <Button
                  onClick={createSubscriptionPlan}
                  disabled={isLoading || !newPlan.name || !newPlan.price}
                  className="w-full"
                >
                  Create Plan
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>{" "}
        <TabsContent value="metrics">
          <SubscriptionMetrics isAdmin={true} />
        </TabsContent>
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Sync Subscription Plans</h3>
                  <p className="text-sm text-muted-foreground">
                    Synchronize plans with Stripe to ensure consistency
                  </p>
                </div>
                <Button onClick={syncPlansWithStripe} disabled={isLoading}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Now
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Webhook Status</h3>
                  <p className="text-sm text-muted-foreground">
                    Check if Stripe webhooks are properly configured
                  </p>
                </div>
                <Badge variant="default">Active</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Email Notifications</h3>
                  <p className="text-sm text-muted-foreground">
                    Automated billing emails to customers
                  </p>
                </div>
                <Badge variant="default">Enabled</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
