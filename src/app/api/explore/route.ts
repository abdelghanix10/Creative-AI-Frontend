import { NextResponse } from "next/server";
import { db } from "~/server/db";

export async function GET() {
  try {
    // Get all public media content from all users (remove userId filter)
    const [allImages, allAudioClips, allVoices, allVideos] = await Promise.all([
      // All public images
      db.generatedImage.findMany({
        where: {
          failed: false,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          prompt: true,
          provider: true,
          modelId: true,
          s3Key: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        take: 100, // Limit to 100 for performance
      }),

      // All public audio clips
      db.generatedAudioClip.findMany({
        where: {
          failed: false,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          text: true,
          voice: true,
          s3Key: true,
          service: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        take: 100,
      }),

      // All public voices
      db.userVoice.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          service: true,
          s3Key: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        take: 100,
      }),

      // All public videos
      db.generatedVideo.findMany({
        where: {
          failed: false,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          prompt: true,
          provider: true,
          modelId: true,
          mode: true,
          resolution: true,
          aspectRatio: true,
          duration: true,
          imageUrl: true,
          videoUrl: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        take: 100,
      }),
    ]);

    return NextResponse.json({
      images: allImages,
      audioClips: allAudioClips,
      voices: allVoices,
      videos: allVideos,
      totalItems:
        allImages.length +
        allAudioClips.length +
        allVoices.length +
        allVideos.length,
    });
  } catch (error) {
    console.error("Error fetching explore data:", error);
    return NextResponse.json(
      { error: "Failed to fetch explore data" },
      { status: 500 },
    );
  }
}
