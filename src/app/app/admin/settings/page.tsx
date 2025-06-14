import { AdminSettings } from "~/components/client/admin-settings";
import { PageLayout } from "~/components/client/page-layout";

export default function AdminSettingsPage() {
  return (
    <PageLayout
          title={"Settings"}
          service={"admin"}
          showSidebar={false}
        >
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage system settings and subscription plans
        </p>
      </div>

      <AdminSettings />
    </PageLayout>
  );
}
