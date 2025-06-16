import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { AdminDashboard } from "~/components/client/admin-dashboard";
import { PageLayout } from "~/components/client/page-layout";

export default async function AdminPage() {
  const session = await auth();

  // Get basic stats for dashboard
  const [totalUsers, activeSubscriptions, totalRevenue, totalPlans] =
    await Promise.all([
      db.user.count(),
      db.subscription.count({
        where: { status: "active" },
      }),
      db.subscription
        .findMany({
          where: { status: "active" },
          include: {
            plan: true,
          },
        })
        .then((subscriptions) => {
          return subscriptions.reduce(
            (sum, sub) => sum + (sub.plan?.price ?? 0),
            0,
          );
        }),
      db.subscriptionPlan.count(),
    ]);

  return (
    <PageLayout
      title={"Analytics Dashboard"}
      service={"admin"}
      showSidebar={false}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your platform analytics and revenue
        </p>
      </div>
      <AdminDashboard
        userId={session!.user!.id}
        initialStats={{
          totalUsers,
          activeSubscriptions,
          monthlyRevenue: totalRevenue,
          totalPlans,
        }}
      />
    </PageLayout>
  );
}
