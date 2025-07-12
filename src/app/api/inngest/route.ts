import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import {
  aiGenerationFunction,
  styleTTS2VoiceUploadFunction,
  seedVCVoiceUploadFunction,
  generateImageFunction,
  testConnectionFunction,
} from "~/inngest/functions";
import { env } from "~/env";

// Validate required environment variables in production
if (env.NODE_ENV === "production") {
  if (!env.INNGEST_SIGNING_KEY) {
    console.error(
      "INNGEST_SIGNING_KEY is missing in production. Please check your Vercel environment variables."
    );
  }
  if (!env.INNGEST_EVENT_KEY) {
    console.error(
      "INNGEST_EVENT_KEY is missing in production. Please check your Vercel environment variables."
    );
  }
}

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    aiGenerationFunction,
    styleTTS2VoiceUploadFunction,
    seedVCVoiceUploadFunction,
    generateImageFunction,
    testConnectionFunction,
  ],
  signingKey: env.INNGEST_SIGNING_KEY,
});
