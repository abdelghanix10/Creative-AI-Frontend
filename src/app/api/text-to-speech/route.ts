import { NextRequest, NextResponse } from "next/server";
import { generateTextToSpeech } from "~/actions/generate-speech";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice } = body;

    if (!text || !voice) {
      return NextResponse.json(
        { error: "Text and voice are required" },
        { status: 400 }
      );
    }

    const result = await generateTextToSpeech(text, voice);
    
    return NextResponse.json({
      success: true,
      audioId: result.audioId,
      shouldShowThrottleAlert: result.shouldShowThrottleAlert,
    });
  } catch (error) {
    console.error("Text-to-speech API error:", error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to generate speech",
        success: false 
      },
      { status: 500 }
    );
  }
}
