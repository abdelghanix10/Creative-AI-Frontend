import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function adminMiddleware(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  // Get the user's role from the database to ensure it's current
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 },
    );
  }

  return null; // Allow access
}

// Utility function to check admin access in API routes
export async function requireAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Authentication required");
  }

  // Get the user's role from the database to ensure it's current
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || user.role !== "ADMIN") {
    throw new Error("Admin access required");
  }

  return session;
}
