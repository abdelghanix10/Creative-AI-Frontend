"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { toast } from "react-hot-toast";
import { RefreshCw, Plus, Edit, Trash2 } from "lucide-react";

interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  credits: number;
  price: number;
  yearlyPrice?: number;
  features: string[];
  isActive: boolean;
  stripePriceId?: string;
  stripeYearlyPriceId?: string;
}

export function AdminSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [subscriptionPlans, setSubscriptionPlans] = useState<
    SubscriptionPlan[]
  >([]);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState<SubscriptionPlan | null>(
    null,
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newPlan, setNewPlan] = useState<Partial<SubscriptionPlan>>({
    name: "",
    displayName: "",
    description: "",
    credits: 0,
    price: 0,
    features: [""],
    isActive: true,
  });
  const fetchSubscriptionPlans = async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      const response = await fetch("/api/admin/plans");
      if (response.ok) {
        const data = (await response.json()) as { plans: SubscriptionPlan[] };

        if (data.plans && data.plans.length > 0) {
          data.plans.forEach((plan, index) => {
            console.log(`Plan ${index + 1}:`, {
              id: plan.id,
              name: plan.name,
              displayName: plan.displayName,
              description: plan.description,
              credits: plan.credits,
              price: plan.price,
              yearlyPrice: plan.yearlyPrice,
              isActive: plan.isActive,
              features: plan.features,
              rawTypes: {
                isActive: typeof plan.isActive,
                credits: typeof plan.credits,
                price: typeof plan.price,
                yearlyPrice: typeof plan.yearlyPrice,
              },
            });
          });
        }

        // Normalize the data to ensure proper types and handle missing fields
        const normalizedPlans = data.plans.map((plan) => ({
          ...plan,
          isActive: Boolean(plan.isActive),
          displayName: plan.displayName ?? plan.name ?? "Unnamed Plan",
          description: plan.description ?? "",
          credits: Number(plan.credits) || 0,
          price: Number(plan.price) || 0,
          yearlyPrice: plan.yearlyPrice ? Number(plan.yearlyPrice) : undefined,
          features: Array.isArray(plan.features)
            ? plan.features.filter((f) => f?.trim())
            : [],
        }));

        setSubscriptionPlans(normalizedPlans);
      }
    } catch (error) {
      console.error("Failed to fetch subscription plans:", error);
      toast.error("Failed to load subscription plans");
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
      setIsInitialLoading(false);
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
        await fetchSubscriptionPlans(false);
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
          price: toCents(newPlan.price ?? 0),
          yearlyPrice: newPlan.yearlyPrice
            ? toCents(newPlan.yearlyPrice)
            : undefined,
          features: newPlan.features?.filter((f) => f.trim() !== "") ?? [],
        }),
      });

      if (response.ok) {
        toast.success("Subscription plan created successfully");
        setNewPlan({
          name: "",
          displayName: "",
          description: "",
          credits: 0,
          price: 0,
          features: [""],
          isActive: true,
        });
        await fetchSubscriptionPlans(false);
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

  const updateSubscriptionPlan = async () => {
    if (!editingPlan) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/plans/${editingPlan.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editingPlan,
          price: toCents(editingPlan.price),
          yearlyPrice: editingPlan.yearlyPrice
            ? toCents(editingPlan.yearlyPrice)
            : undefined,
          features: editingPlan.features.filter((f) => f.trim() !== ""),
        }),
      });

      if (response.ok) {
        toast.success("Subscription plan updated successfully");
        setIsEditDialogOpen(false);
        setEditingPlan(null);
        await fetchSubscriptionPlans(false);
      } else {
        const error = await response.text();
        toast.error(`Failed to update plan: ${error}`);
      }
    } catch (error) {
      console.error("Failed to update plan:", error);
      toast.error("Failed to update subscription plan");
    } finally {
      setIsLoading(false);
    }
  };
  const handleDeletePlan = (plan: SubscriptionPlan) => {
    setDeletingPlan(plan);
    setIsDeleteDialogOpen(true);
  };

  const deletePlan = async () => {
    if (!deletingPlan) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/plans/${deletingPlan.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success("Plan deleted successfully");
        await fetchSubscriptionPlans(false);
        setIsDeleteDialogOpen(false);
        setDeletingPlan(null);
      } else {
        const error = await response.text();
        toast.error(`Failed to delete plan: ${error}`);
      }
    } catch (error) {
      console.error("Failed to delete plan:", error);
      toast.error("Failed to delete plan");
    } finally {
      setIsLoading(false);
    }
  };

  const updatePlanFeature = (
    plan: Partial<SubscriptionPlan>,
    setPlan: (plan: Partial<SubscriptionPlan>) => void,
    index: number,
    value: string,
  ) => {
    const newFeatures = [...(plan.features ?? [])];
    newFeatures[index] = value;
    setPlan({ ...plan, features: newFeatures });
  };

  const addPlanFeature = (
    plan: Partial<SubscriptionPlan>,
    setPlan: (plan: Partial<SubscriptionPlan>) => void,
  ) => {
    setPlan({ ...plan, features: [...(plan.features ?? []), ""] });
  };

  const removePlanFeature = (
    plan: Partial<SubscriptionPlan>,
    setPlan: (plan: Partial<SubscriptionPlan>) => void,
    index: number,
  ) => {
    const newFeatures = (plan.features ?? []).filter((_, i) => i !== index);
    setPlan({ ...plan, features: newFeatures });
  };
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100);
  };

  // Helper function to convert dollar amounts to cents for API
  const toCents = (dollarAmount: number) => {
    return Math.round(dollarAmount * 100);
  };

  // Helper function to convert cents to dollars for forms
  const toDollars = (centAmount: number) => {
    return centAmount / 100;
  };
  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan({
      ...plan,
      price: toDollars(plan.price),
      yearlyPrice: plan.yearlyPrice ? toDollars(plan.yearlyPrice) : undefined,
    });
    setIsEditDialogOpen(true);
  };
  useEffect(() => {
    void fetchSubscriptionPlans();
  }, []);

  // Skeleton components
  const PlansListSkeleton = () => (
    <Card className="flex flex-col gap-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-32" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="rounded-lg border border-gray-200 p-4">
            <div className="mb-2 flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
            <Skeleton className="mb-2 h-4 w-64" />
            <div className="mb-2 flex items-center gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="plans" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
          <TabsTrigger value="system">System Settings</TabsTrigger>
        </TabsList>{" "}
        <TabsContent value="plans" className="p-2 py-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Existing Plans */}
            {isInitialLoading ? (
              <PlansListSkeleton />
            ) : (
              <Card className="flex flex-col gap-2">
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
                </CardHeader>{" "}
                <CardContent className="space-y-4">
                  {subscriptionPlans.map((plan) => {
                    return (
                      <div
                        key={plan.id}
                        className="rounded-lg border border-gray-200 p-4"
                      >
                        {" "}
                        <div className="mb-2 flex items-center justify-between">
                          <h3 className="text-xl font-bold">
                            {plan.displayName || plan.name || "Unnamed Plan"}
                          </h3>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={plan.isActive ? "default" : "secondary"}
                            >
                              {plan.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPlan(plan)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>{" "}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeletePlan(plan)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="mb-2 text-sm text-muted-foreground">
                          {plan.description}
                        </p>{" "}
                        <div className="mb-2 flex items-center gap-4">
                          <p className="font-medium">
                            {formatAmount(plan.price || 0)}/monthly
                          </p>
                          {plan.yearlyPrice && plan.yearlyPrice > 0 && (
                            <p className="text-sm text-muted-foreground">
                              {formatAmount(plan.yearlyPrice)}/yearly
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {plan.credits || 0} credits
                          </p>
                        </div>{" "}
                        <div className="mt-2">
                          <p className="text-sm font-medium">Features:</p>
                          <ul className="list-inside list-disc text-sm text-muted-foreground">
                            {plan.features && plan.features.length > 0 ? (
                              plan.features.map((feature, index) => (
                                <li key={index}>{feature}</li>
                              ))
                            ) : (
                              <li className="text-gray-400">
                                No features listed
                              </li>
                            )}{" "}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Create New Plan */}
            <Card className="flex flex-col gap-2">
              <CardHeader>
                <CardTitle>Create New Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="plan-name">Plan Name</Label>{" "}
                    <Input
                      id="plan-name"
                      value={newPlan.name ?? ""}
                      onChange={(e) =>
                        setNewPlan({ ...newPlan, name: e.target.value })
                      }
                      placeholder="Pro"
                      disabled={isInitialLoading || isLoading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="plan-display-name">Display Name</Label>
                    <Input
                      id="plan-display-name"
                      value={newPlan.displayName ?? ""}
                      onChange={(e) =>
                        setNewPlan({ ...newPlan, displayName: e.target.value })
                      }
                      placeholder="Pro Plan"
                      disabled={isInitialLoading || isLoading}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="plan-description">Description</Label>{" "}
                  <Input
                    id="plan-description"
                    value={newPlan.description ?? ""}
                    onChange={(e) =>
                      setNewPlan({ ...newPlan, description: e.target.value })
                    }
                    placeholder="Advanced features for professionals"
                    disabled={isInitialLoading || isLoading}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="plan-credits">Credits</Label>{" "}
                    <Input
                      id="plan-credits"
                      type="number"
                      value={newPlan.credits ?? 0}
                      onChange={(e) =>
                        setNewPlan({
                          ...newPlan,
                          credits: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="1000"
                      disabled={isInitialLoading || isLoading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="plan-price">Monthly Price</Label>
                    <Input
                      id="plan-price"
                      type="number"
                      step="0.01"
                      value={newPlan.price ?? 0}
                      onChange={(e) =>
                        setNewPlan({
                          ...newPlan,
                          price: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="29.99"
                      disabled={isInitialLoading || isLoading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="plan-yearly-price">Yearly Price</Label>
                    <Input
                      id="plan-yearly-price"
                      type="number"
                      step="0.01"
                      value={newPlan.yearlyPrice ?? 0}
                      onChange={(e) =>
                        setNewPlan({
                          ...newPlan,
                          yearlyPrice: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="299.99"
                      disabled={isInitialLoading || isLoading}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="new-plan-active"
                    checked={newPlan.isActive ?? true}
                    onCheckedChange={(checked: boolean) =>
                      setNewPlan({ ...newPlan, isActive: checked })
                    }
                    disabled={isInitialLoading || isLoading}
                  />
                  <Label htmlFor="new-plan-active">Plan Active</Label>
                </div>

                <div>
                  <Label>Features</Label>
                  {(newPlan.features ?? [""]).map((feature, index) => (
                    <div
                      key={index}
                      className="mt-2 flex items-center space-x-2"
                    >
                      {" "}
                      <Input
                        value={feature}
                        onChange={(e) =>
                          updatePlanFeature(
                            newPlan,
                            setNewPlan,
                            index,
                            e.target.value,
                          )
                        }
                        placeholder="Feature description"
                        disabled={isInitialLoading || isLoading}
                      />
                      {(newPlan.features?.length ?? 0) > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            removePlanFeature(newPlan, setNewPlan, index)
                          }
                          disabled={isInitialLoading || isLoading}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}{" "}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addPlanFeature(newPlan, setNewPlan)}
                    className="mt-2"
                    disabled={isInitialLoading || isLoading}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Feature
                  </Button>
                </div>

                <Button
                  onClick={createSubscriptionPlan}
                  disabled={
                    isInitialLoading ||
                    isLoading ||
                    !newPlan.name ||
                    !newPlan.displayName
                  }
                  className="w-full"
                >
                  Create Plan
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent className="p-2 py-4" value="system">
          <Card className="flex flex-col gap-2">
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
                </div>{" "}
                <Button
                  onClick={syncPlansWithStripe}
                  disabled={isInitialLoading || isLoading}
                >
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

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Database Status</h3>
                  <p className="text-sm text-muted-foreground">
                    Current database connection status
                  </p>
                </div>
                <Badge variant="default">Connected</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Plan Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Subscription Plan</DialogTitle>
            <DialogDescription>
              Update the subscription plan details.
            </DialogDescription>
          </DialogHeader>

          {editingPlan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-plan-name">Plan Name</Label>
                  <Input
                    id="edit-plan-name"
                    value={editingPlan.name}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-plan-display-name">Display Name</Label>
                  <Input
                    id="edit-plan-display-name"
                    value={editingPlan.displayName}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        displayName: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-plan-description">Description</Label>
                <Input
                  id="edit-plan-description"
                  value={editingPlan.description ?? ""}
                  onChange={(e) =>
                    setEditingPlan({
                      ...editingPlan,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit-plan-credits">Credits</Label>
                  <Input
                    id="edit-plan-credits"
                    type="number"
                    value={editingPlan.credits}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        credits: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-plan-price">Monthly Price</Label>
                  <Input
                    id="edit-plan-price"
                    type="number"
                    step="0.01"
                    value={editingPlan.price}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-plan-yearly-price">Yearly Price</Label>
                  <Input
                    id="edit-plan-yearly-price"
                    type="number"
                    step="0.01"
                    value={editingPlan.yearlyPrice ?? 0}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        yearlyPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-plan-active"
                  checked={editingPlan.isActive}
                  onCheckedChange={(checked: boolean) =>
                    setEditingPlan({ ...editingPlan, isActive: checked })
                  }
                />
                <Label htmlFor="edit-plan-active">Plan Active</Label>
              </div>

              <div>
                <Label>Features</Label>
                {editingPlan.features.map((feature, index) => (
                  <div key={index} className="mt-2 flex items-center space-x-2">
                    <Input
                      value={feature}
                      onChange={(e) =>
                        updatePlanFeature(
                          editingPlan,
                          (plan) => setEditingPlan(plan as SubscriptionPlan),
                          index,
                          e.target.value,
                        )
                      }
                    />
                    {editingPlan.features.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          removePlanFeature(
                            editingPlan,
                            (plan) => setEditingPlan(plan as SubscriptionPlan),
                            index,
                          )
                        }
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    addPlanFeature(editingPlan, (plan) =>
                      setEditingPlan(plan as SubscriptionPlan),
                    )
                  }
                  className="mt-2"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Feature
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={updateSubscriptionPlan} disabled={isLoading}>
              Save Changes
            </Button>{" "}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Plan Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Plan</DialogTitle>{" "}
            <DialogDescription>
              Are you sure you want to delete the &ldquo;
              {deletingPlan?.displayName ?? deletingPlan?.name}&rdquo; plan?
              This action cannot be undone and will affect any users currently
              subscribed to this plan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingPlan(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deletePlan}
              disabled={isLoading}
            >
              Delete Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
