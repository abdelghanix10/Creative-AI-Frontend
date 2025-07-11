import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import {
  aiGenerationFunction,
  styleTTS2VoiceUploadFunction,
  seedVCVoiceUploadFunction,
  generateImageFunction,
} from "~/inngest/functions";
import { env } from "~/env";

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
