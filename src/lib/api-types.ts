import { ProviderKey } from "./provider-config";

export interface GenerateImageRequest {
  prompt: string;
  provider: ProviderKey;
  modelId: string;
  aspectRatio?: string; // Add support for custom aspect ratio
}

export interface GenerateImageResponse {
  image?: string;
  error?: string;
}
