import { NextRequest, NextResponse } from "next/server";
import { generateSoundEffect } from "~/actions/generate-speech";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const result = await generateSoundEffect(prompt);
    
    return NextResponse.json({
      success: true,
      audioId: result.audioId,
      shouldShowThrottleAlert: result.shouldShowThrottleAlert,
    });
  } catch (error) {
    console.error("Sound effect API error:", error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to generate sound effect",
        success: false 
      },
      { status: 500 }
    );
  }
}
