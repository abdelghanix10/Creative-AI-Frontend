import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { requireAdmin } from "~/lib/admin-middleware";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    await requireAdmin();

    const body = (await request.json()) as {
      name?: string;
      email?: string;
      role?: string;
      isActive?: boolean;
    };

    const { userId } = params;

    // Update the user (for now, we'll ignore isActive since it's not in the current schema)
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.role !== undefined && { role: body.role }),
        // Skip isActive for now until schema is updated
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({
      user: {
        ...updatedUser,
        isActive: true, // Default for now
      },
    });
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 },
    );
  }
}
