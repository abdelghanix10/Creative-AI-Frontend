"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut, signIn } from "next-auth/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export default function ForceSessionRefreshPage() {
  const router = useRouter();

  const forceRefresh = async () => {
    // Force a complete session refresh by signing out and back in
    const result = await signOut({ redirect: false });
    if (result) {
      // Redirect to sign in page
      router.push("/app/sign-in");
    }
  };

  const reloadPage = () => {
    // Simple page reload to refresh session
    window.location.reload();
  };

  return (
    <div className="container mx-auto space-y-6 py-8">
      <h1 className="text-3xl font-bold">Session Refresh</h1>

      <Card>
        <CardHeader>
          <CardTitle>Session Out of Sync</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Your database role has been updated to ADMIN, but your session still
            shows USER. This is because JWT tokens cache user data. Try one of
            these solutions:
          </p>

          <div className="space-y-2">
            <Button onClick={reloadPage} className="w-full">
              🔄 Reload Page (Simple)
            </Button>

            <Button onClick={forceRefresh} variant="outline" className="w-full">
              🚪 Sign Out & Sign In Again (Complete Refresh)
            </Button>

            <Button
              onClick={() => router.push("/admin-setup")}
              variant="ghost"
              className="w-full"
            >
              ← Back to Admin Setup
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
