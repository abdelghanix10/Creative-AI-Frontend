import { NextResponse } from "next/server";
import { requireAdmin } from "~/lib/admin-middleware";
import { env } from "~/env";
import { db } from "~/server/db";

export async function POST(request: Request) {
  try {
    // Check admin access
    console.log("Checking admin access...");
    const session = await requireAdmin();
    console.log("Admin access confirmed");

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const voiceName = formData.get("voice_name") as string | null;
    const service = formData.get("service") as string | null;

    console.log("Upload request data:", {
      fileName: file?.name,
      voiceName,
      service,
      fileSize: file?.size,
    });

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!voiceName) {
      return NextResponse.json(
        { error: "Voice name is required" },
        { status: 400 },
      );
    }

    if (!service) {
      return NextResponse.json(
        { error: "Service is required" },
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

    // Determine the external API endpoint based on service
    let externalApiUrl = "";
    if (service === "seedvc") {
      externalApiUrl = env.SEED_VC_API_ROUTE + "/upload-voice";
    } else if (service === "styletts2") {
      externalApiUrl = env.STYLETTS2_API_ROUTE + "/upload-voice";
    } else {
      return NextResponse.json(
        { error: "Service not supported for system voice upload" },
        { status: 400 },
      );
    }

    console.log("External API URL:", externalApiUrl);

    // Create new FormData for the external API call
    const externalFormData = new FormData();
    externalFormData.append("file", file);
    externalFormData.append("voice_name", voiceName);

    console.log("Making request to external API...");
    // Make the API call to the external service
    const externalResponse = await fetch(externalApiUrl, {
      method: "POST",
      body: externalFormData,
      headers: {
        Authorization: env.BACKEND_API_KEY,
      },
    });

    console.log("External API response status:", externalResponse.status);
    if (!externalResponse.ok) {
      let errorMessage = "Failed to upload voice to external service";
      try {
        const errorBody = await externalResponse.text();
        console.error(
          `${service.toUpperCase()} API Error (${externalResponse.status}): ${errorBody}`,
        );

        // Check if the error is due to duplicate voice name
        if (
          externalResponse.status === 400 &&
          errorBody.includes("already exists")
        ) {
          // Try again with a modified name
          const uniqueName = `${voiceName}_${Date.now()}`;
          console.log(`Retrying with unique name: ${uniqueName}`);

          const retryFormData = new FormData();
          retryFormData.append("file", file);
          retryFormData.append("voice_name", uniqueName);

          const retryResponse = await fetch(externalApiUrl, {
            method: "POST",
            body: retryFormData,
            headers: {
              Authorization: env.BACKEND_API_KEY,
            },
          });

          if (!retryResponse.ok) {
            const retryErrorBody = await retryResponse.text();
            return NextResponse.json(
              {
                error: `${service.toUpperCase()} API retry error: ${retryResponse.statusText} - ${retryErrorBody}`,
              },
              { status: retryResponse.status },
            );
          }
          const retryResult = (await retryResponse.json()) as Record<
            string,
            unknown
          >;

          // Save system voice to database (retry case)
          const retryTimestamp = Date.now();
          const sanitizedRetryVoiceName = uniqueName.replace(
            /[^a-zA-Z0-9_-]/g,
            "_",
          );
          const retryVoiceKey = `${sanitizedRetryVoiceName}_${retryTimestamp}`;
          const retryS3Key =
            (retryResult.s3_key as string) || `${retryVoiceKey}`;

            const retrySystemVoice = await db.userVoice.create({
              data: {
                userId: session.user.id, // Track which admin uploaded it
                service: service,
                voiceType: "system",
                voiceKey: sanitizedRetryVoiceName,
                s3Key: retryS3Key,
                name: voiceName,
              },
            });

          return NextResponse.json({
            success: true,
            message: "System voice uploaded successfully",
            result: retryResult,
            voice: {
              id: retrySystemVoice.voiceKey,
              name: retrySystemVoice.name,
              service: retrySystemVoice.service,
              s3Key: retrySystemVoice.s3Key,
            },
          });
        }

        errorMessage = errorBody;
      } catch {
        // If JSON parsing fails, use default message
      }
      return NextResponse.json(
        { error: errorMessage },
        { status: externalResponse.status },
      );
    }
    const externalResult = (await externalResponse.json()) as Record<
      string,
      unknown
    >;

    // Save system voice to database
    const timestamp = Date.now();
    const sanitizedVoiceName = voiceName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const voiceKey = `${sanitizedVoiceName}_${timestamp}`;
    const s3Key =
      (externalResult.s3_key as string) || `${voiceKey}`;

    const systemVoice = await db.userVoice.create({
      data: {
        userId: session.user.id, // Track which admin uploaded it
        service: service,
        voiceType: "system",
        voiceKey: sanitizedVoiceName,
        s3Key: s3Key,
        name: voiceName,
      },
    });

    // If the external API was successful, we can optionally store metadata in our database
    // For now, just return the success response
    return NextResponse.json({
      success: true,
      message: "System voice uploaded successfully",
      result: externalResult,
      voice: {
        id: systemVoice.voiceKey,
        name: systemVoice.name,
        service: systemVoice.service,
        s3Key: systemVoice.s3Key,
      },
    });
  } catch (error) {
    console.error("Admin upload error:", error);

    if (error instanceof Error) {
      if (error.message === "Authentication required") {
        console.log("Authentication failed - no session");
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 },
        );
      }
      if (error.message === "Admin access required") {
        console.log("Admin access denied - user is not admin");
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
