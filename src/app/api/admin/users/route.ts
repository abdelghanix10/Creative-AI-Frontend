import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { requireAdmin } from "~/lib/admin-middleware";

export async function GET(_request: NextRequest) {
  try {
    // Check admin access
    await requireAdmin();

    // Get basic user information
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionTier: true,
        role: true,
      },
      orderBy: {
        email: "asc",
      },
    });

    // Transform the data
    const transformedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      subscriptionTier: user.subscriptionTier,
      role: user.role,
      isActive: true, // Default to true for now
      createdAt: new Date(), // Default to current date for now
      subscription: null, // Will implement subscription lookup later
    }));

    return NextResponse.json({
      users: transformedUsers,
      total: users.length,
    });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}
