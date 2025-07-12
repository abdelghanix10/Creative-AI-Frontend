import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import {
  aiGenerationFunction,
  styleTTS2VoiceUploadFunction,
  seedVCVoiceUploadFunction,
  generateImageFunction,
} from "~/inngest/functions";
import { env } from "~/env";

// Validate required environment variables in production
if (env.NODE_ENV === "production") {
  if (!env.INNGEST_SIGNING_KEY) {
    throw new Error(
      "INNGEST_SIGNING_KEY is required in production. Get your signing key from https://app.inngest.com/secrets"
    );
  }
  if (!env.INNGEST_EVENT_KEY) {
    throw new Error(
      "INNGEST_EVENT_KEY is required in production. Get your event key from https://app.inngest.com/secrets"
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
  ],
  signingKey: env.INNGEST_SIGNING_KEY,
});
