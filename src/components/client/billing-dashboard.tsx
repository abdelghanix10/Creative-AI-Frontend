"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useSubscriptionManagement } from "~/hooks/use-subscription-management";
import { useUserSubscription } from "~/hooks/use-user-subscription";
import { Download, CreditCard, Calendar, DollarSign } from "lucide-react";
import { toast } from "react-hot-toast";
import { PaymentProcessor } from "./payment-processor";
import { CustomerPortal } from "./customer-portal";
import { SubscriptionUpgrade } from "./subscription-upgrade";
import { PaymentDunning } from "./payment-dunning";

interface BillingDashboardProps {
  userId: string;
}

export function BillingDashboard({ userId }: BillingDashboardProps) {
  const { subscription, currentTier } = useUserSubscription();
  const {
    isLoading,
    billingHistory,
    fetchBillingHistory,
    cancelUserSubscription,
    downloadInvoice,
  } = useSubscriptionManagement();

  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    if (userId) {
      void fetchBillingHistory(10);
    }
  }, [userId, fetchBillingHistory]);

  const handleCancelSubscription = async (immediately = false) => {
    const result = await cancelUserSubscription(immediately);
    if (result.success) {
      setShowCancelDialog(false);
    }
  };

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

  if (isLoading && !billingHistory) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Subscription Overview */}
      <Card>
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

          {subscription && currentTier !== "Free" && (
            <div className="mt-6 flex gap-4">
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(true)}
                disabled={isLoading}
              >
                Cancel Subscription
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs defaultValue="billing" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="billing">Billing History</TabsTrigger>
          <TabsTrigger value="payments">Payment Issues</TabsTrigger>
          <TabsTrigger value="upgrade">Manage Plan</TabsTrigger>
          <TabsTrigger value="portal">Customer Portal</TabsTrigger>
          <TabsTrigger value="retry">Retry Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="billing" className="space-y-6">
          {/* Recent Invoices */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {billingHistory?.invoices.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No invoices found
                </p>
              ) : (
                <div className="space-y-4">
                  {billingHistory?.invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between border-b border-gray-200 pb-4"
                    >
                      {" "}
                      <div>
                        <p className="font-medium">
                          {invoice.description ?? "Subscription Payment"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(invoice.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium">
                            {formatAmount(invoice.amount)}
                          </p>
                          <Badge className={getStatusColor(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </div>
                        {invoice.invoiceUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadInvoice(invoice.invoiceUrl!)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {billingHistory?.payments.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No payments found
                </p>
              ) : (
                <div className="space-y-4">
                  {billingHistory?.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between border-b border-gray-200 pb-4"
                    >
                      {" "}
                      <div>
                        <p className="font-medium">
                          {payment.description ?? "Payment"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(payment.createdAt)} •{" "}
                          {payment.paymentMethod ?? "Card"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatAmount(payment.amount)}
                        </p>
                        <Badge className={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <PaymentDunning userId={userId} />
        </TabsContent>

        <TabsContent value="upgrade">
          <SubscriptionUpgrade userId={userId} />
        </TabsContent>

        <TabsContent value="portal">
          <CustomerPortal />
        </TabsContent>

        <TabsContent value="retry">
          <PaymentProcessor userId={userId} />
        </TabsContent>
      </Tabs>

      {/* Cancel Subscription Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Cancel Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Are you sure you want to cancel your subscription? You can
                choose to cancel immediately or at the end of your current
                billing period.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCancelDialog(false)}
                  disabled={isLoading}
                >
                  Keep Subscription
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleCancelSubscription(false)}
                  disabled={isLoading}
                >
                  Cancel at Period End
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleCancelSubscription(true)}
                  disabled={isLoading}
                >
                  Cancel Immediately
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
