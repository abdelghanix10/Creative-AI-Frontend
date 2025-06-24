import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import {
  aiGenerationFunction,
  styleTTS2VoiceUploadFunction,
  seedVCVoiceUploadFunction,
} from "~/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    aiGenerationFunction,
    styleTTS2VoiceUploadFunction,
    seedVCVoiceUploadFunction,
  ],
});
