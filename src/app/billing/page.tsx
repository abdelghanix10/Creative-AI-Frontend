import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { BillingDashboard } from "~/components/client/billing-dashboard";

export default async function BillingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Billing & Subscriptions
        </h1>
        <p className="text-muted-foreground">
          Manage your subscription, view billing history, and update payment
          methods
        </p>
      </div>

      <BillingDashboard userId={session.user.id} />
    </div>
  );
}
