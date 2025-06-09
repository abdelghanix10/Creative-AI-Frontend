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

    const body = (await request.json()) as { s3Keys: string[] };
    const { s3Keys } = body;

    if (!s3Keys || !Array.isArray(s3Keys)) {
      return NextResponse.json(
        { error: "S3 keys array is required" },
        { status: 400 },
      );
    }

    // Generate presigned URLs for all provided keys
    const previewUrls = await Promise.all(
      s3Keys.map(async (s3Key: string) => {
        try {
          const url = await getPresignedUrl({
            key: s3Key,
            expiresIn: 3600, // 1 hour
          });
          return { s3Key, url };
        } catch (error) {
          console.error(`Error generating preview URL for ${s3Key}:`, error);
          return { s3Key, url: null, error: "Failed to generate URL" };
        }
      }),
    );

    return NextResponse.json({ previewUrls });
  } catch (error) {
    console.error("Error generating preview URLs:", error);
    return NextResponse.json(
      { error: "Failed to generate preview URLs" },
      { status: 500 },
    );
  }
}
