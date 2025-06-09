import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { getPresignedUrl } from "~/lib/s3";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { s3Key: string };
    const { s3Key } = body;

    if (!s3Key || typeof s3Key !== "string") {
      return NextResponse.json(
        { error: "S3 key is required" },
        { status: 400 },
      );
    }

    // Generate a presigned URL that expires in 1 hour
    const downloadUrl = await getPresignedUrl({
      key: s3Key,
      expiresIn: 3600, // 1 hour
    });

    return NextResponse.json({ downloadUrl });
  } catch (error) {
    console.error("Error generating download URL:", error);
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 },
    );
  }
}
