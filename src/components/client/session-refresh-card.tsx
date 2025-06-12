"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";

export function SessionRefreshCard() {
  const [loading, setLoading] = useState(false);
  const { data: session, update: updateSession } = useSession();

  const refreshSession = async () => {
    setLoading(true);
    try {
      // Trigger session refresh to get updated role from database
      await updateSession({});
      toast.success("Session refreshed successfully!");

      // Reload the page after a short delay to ensure the new session is used
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch {
      toast.error("Failed to refresh session");
    } finally {
      setLoading(false);
    }
  };

  // Check if there's a role mismatch (this would need to be passed as props or fetched)
  const needsRefresh = session?.user?.role !== "ADMIN";

  if (!needsRefresh) {
    return null; // Don't show if already admin
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-yellow-800">
          <AlertCircle className="h-5 w-5" />
          Session Update Required
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-yellow-700">
          Your admin privileges have been updated in the database, but your
          session needs to be refreshed to access admin features.
        </p>
        <Button
          onClick={refreshSession}
          disabled={loading}
          size="sm"
          className="bg-yellow-600 hover:bg-yellow-700"
        >
          {loading ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh Session
        </Button>
      </CardContent>
    </Card>
  );
}
