"use client";

import { useSession, signOut } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { AlertTriangle, CheckCircle, RefreshCw, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

export default function SessionFixPage() {
  const { data: session, status, update } = useSession();
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    inSync: boolean;
    dbRole: string | null;
    sessionRole: string | null;
    message: string;
  } | null>(null);

  const checkSyncStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/debug/session-sync", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setSyncStatus({
          inSync: !data.sessionUpdateRequired,
          dbRole: data.user.role,
          sessionRole: data.user.sessionRole,
          message: data.message,
        });

        if (data.sessionUpdateRequired) {
          toast.error("⚠️ Session out of sync!");
        } else {
          toast.success("✅ Session is synchronized");
        }
      } else {
        toast.error("Failed to check sync status");
      }
    } catch (error) {
      toast.error("Error checking sync status");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const forceSessionRefresh = async () => {
    setLoading(true);
    try {
      // First, check database role
      const response = await fetch("/api/debug/user");
      if (!response.ok) {
        throw new Error("Failed to get user data");
      }

      const userData = await response.json();

      // Update session with correct role
      await update({
        user: {
          ...session?.user,
          role: userData.role,
        },
      });

      toast.success("🔄 Session refreshed with database role!");

      // Check sync status again
      setTimeout(checkSyncStatus, 1000);
    } catch (error) {
      toast.error("Failed to refresh session");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const testAdminEndpoint = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/metrics");
      if (response.ok) {
        toast.success("✅ Admin access working!");
        // Redirect to admin dashboard
        setTimeout(() => {
          window.location.href = "/admin";
        }, 1500);
      } else if (response.status === 403) {
        toast.error("❌ Still no admin access - try force refresh");
      } else {
        toast.error("❌ Authentication error");
      }
    } catch (error) {
      toast.error("Error testing admin access");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const hardReset = async () => {
    toast.loading("Signing out and redirecting...");
    await signOut({
      callbackUrl:
        "/app/sign-in?message=Please sign in again to refresh your session",
    });
  };

  // Auto-check sync status on load
  useEffect(() => {
    if (status === "authenticated") {
      checkSyncStatus();
    }
  }, [status]);

  if (status === "loading") {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <div className="text-center">Loading session...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p>You need to be signed in to use this tool.</p>
            <Button
              onClick={() => (window.location.href = "/app/sign-in")}
              className="mt-4"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">
          Fix Admin Session
        </h1>
        <p className="text-muted-foreground">
          Resolve session synchronization issues for admin access
        </p>
      </div>

      <div className="space-y-6">
        {/* Sync Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {syncStatus?.inSync ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}
              Session Sync Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {syncStatus ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Database Role:</span>
                  <span className="rounded bg-gray-100 px-2 py-1 font-mono">
                    {syncStatus.dbRole ?? "null"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Session Role:</span>
                  <span className="rounded bg-gray-100 px-2 py-1 font-mono">
                    {syncStatus.sessionRole ?? "null"}
                  </span>
                </div>
                <div
                  className={`rounded p-3 text-sm ${
                    syncStatus.inSync
                      ? "border border-green-200 bg-green-50 text-green-800"
                      : "border border-yellow-200 bg-yellow-50 text-yellow-800"
                  }`}
                >
                  {syncStatus.message}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Click check button to verify sync status
              </p>
            )}

            <Button
              onClick={checkSyncStatus}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {loading ? "Checking..." : "Check Sync Status"}
            </Button>
          </CardContent>
        </Card>

        {/* Fix Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Fix Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button
                onClick={forceSessionRefresh}
                disabled={loading}
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {loading ? "Refreshing..." : "Force Session Refresh"}
              </Button>

              <Button
                onClick={testAdminEndpoint}
                disabled={loading}
                variant="secondary"
                className="w-full"
              >
                {loading ? "Testing..." : "Test Admin Access"}
              </Button>

              <Button
                onClick={hardReset}
                disabled={loading}
                variant="destructive"
                className="w-full"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Hard Reset (Sign Out & In)
              </Button>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                <strong>Force Session Refresh:</strong> Updates your session
                with current database role
              </p>
              <p>
                <strong>Test Admin Access:</strong> Verifies you can access
                admin endpoints
              </p>
              <p>
                <strong>Hard Reset:</strong> Signs you out completely to force
                fresh session
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => (window.location.href = "/admin-setup")}
                variant="outline"
                size="sm"
              >
                Admin Setup
              </Button>
              <Button
                onClick={() => (window.location.href = "/admin")}
                variant="outline"
                size="sm"
              >
                Admin Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
