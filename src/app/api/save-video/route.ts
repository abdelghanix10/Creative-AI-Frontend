import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

interface SaveVideoRequestBody {
  prompt: string;
  provider: string;
  modelId: string;
  mode: string;
  resolution?: string;
  aspectRatio?: string;
  duration?: string;
  imageUrl?: string;
  videoUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user credits before processing
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.credits < 100) {
      return NextResponse.json(
        {
          error: "Insufficient credits. Video generation requires 100 credits.",
        },
        { status: 402 },
      );
    }

    const body = (await request.json()) as SaveVideoRequestBody;
    const {
      prompt,
      provider,
      modelId,
      mode,
      resolution,
      aspectRatio,
      duration,
      imageUrl,
      videoUrl,
    } = body;

    // Validate required fields
    if (!prompt || !provider || !modelId || !mode) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // For now, we'll store the URL directly in the database
    // In a production app, you'd want to download and save to S3
    const finalVideoUrl = videoUrl;

    // Save to database
    const generatedVideo = await db.generatedVideo.create({
      data: {
        userId: session.user.id,
        prompt,
        provider,
        modelId,
        mode,
        resolution,
        aspectRatio,
        duration: duration ? parseInt(duration) : null,
        imageUrl,
        videoUrl: finalVideoUrl,
        failed: false,
      },
    });

    // Deduct credits for successful video generation
    await db.user.update({
      where: { id: session.user.id },
      data: {
        credits: {
          decrement: 100,
        },
      },
    });

    return NextResponse.json({
      success: true,
      videoId: generatedVideo.id,
    });
  } catch (error) {
    console.error("Error saving video:", error);
    return NextResponse.json(
      { error: "Failed to save video" },
      { status: 500 },
    );
  }
}
