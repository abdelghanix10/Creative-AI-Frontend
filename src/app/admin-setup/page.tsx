"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { toast } from "react-hot-toast";

interface UserData {
  session: {
    id: string;
    email?: string;
    name?: string;
    role?: string;
  };
  databaseUser: {
    id: string;
    email?: string;
    username?: string;
    role: string;
    subscriptionTier: string;
  };
}

export default function AdminSetupPage() {
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const { update: updateSession } = useSession();

  const checkUserData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/debug/user");
      const data = (await response.json()) as UserData;
      setUserData(data);
      toast.success("User data fetched");
    } catch {
      toast.error("Failed to fetch user data");
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    setLoading(true);
    try {
      // Trigger session refresh to get updated role from database
      await updateSession({});
      toast.success("Session refreshed successfully!");
      setUserData(null); // Clear data to refetch
    } catch {
      toast.error("Failed to refresh session");
    } finally {
      setLoading(false);
    }
  };

  const setAdminRole = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/debug/set-admin", {
        method: "POST",
      });
      const data = (await response.json()) as {
        error?: string;
        sessionUpdateRequired?: boolean;
      };

      if (response.ok) {
        toast.success("Admin role set successfully!");

        // Trigger session update to refresh the JWT token
        if (data.sessionUpdateRequired) {
          await updateSession({ role: "ADMIN" });
          toast.success("Session updated with admin role!");
        }

        setUserData(null); // Clear data to refetch
      } else {
        toast.error(data.error ?? "Failed to set admin role");
      }
    } catch {
      toast.error("Failed to set admin role");
    } finally {
      setLoading(false);
    }
  };

  const testAdminAccess = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/sync-plans", {
        method: "POST",
      });
      const data = (await response.json()) as { error?: string };

      if (response.ok) {
        toast.success("Admin access confirmed! Plans synced successfully.");
      } else {
        toast.error(data.error ?? "Admin access denied");
      }
    } catch {
      toast.error("Failed to test admin access");
    } finally {
      setLoading(false);
    }
  };

  const createDefaultPlans = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/debug/create-default-plans", {
        method: "POST",
      });
      const data = (await response.json()) as { error?: string };

      if (response.ok) {
        toast.success("Default plans created successfully!");
      } else {
        toast.error(data.error ?? "Failed to create default plans");
      }
    } catch {
      toast.error("Failed to create default plans");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto space-y-6 py-8">
      <h1 className="text-3xl font-bold">Admin Setup</h1>

      <Card>
        <CardHeader>
          <CardTitle>Current User Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={checkUserData} disabled={loading}>
            Check User Data
          </Button>

          {userData && (
            <div className="rounded-lg bg-gray-100 p-4">
              <h3 className="mb-2 font-semibold">Session User:</h3>
              <pre className="text-sm">
                {JSON.stringify(userData.session, null, 2)}
              </pre>

              <h3 className="mb-2 mt-4 font-semibold">Database User:</h3>
              <pre className="text-sm">
                {JSON.stringify(userData.databaseUser, null, 2)}
              </pre>

              {userData &&
                userData.session.role !== userData.databaseUser.role && (
                  <div className="mt-4 rounded-lg border border-yellow-400 bg-yellow-100 p-4">
                    <h3 className="mb-2 font-semibold text-yellow-800">
                      ⚠️ Session Out of Sync
                    </h3>
                    <p className="mb-3 text-sm text-yellow-700">
                      Your database role is
                      <strong>{userData.databaseUser.role}</strong> but your
                      session shows <strong>{userData.session.role}</strong>.
                      The JWT token needs to be refreshed.
                    </p>
                    <div className="space-y-2">
                      <Button
                        onClick={refreshSession}
                        disabled={loading}
                        size="sm"
                        className="mr-2"
                      >
                        Refresh Session
                      </Button>
                      <Button
                        onClick={() => window.location.reload()}
                        disabled={loading}
                        size="sm"
                        variant="outline"
                      >
                        Reload Page
                      </Button>
                    </div>
                  </div>
                )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Refresh Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            If your session shows an old role, click this to refresh it with the
            current database data.
          </p>
          <Button onClick={refreshSession} disabled={loading} variant="outline">
            Refresh Session
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Set Admin Role</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Click this button to set your current user as an admin.
          </p>
          <Button onClick={setAdminRole} disabled={loading}>
            Set Admin Role
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Admin Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Test if your admin access is working by trying to sync plans.
          </p>
          <Button onClick={testAdminAccess} disabled={loading}>
            Test Admin Access (Sync Plans)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create Default Plans</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Create default subscription plans (Free, Lite, Pro) if they
            don&apos;t exist.
          </p>
          <Button onClick={createDefaultPlans} disabled={loading}>
            Create Default Plans
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
