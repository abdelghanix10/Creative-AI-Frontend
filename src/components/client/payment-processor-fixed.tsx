"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  CreditCard,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "react-hot-toast";

interface PaymentProcessorProps {
  paymentIntentId?: string;
  invoiceId?: string;
  amount?: number;
  currency?: string;
  onPaymentSuccess?: () => void;
  onPaymentFailure?: (error: string) => void;
}

interface PaymentStatusResponse {
  status: "idle" | "processing" | "succeeded" | "failed" | "requires_action";
  error?: string;
}

interface PaymentRetryResponse {
  url?: string;
  status?: "idle" | "processing" | "succeeded" | "failed" | "requires_action";
}

export function PaymentProcessor({
  paymentIntentId,
  invoiceId,
  amount,
  currency = "USD",
  onPaymentSuccess,
  onPaymentFailure,
}: PaymentProcessorProps) {
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "succeeded" | "failed" | "requires_action"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const maxRetries = 3;

  const checkPaymentStatus = useCallback(async () => {
    if (!paymentIntentId) return;

    try {
      setPaymentStatus("processing");

      // Simulate API call to check payment status
      const response = await fetch(`/api/payments/${paymentIntentId}/status`);

      if (!response.ok) {
        throw new Error("Failed to check payment status");
      }

      const { status, error: paymentError } =
        (await response.json()) as PaymentStatusResponse;

      setPaymentStatus(status);

      if (status === "succeeded") {
        setError(null);
        onPaymentSuccess?.();
        toast.success("Payment completed successfully!");
      } else if (status === "failed") {
        const errorMessage = paymentError ?? "Payment failed";
        setError(errorMessage);
        onPaymentFailure?.(errorMessage);
        toast.error(`Payment failed: ${errorMessage}`);
      } else if (status === "requires_action") {
        setError("Additional authentication required");
        toast("Additional authentication required for this payment", {
          icon: "⚠️",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setPaymentStatus("failed");
      onPaymentFailure?.(errorMessage);
      toast.error(`Error checking payment: ${errorMessage}`);
    }
  }, [paymentIntentId, onPaymentSuccess, onPaymentFailure]);

  useEffect(() => {
    if (paymentIntentId) {
      void checkPaymentStatus();
    }
  }, [paymentIntentId, checkPaymentStatus]);

  const retryPayment = async () => {
    if (retryCount >= maxRetries) {
      toast.error("Maximum retry attempts reached");
      return;
    }

    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);

    try {
      const response = await fetch("/api/payments/retry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentIntentId,
          invoiceId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to retry payment");
      }

      const { url, status } = (await response.json()) as PaymentRetryResponse;

      if (url) {
        // Redirect to payment page
        window.location.href = url;
      } else if (status) {
        setPaymentStatus(status);
      }

      toast.success("Payment retry initiated");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Retry failed";
      setError(errorMessage);
      toast.error(`Retry failed: ${errorMessage}`);
    } finally {
      setIsRetrying(false);
    }
  };

  const openPaymentPage = () => {
    if (invoiceId) {
      // Open Stripe-hosted payment page
      const paymentUrl = `https://billing.stripe.com/p/login/test_${invoiceId}`;
      window.open(paymentUrl, "_blank", "noopener,noreferrer");
    }
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case "processing":
        return <Clock className="h-5 w-5 animate-spin text-blue-500" />;
      case "succeeded":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "requires_action":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <CreditCard className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (paymentStatus) {
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "succeeded":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "requires_action":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatAmount = (amountInCents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amountInCents / 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Payment Processing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {amount && (
          <div className="flex items-center justify-between">
            <span className="font-medium">Amount:</span>
            <span className="text-lg font-bold">{formatAmount(amount)}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="font-medium">Status:</span>
          <Badge className={getStatusColor()}>
            {paymentStatus.replace("_", " ").toUpperCase()}
          </Badge>
        </div>

        {paymentIntentId && (
          <div className="flex items-center justify-between">
            <span className="font-medium">Payment ID:</span>
            <span className="font-mono text-sm text-muted-foreground">
              {paymentIntentId.slice(0, 20)}...
            </span>
          </div>
        )}

        {error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {paymentStatus === "failed" && retryCount < maxRetries && (
          <div className="space-y-2">
            <Button
              onClick={retryPayment}
              disabled={isRetrying}
              className="w-full"
              variant="outline"
            >
              {isRetrying ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Retry Payment ({retryCount}/{maxRetries})
            </Button>

            {invoiceId && (
              <Button
                onClick={openPaymentPage}
                className="w-full"
                variant="default"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Payment Page
              </Button>
            )}
          </div>
        )}

        {paymentStatus === "requires_action" && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your payment requires additional authentication. Please complete
              the verification process to continue.
            </AlertDescription>
          </Alert>
        )}

        {paymentStatus === "processing" && (
          <div className="flex items-center justify-center py-4">
            <div className="text-center">
              <div className="animate-pulse text-sm text-muted-foreground">
                Processing your payment...
              </div>
            </div>
          </div>
        )}

        {paymentStatus === "succeeded" && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Payment completed successfully! Your subscription is now active.
            </AlertDescription>
          </Alert>
        )}

        <div className="border-t pt-4">
          <Button
            onClick={() => void checkPaymentStatus()}
            variant="outline"
            size="sm"
            className="w-full"
            disabled={paymentStatus === "processing"}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Check Status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Component for handling failed payments and recovery
export function PaymentRecovery({
  failedPayments = [],
  onRetryPayment,
}: {
  failedPayments: Array<{
    id: string;
    amount: number;
    description: string;
    failedAt: Date;
    invoiceUrl?: string;
  }>;
  onRetryPayment?: (paymentId: string) => void;
}) {
  if (failedPayments.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          Failed Payments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {failedPayments.map((payment) => (
            <div key={payment.id} className="rounded-lg border bg-red-50 p-4">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <p className="font-medium">{payment.description}</p>
                  <p className="text-sm text-muted-foreground">
                    Failed on {new Date(payment.failedAt).toLocaleDateString()}
                  </p>
                </div>
                <p className="font-bold text-red-600">
                  ${(payment.amount / 100).toFixed(2)}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onRetryPayment?.(payment.id)}
                  variant="outline"
                >
                  Retry Payment
                </Button>
                {payment.invoiceUrl && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(payment.invoiceUrl, "_blank")}
                  >
                    View Invoice
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
