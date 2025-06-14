"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { RefreshCw, User, Shield, Database } from "lucide-react";
import { useState } from "react";
import { toast } from "react-hot-toast";

export default function SessionStatusPage() {
  const { data: session, status, update } = useSession();
  const [loading, setLoading] = useState(false);
  const [dbUser, setDbUser] = useState<any>(null);

  const refreshSession = async () => {
    setLoading(true);
    try {
      await update();
      toast.success("Session refreshed!");
    } catch (error) {
      toast.error("Failed to refresh session");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const checkDatabaseUser = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/debug/user");
      if (response.ok) {
        const userData = await response.json();
        setDbUser(userData);
        toast.success("Database user data loaded");
      } else {
        toast.error("Failed to load database user data");
      }
    } catch (error) {
      toast.error("Error checking database user");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const testAdminAccess = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/metrics");
      if (response.ok) {
        toast.success("✅ Admin access confirmed!");
      } else if (response.status === 403) {
        toast.error("❌ Admin access denied - Role issue");
      } else if (response.status === 401) {
        toast.error("❌ Authentication required - Session issue");
      } else {
        toast.error("❌ Unknown error");
      }
    } catch (error) {
      toast.error("Error testing admin access");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">
          Session Status
        </h1>
        <p className="text-muted-foreground">
          Check your current session status and admin access
        </p>
      </div>

      <div className="space-y-6">
        {/* Session Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Current Session
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Status</p>
                <Badge
                  variant={
                    status === "authenticated" ? "default" : "destructive"
                  }
                >
                  {status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium">Role (from session)</p>
                <Badge
                  variant={
                    session?.user?.role === "ADMIN" ? "default" : "secondary"
                  }
                >
                  {session?.user?.role ?? "Not set"}
                </Badge>
              </div>
            </div>

            {session?.user && (
              <div className="space-y-2">
                <p>
                  <strong>Email:</strong> {session.user.email}
                </p>
                <p>
                  <strong>ID:</strong> {session.user.id}
                </p>
                <p>
                  <strong>Name:</strong> {session.user.name ?? "Not set"}
                </p>
              </div>
            )}

            <Button
              onClick={refreshSession}
              disabled={loading}
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {loading ? "Refreshing..." : "Refresh Session"}
            </Button>
          </CardContent>
        </Card>

        {/* Database User Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database User Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dbUser ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Role (from database)</p>
                    <Badge
                      variant={
                        dbUser.role === "ADMIN" ? "default" : "secondary"
                      }
                    >
                      {dbUser.role ?? "Not set"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Subscription Tier</p>
                    <Badge variant="outline">
                      {dbUser.subscriptionTier ?? "Not set"}
                    </Badge>
                  </div>
                </div>
                <p>
                  <strong>Email:</strong> {dbUser.email}
                </p>
                <p>
                  <strong>Created:</strong>
                  {new Date(dbUser.createdAt).toLocaleString()}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Click button below to load database user data
              </p>
            )}

            <Button
              onClick={checkDatabaseUser}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              <Database className="mr-2 h-4 w-4" />
              {loading ? "Loading..." : "Check Database User"}
            </Button>
          </CardContent>
        </Card>

        {/* Admin Access Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Admin Access Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Test if you can access admin endpoints. This will try to fetch
              subscription metrics.
            </p>

            <Button
              onClick={testAdminAccess}
              disabled={loading}
              variant="secondary"
              className="w-full"
            >
              <Shield className="mr-2 h-4 w-4" />
              {loading ? "Testing..." : "Test Admin Access"}
            </Button>
          </CardContent>
        </Card>

        {/* Troubleshooting Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">If Admin Access is Denied:</h4>
              <ol className="list-inside list-decimal space-y-1 text-sm">
                <li>
                  Check if your database role is "ADMIN" (use "Check Database
                  User" button)
                </li>
                <li>
                  If database role is not ADMIN, go to <code>/admin-setup</code>
                  and set admin role
                </li>
                <li>
                  If database role is ADMIN but session role is not, refresh
                  your session
                </li>
                <li>After refreshing session, test admin access again</li>
                <li>
                  If still having issues, try signing out and signing back in
                </li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => (window.location.href = "/admin-setup")}
                variant="outline"
                size="sm"
              >
                Go to Admin Setup
              </Button>
              <Button
                onClick={() => (window.location.href = "/admin")}
                variant="outline"
                size="sm"
              >
                Go to Admin Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
