import { db } from "~/server/db";
import { inngest } from "./client";
import { env } from "~/env";
import { NonRetriableError } from "inngest";

// Helper to convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export const aiGenerationFunction = inngest.createFunction(
  {
    id: "genrate-audio-clip",
    retries: 3,
    throttle: {
      limit: 3,
      period: "1m",
      key: "event.data.userId",
    },
    onFailure: async ({ error, event }) => {
      console.error(`[Inngest] Audio generation failed for event ${event.id}:`, error);
      
      // Mark the audio clip as failed in the database
      if (event.data.audioClipId) {
        try {
          await db.generatedAudioClip.update({
            where: { id: event.data.audioClipId as string },
            data: { failed: true },
          });
        } catch (dbError) {
          console.error(`[Inngest] Failed to mark audio clip as failed:`, dbError);
        }
      }
    },
  },
  { event: "generate.request" },
  async ({ event, step }) => {
    const { audioClipId } = event.data as { audioClipId: string };

    console.log(`[Inngest] Starting voice generation for audioClipId: ${audioClipId}`);

    const audioClip = await step.run("get-clip", async () => {
      return await db.generatedAudioClip.findUniqueOrThrow({
        where: { id: audioClipId },
        select: {
          id: true,
          text: true,
          voice: true,
          userId: true,
          service: true,
          originalVoiceS3Key: true,
        },
      });
    });

    console.log(`[Inngest] Audio clip found - Service: ${audioClip.service}, Voice: ${audioClip.voice}`);

    // Check if user has enough credits
    await step.run("check-credits", async () => {
      const user = await db.user.findUnique({
        where: { id: audioClip.userId },
        select: { credits: true },
      });

      if (!user || user.credits < 15) {
        console.error(`[Inngest] Insufficient credits for user ${audioClip.userId}. Credits: ${user?.credits ?? 0}`);
        throw new Error("Not enough credits");
      }

      return user;
    });

    const result = await step.run("call-api", async () => {
      let response: Response | null = null;
      let apiUrl = "";

      if (audioClip.service === "styletts2") {
        apiUrl = env.STYLETTS2_API_ROUTE + "/generate";
        console.log(`[Inngest] Calling StyleTTS2 API: ${apiUrl}`);
        
        response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: env.BACKEND_API_KEY,
          },
          body: JSON.stringify({
            text: audioClip.text,
            target_voice: audioClip.voice,
          }),
        });
      } else if (audioClip.service === "seedvc") {
        apiUrl = env.SEED_VC_API_ROUTE + "/convert";
        console.log(`[Inngest] Calling SeedVC API: ${apiUrl}`);
        
        response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: env.BACKEND_API_KEY,
          },
          body: JSON.stringify({
            source_audio_key: audioClip.originalVoiceS3Key, // This S3 key is for the *source* audio to be converted
            target_voice: audioClip.voice, // This is the *key* of the target voice (e.g., uploaded via /upload-voice)
          }),
        });
      } else if (audioClip.service === "make-an-audio") {
        apiUrl = env.MAKE_AN_AUDIO_API_ROUTE + "/generate";
        console.log(`[Inngest] Calling Make-An-Audio API: ${apiUrl}`);
        
        response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: env.BACKEND_API_KEY,
          },
          body: JSON.stringify({
            prompt: audioClip.text,
          }),
        });
      }

      if (!response) {
        console.error(`[Inngest] No response from API for service: ${audioClip.service}`);
        throw new Error("API error: no response");
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Inngest] API error ${response.status} from ${apiUrl}: ${errorText}`);
        
        await db.generatedAudioClip.update({
          where: { id: audioClip.id },
          data: {
            failed: true,
          },
        });

        throw new Error(`API error: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json() as { audio_url: string; s3_key: string };
      console.log(`[Inngest] API success - S3 key: ${result.s3_key}`);
      return result;
    });

    await step.run("save-to-history", async () => {
      return await db.generatedAudioClip.update({
        where: { id: audioClip.id },
        data: {
          s3Key: result.s3_key,
        },
      });
    });

    await step.run("deduct-credits", async () => {
      return await db.user.update({
        where: { id: audioClip.userId },
        data: {
          credits: {
            decrement: 15,
          },
        },
      });
    });

    console.log(`[Inngest] Voice generation completed successfully for audioClipId: ${audioClipId}`);
    return { success: true };
  },
);

export const styleTTS2VoiceUploadFunction = inngest.createFunction(
  {
    id: "upload-voice-to-styletts2",
    name: "Upload Voice to StyleTTS2",
    retries: 1, // Uploads might not be safe to retry automatically without more context
    // Consider concurrency limits if many users upload simultaneously
  },
  { event: "styletts2.voice.upload.request" }, // Define a new event type
  async ({ event, step }) => {
    const {
      fileBufferB64, // Assuming file content is passed as base64 string
      fileName,
      contentType,
      voiceName, // Optional: custom name for the voice
      userId, // To associate the voice with a user, if needed
    } = event.data as {
      fileBufferB64: string;
      fileName: string;
      contentType: string;
      voiceName?: string;
      userId?: string;
    };

    if (!fileBufferB64 || !fileName || !contentType) {
      throw new NonRetriableError(
        "Missing file data, name, or content type for voice upload.",
      );
    }

    const result = await step.run("call-styletts2-upload-api", async () => {
      const formData = new FormData();
      const arrayBuffer = base64ToArrayBuffer(fileBufferB64);
      const blob = new Blob([arrayBuffer], { type: contentType });
      formData.append("file", blob, fileName);

      if (voiceName) {
        formData.append("voice_name", voiceName);
      }

      const response = await fetch(env.STYLETTS2_API_ROUTE + "/upload-voice", {
        method: "POST",
        headers: {
          Authorization: env.BACKEND_API_KEY,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`StyleTTS2 API Error (${response.status}): ${errorBody}`);

        // Check if the error is due to duplicate voice name
        if (response.status === 400 && errorBody.includes("already exists")) {
          // Try again with a modified name
          const uniqueName = `${voiceName}_${Date.now()}`;
          console.log(`Retrying with unique name: ${uniqueName}`);

          formData.delete("voice_name");
          formData.append("voice_name", uniqueName);

          const retryResponse = await fetch(
            env.STYLETTS2_API_ROUTE + "/upload-voice",
            {
              method: "POST",
              headers: {
                Authorization: env.BACKEND_API_KEY,
              },
              body: formData,
            },
          );

          if (!retryResponse.ok) {
            const retryErrorBody = await retryResponse.text();
            throw new Error(
              `StyleTTS2 API retry error: ${retryResponse.statusText} - ${retryErrorBody}`,
            );
          }

          return retryResponse.json();
        }

        // For other errors, throw as usual
        throw new Error(
          `StyleTTS2 API error: ${response.statusText} - ${errorBody}`,
        );
      }

      return response.json() as Promise<{
        message: string;
        voice_key: string;
        s3_key: string;
        voices: Record<string, unknown>; // Or a more specific type for voices
      }>;
    });

    // Optionally, save voice details to your database
    if (userId && result.voice_key) {
      await step.run("save-voice-to-db", async () => {
        await db.userVoice.create({
          data: {
            userId: userId,
            service: "styletts2",
            voiceType: "user",
            voiceKey: result.voice_key,
            s3Key: result.s3_key,
            name: voiceName ?? result.voice_key,
          },
        });
        console.log(
          `Voice ${result.voice_key} uploaded for user ${userId}. S3 Key: ${result.s3_key}`,
        );
      });

      // Send completion event that frontend can listen to
      await step.run("send-completion-event", async () => {
        await inngest.send({
          name: "styletts2.voice.upload.completed",
          data: {
            userId: userId,
            voiceKey: result.voice_key,
            voiceName: voiceName ?? result.voice_key,
            service: "styletts2",
          },
        });
      });
    }

    return {
      success: true,
      message: result.message,
      voice_key: result.voice_key,
      s3_key: result.s3_key,
    };
  },
);

export const seedVCVoiceUploadFunction = inngest.createFunction(
  {
    id: "upload-voice-to-seedvc",
    name: "Upload Voice to SeedVC",
    retries: 1,
  },
  { event: "seedvc.voice.upload.request" }, // New event type for SeedVC uploads
  async ({ event, step }) => {
    const {
      fileBufferB64,
      fileName,
      contentType,
      voiceName, // Optional: custom name for the voice from SeedVC API
      userId,
    } = event.data as {
      fileBufferB64: string;
      fileName: string;
      contentType: string;
      voiceName?: string;
      userId?: string;
    };

    if (!fileBufferB64 || !fileName || !contentType) {
      throw new NonRetriableError(
        "Missing file data, name, or content type for SeedVC voice upload.",
      );
    }

    const result = await step.run("call-seedvc-upload-api", async () => {
      const formData = new FormData();
      const arrayBuffer = base64ToArrayBuffer(fileBufferB64);
      const blob = new Blob([arrayBuffer], { type: contentType });
      formData.append("file", blob, fileName);

      if (voiceName) {
        formData.append("voice_name", voiceName);
      }

      const response = await fetch(env.SEED_VC_API_ROUTE + "/upload-voice", {
        method: "POST",
        headers: {
          Authorization: env.BACKEND_API_KEY,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`SeedVC API Error (${response.status}): ${errorBody}`);

        // Check if the error is due to duplicate voice name
        if (response.status === 400 && errorBody.includes("already exists")) {
          // Try again with a modified name
          const uniqueName = `${voiceName}_${Date.now()}`;
          console.log(`Retrying with unique name: ${uniqueName}`);

          formData.delete("voice_name");
          formData.append("voice_name", uniqueName);

          const retryResponse = await fetch(
            env.SEED_VC_API_ROUTE + "/upload-voice",
            {
              method: "POST",
              headers: {
                Authorization: env.BACKEND_API_KEY,
              },
              body: formData,
            },
          );

          if (!retryResponse.ok) {
            const retryErrorBody = await retryResponse.text();
            throw new Error(
              `SeedVC API retry error: ${retryResponse.statusText} - ${retryErrorBody}`,
            );
          }

          return retryResponse.json();
        }

        // For other errors, throw as usual
        throw new Error(
          `SeedVC API error: ${response.statusText} - ${errorBody}`,
        );
      }

      // Matches VoiceUploadResponse from seedvc/api.py
      return response.json() as Promise<{
        message: string;
        voice_key: string;
        s3_key: string;
        voices: Record<string, string>;
      }>;
    });

    // Optionally, save SeedVC voice details to your database
    if (userId && result.voice_key) {
      await step.run("save-seedvc-voice-to-db", async () => {
        await db.userVoice.create({
          data: {
            userId: userId,
            service: "seedvc",
            voiceType: "user",
            voiceKey: result.voice_key,
            s3Key: result.s3_key,
            name: voiceName ?? result.voice_key,
          },
        });
        console.log(
          `SeedVC Voice ${result.voice_key} uploaded for user ${userId}. S3 Key: ${result.s3_key}`,
        );
      });

      // Send completion event that frontend can listen to
      await step.run("send-completion-event", async () => {
        await inngest.send({
          name: "seedvc.voice.upload.completed",
          data: {
            userId: userId,
            voiceKey: result.voice_key,
            voiceName: voiceName ?? result.voice_key,
            service: "seedvc",
          },
        });
      });
    }

    return {
      success: true,
      message: result.message,
      voice_key: result.voice_key,
      s3_key: result.s3_key,
    };
  },
);

export const testConnectionFunction = inngest.createFunction(
  { id: "test-connection" },
  { event: "test.connection" },
  async ({ event }) => {
    console.log("[Inngest] Test connection successful", event.data);
    return { success: true, timestamp: Date.now() };
  }
);

export const generateImageFunction = inngest.createFunction(
  {
    id: "generate-image",
    retries: 2,
    throttle: {
      limit: 3,
      period: "1m",
      key: "event.data.userId",
    },
  },
  { event: "image.generate.request" },
  async ({ event, step }) => {
    const { imageId } = event.data;

    const generatedImage = await step.run("get-image", async () => {
      return await db.generatedImage.findUniqueOrThrow({
        where: { id: imageId },
        select: {
          id: true,
          prompt: true,
          provider: true,
          modelId: true,
          userId: true,
          s3Key: true,
          failed: true,
        },
      });
    });

    // If the image was already generated successfully (has s3Key and not failed)
    if (generatedImage.s3Key && !generatedImage.failed) {
      // Deduct credits for the successful generation
      const deductCredits = await step.run("deduct-credits", async () => {
        return await db.user.update({
          where: { id: generatedImage.userId },
          data: {
            credits: {
              decrement: 50,
            },
          },
        });
      });
      deductCredits;
      return { success: true, s3Key: generatedImage.s3Key };
    }

    // If the image generation failed, return error
    if (generatedImage.failed) {
      throw new Error("Image generation failed");
    }
    return {
      success: false,
      error: "Image generation should be handled by API route",
    };
  },
);
