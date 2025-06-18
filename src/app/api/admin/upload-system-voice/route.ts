import { NextResponse } from "next/server";
import { requireAdmin } from "~/lib/admin-middleware";
import { db } from "~/server/db";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "~/env";

// Initialize S3 client
const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

// Helper to upload buffer directly to S3
async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  // Return the public URL
  return `https://${env.S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
}

// Helper to convert ReadableStream to Buffer
async function streamToBuffer(
  readableStream: ReadableStream<Uint8Array>,
): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = readableStream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value) {
        chunks.push(value);
      }
    }
    return Buffer.concat(chunks);
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  try {
    // Check admin access
    const session = await requireAdmin();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const voiceName = formData.get("voice_name") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!voiceName) {
      return NextResponse.json(
        { error: "Voice name is required" },
        { status: 400 },
      );
    }

    // Validate file type
    if (!file.type.startsWith("audio/")) {
      return NextResponse.json(
        { error: "File must be an audio file" },
        { status: 400 },
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 },
      );
    }

    const fileBuffer = await streamToBuffer(file.stream()); // Generate a unique voice key for the system voice
    const timestamp = Date.now();
    const sanitizedVoiceName = voiceName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileExtension = file.name.split(".").pop() ?? "wav";
    const s3Key = `target-voices/${sanitizedVoiceName}_${timestamp}.${fileExtension}`;
    const voiceKey = `system_${sanitizedVoiceName}_${timestamp}`;

    // Upload to S3
    await uploadToS3(fileBuffer, s3Key, file.type);

    // Store in database as system voice using UserVoice model
    const systemVoice = await db.userVoice.create({
      data: {
        id: voiceKey,
        userId: session.user.id, // Track which admin uploaded it
        service: "system",
        voiceKey: voiceKey,
        s3Key: s3Key,
        name: voiceName,
      },
    });

    console.log("System voice uploaded successfully:", systemVoice);

    return NextResponse.json({
      message: "System voice uploaded successfully",
      voice: {
        id: systemVoice.voiceKey,
        name: systemVoice.name,
        service: systemVoice.service,
        s3Key: systemVoice.s3Key,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Authentication required") {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 },
        );
      }
      if (error.message === "Admin access required") {
        return NextResponse.json(
          { error: "Admin access required" },
          { status: 403 },
        );
      }
    }

    console.error("Error uploading system voice:", error);
    return NextResponse.json(
      {
        error: "Internal server error during system voice upload",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
