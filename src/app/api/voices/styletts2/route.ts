import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { getPresignedUrl } from "~/lib/s3";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user voices from database for styletts2 service
    const userVoices = await db.userVoice.findMany({
      where: {
        OR: [
          {
            userId: session.user.id,
            service: { in: ["seedvc", "styletts2"] },
          },
          {
            service: "system",
          },
        ],
      },
      select: {
        id: true,
        voiceKey: true,
        name: true,
        s3Key: true,
        service: true,
      },
    });

    // Add preview URLs for each voice
    const voicesWithPreviews = await Promise.all(
      userVoices.map(async (voice) => {
        try {
          let previewUrl = null;
          if (voice.s3Key) {
            // Generate presigned URL for the voice file
            previewUrl = await getPresignedUrl({
              key: voice.s3Key,
              expiresIn: 3600, // 1 hour
            });
          }
          return {
            id: voice.voiceKey,
            name: voice.name,
            service: voice.service,
            previewUrl: previewUrl,
          };
        } catch (error) {
          console.error(
            `Failed to generate preview URL for voice ${voice.voiceKey}:`,
            error,
          );
          return {
            id: voice.voiceKey,
            name: voice.name,
            service: voice.service,
            previewUrl: null,
          };
        }
      }),
    );
    return NextResponse.json({
      voices: userVoices.map((voice) => voice.voiceKey),
      voicePreviews: voicesWithPreviews,
      voicesWithDetails: voicesWithPreviews, // Add this for better data structure
    });
  } catch (error) {
    console.error("Error in StyleTTS2 voices API route:", error);
    return NextResponse.json(
      { error: "Internal server error fetching StyleTTS2 voices" },
      { status: 500 },
    );
  }
}
