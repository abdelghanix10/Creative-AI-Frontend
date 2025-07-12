import { NextRequest, NextResponse } from "next/server";
import { generateSpeechToSpeech } from "~/actions/generate-speech";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { originalVoiceS3Key, voice } = body;

    if (!originalVoiceS3Key || !voice) {
      return NextResponse.json(
        { error: "Original voice S3 key and target voice are required" },
        { status: 400 }
      );
    }

    const result = await generateSpeechToSpeech(originalVoiceS3Key, voice);
    
    return NextResponse.json({
      success: true,
      audioId: result.audioId,
      shouldShowThrottleAlert: result.shouldShowThrottleAlert,
    });
  } catch (error) {
    console.error("Voice conversion API error:", error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to convert voice",
        success: false 
      },
      { status: 500 }
    );
  }
}
