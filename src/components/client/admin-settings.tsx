"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  const [subscriptionPlans, setSubscriptionPlans] = useState<
    SubscriptionPlan[]
  >([]);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newPlan, setNewPlan] = useState<Partial<SubscriptionPlan>>({
    name: "",
    displayName: "",
    description: "",
    credits: 0,
    price: 0,
    features: [""],
    isActive: true,
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
          features: editingPlan.features.filter((f) => f.trim() !== ""),
        }),
      });

      if (response.ok) {
        toast.success("Subscription plan updated successfully");
        setIsEditDialogOpen(false);
        setEditingPlan(null);
        await fetchSubscriptionPlans();
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

  const deletePlan = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/plans/${planId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Plan deleted successfully");
        await fetchSubscriptionPlans();
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
    }).format(amount);
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan({ ...plan });
    setIsEditDialogOpen(true);
  };

  useEffect(() => {
    void fetchSubscriptionPlans();
  }, []);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="plans" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
          <TabsTrigger value="system">System Settings</TabsTrigger>
        </TabsList>

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
                      <h3 className="font-semibold">{plan.displayName}</h3>
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
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deletePlan(plan.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="mb-2 text-sm text-muted-foreground">
                      {plan.description}
                    </p>
                    <div className="mb-2 flex items-center gap-4">
                      <p className="font-medium">
                        {formatAmount(plan.price)} monthly
                      </p>
                      {plan.yearlyPrice && (
                        <p className="text-sm text-muted-foreground">
                          {formatAmount(plan.yearlyPrice)} yearly
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {plan.credits} credits
                      </p>
                    </div>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="plan-name">Plan Name</Label>
                    <Input
                      id="plan-name"
                      value={newPlan.name ?? ""}
                      onChange={(e) =>
                        setNewPlan({ ...newPlan, name: e.target.value })
                      }
                      placeholder="pro"
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
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="plan-description">Description</Label>
                  <Input
                    id="plan-description"
                    value={newPlan.description ?? ""}
                    onChange={(e) =>
                      setNewPlan({ ...newPlan, description: e.target.value })
                    }
                    placeholder="Advanced features for professionals"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="plan-credits">Credits</Label>
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
                    />
                  </div>
                </div>

                <div>
                  <Label>Features</Label>
                  {(newPlan.features ?? [""]).map((feature, index) => (
                    <div
                      key={index}
                      className="mt-2 flex items-center space-x-2"
                    >
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
                      />
                      {(newPlan.features?.length ?? 0) > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            removePlanFeature(newPlan, setNewPlan, index)
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
                    onClick={() => addPlanFeature(newPlan, setNewPlan)}
                    className="mt-2"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Feature
                  </Button>
                </div>

                <Button
                  onClick={createSubscriptionPlan}
                  disabled={isLoading || !newPlan.name || !newPlan.displayName}
                  className="w-full"
                >
                  Create Plan
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system">
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

              <div>
                <Label>Features</Label>
                {editingPlan.features.map((feature, index) => (
                  <div key={index} className="mt-2 flex items-center space-x-2">
                    <Input
                      value={feature}
                      onChange={(e) =>
                        updatePlanFeature(
                          editingPlan,
                          setEditingPlan,
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
                          removePlanFeature(editingPlan, setEditingPlan, index)
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
                  onClick={() => addPlanFeature(editingPlan, setEditingPlan)}
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
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
