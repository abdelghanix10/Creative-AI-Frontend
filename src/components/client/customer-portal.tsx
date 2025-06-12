"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "~/hooks/use-toast";

export function CustomerPortal() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleOpenPortal = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to create portal session");
      }

      const { url } = await response.json();
      window.open(url, "_blank");
    } catch (error) {
      console.error("Error opening customer portal:", error);
      toast({
        title: "Error",
        description: "Failed to open customer portal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          Stripe Customer Portal
        </CardTitle>
        <CardDescription>
          Manage your billing details, payment methods, and view your complete
          billing history
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>In the Stripe Customer Portal, you can:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Update your payment method</li>
              <li>Download invoices and receipts</li>
              <li>View detailed billing history</li>
              <li>Update billing address</li>
              <li>Cancel or modify your subscription</li>
            </ul>
          </div>

          <Button
            onClick={handleOpenPortal}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening Portal...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Customer Portal
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
