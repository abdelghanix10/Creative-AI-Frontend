import { PageLayout } from "~/components/client/page-layout";
import { SubscriptionManagement } from "~/components/client/subscription-management";

export default function AdminSubscriptionsPage() {
  return (
    <PageLayout
          title={"Subscriptions"}
          service={"admin"}
          showSidebar={false}
        >
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Subscription Management
        </h1>
        <p className="text-muted-foreground">
          Manage user subscriptions and billing
        </p>
      </div>

      <SubscriptionManagement />
    </PageLayout>
  );
}
