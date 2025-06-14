import { PageLayout } from "~/components/client/page-layout";
import { UserManagement } from "~/components/client/user-management";

export default function AdminUsersPage() {
  return (
    <PageLayout
          title={"Users"}
          service={"admin"}
          showSidebar={false}
        >
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          Manage user accounts, roles, and status
        </p>
      </div>

      <UserManagement />
    </PageLayout>
  );
}
