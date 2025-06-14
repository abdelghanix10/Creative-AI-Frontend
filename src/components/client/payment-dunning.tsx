"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { AlertTriangle, CreditCard, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "~/hooks/use-toast";

interface PaymentDunningProps {
  userId: string;
}

interface FailedPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description?: string;
  createdAt: string;
  invoice?: {
    id: string;
    invoiceUrl?: string;
    dueDate?: string;
  };
}

interface PaymentIssue {
  type: "overdue" | "failed" | "requires_action";
  message: string;
  actionRequired?: boolean;
  retryUrl?: string;
}

export function PaymentDunning({ userId }: PaymentDunningProps) {
  const [failedPayments, setFailedPayments] = useState<FailedPayment[]>([]);
  const [paymentIssues, setPaymentIssues] = useState<PaymentIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [retryingPayment, setRetryingPayment] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPaymentIssues();
  }, []);

  const fetchPaymentIssues = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/billing/payment-issues");
      if (!response.ok) throw new Error("Failed to fetch payment issues");

      const data = await response.json();
      setFailedPayments(data.failedPayments || []);
      setPaymentIssues(data.issues || []);
    } catch (error) {
      console.error("Error fetching payment issues:", error);
      toast({
        title: "Error",
        description: "Failed to load payment information",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const retryPayment = async (paymentId: string) => {
    setRetryingPayment(paymentId);
    try {
      const response = await fetch("/api/billing/retry-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentId }),
      });

      if (!response.ok) throw new Error("Failed to retry payment");

      const data = await response.json();

      if (data.url) {
        // Redirect to Stripe for payment
        window.location.href = data.url;
      } else {
        toast({
          title: "Success",
          description: "Payment processed successfully",
        });
        fetchPaymentIssues();
      }
    } catch (error) {
      console.error("Error retrying payment:", error);
      toast({
        title: "Error",
        description: "Failed to retry payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRetryingPayment(null);
    }
  };

  const updatePaymentMethod = async () => {
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to open payment portal");

      const data = await response.json();
      window.open(data.url, "_blank");
    } catch (error) {
      console.error("Error opening payment portal:", error);
      toast({
        title: "Error",
        description: "Failed to open payment portal",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const hasIssues = paymentIssues.length > 0 || failedPayments.length > 0;

  if (!hasIssues) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-green-600">Payment Status: Good</CardTitle>
          <CardDescription>
            All payments are up to date. No action required.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Issues Alert */}
      {paymentIssues.map((issue, index) => (
        <Alert key={index} variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>{issue.message}</span>
              {issue.actionRequired && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={updatePaymentMethod}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Update Payment Method
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      ))}

      {/* Failed Payments */}
      {failedPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Failed Payments
            </CardTitle>
            <CardDescription>
              The following payments need your attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {failedPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        ${payment.amount.toFixed(2)}
                        {payment.currency.toUpperCase()}
                      </span>
                      <Badge variant="destructive">
                        {payment.status.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    </div>
                    {payment.description && (
                      <p className="text-sm text-muted-foreground">
                        {payment.description}
                      </p>
                    )}
                    {payment.invoice?.dueDate && (
                      <p className="text-sm text-muted-foreground">
                        Due:
                        {new Date(payment.invoice.dueDate).toLocaleDateString()}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Failed on
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {payment.invoice?.invoiceUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(payment.invoice!.invoiceUrl, "_blank")
                        }
                      >
                        View Invoice
                      </Button>
                    )}
                    <Button
                      size="sm"
                      disabled={retryingPayment === payment.id}
                      onClick={() => retryPayment(payment.id)}
                    >
                      {retryingPayment === payment.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Retrying...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Retry Payment
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-lg bg-muted p-4">
              <h4 className="mb-2 font-medium">Need help?</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Make sure your payment method has sufficient funds</li>
                <li>• Check if your card has expired or been replaced</li>
                <li>• Contact your bank if payments continue to fail</li>
                <li>• Update your billing address if it has changed</li>
              </ul>
              <Button
                variant="outline"
                className="mt-3"
                onClick={updatePaymentMethod}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Update Payment Method
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
