export type ProviderKey = "fireworks1" | "fireworks2" | "fireworks3" ;
export type ModelMode = "performance" | "quality";

export const PROVIDERS: Record<
  ProviderKey,
  {
    displayName: string;
    iconPath: string;
    color: string;
    models: string[];
  }
> = {
  fireworks1: {
    displayName: "PlayGround",
    iconPath: "/provider-icons/fireworks.svg",
    color: "from-orange-500 to-red-500",
    models: [
      "accounts/fireworks/models/playground-v2-5-1024px-aesthetic",
      "accounts/fireworks/models/playground-v2-1024px-aesthetic",
    ],
  },
  fireworks2: {
    displayName: "Flux",
    iconPath: "public/provider-icons/flux.svg",
    color: "from-orange-500 to-red-500",
    models: [
      "accounts/fireworks/models/flux-1-dev-fp8",
      "accounts/fireworks/models/flux-1-schnell-fp8",
    ],
  },
  fireworks3: {
    displayName: "Stable Diffusion",
    iconPath: "/provider-icons/stability.png",
    color: "from-orange-500 to-red-500",
    models: [
      "accounts/fireworks/models/stable-diffusion-xl-1024-v1-0",
      "accounts/fireworks/models/japanese-stable-diffusion-xl",
      "accounts/fireworks/models/SSD-1B",
    ],
  },
};

export const MODEL_CONFIGS: Record<ModelMode, Record<ProviderKey, string>> = {
  performance: {
    fireworks1: "accounts/fireworks/models/playground-v2-5-1024px-aesthetic",
    fireworks2: "accounts/fireworks/models/flux-1-dev-fp8",
    fireworks3: "accounts/fireworks/models/stable-diffusion-xl-1024-v1-0",
  },
  quality: {
    fireworks1: "accounts/fireworks/models/playground-v2-1024px-aesthetic",
    fireworks2: "accounts/fireworks/models/flux-1-schnell-fp8",
    fireworks3: "accounts/fireworks/models/japanese-stable-diffusion-xl",
  },
};

export const PROVIDER_ORDER: ProviderKey[] = [
  "fireworks1",
  "fireworks2",
  "fireworks3",
];

export const initializeProviderRecord = <T>(defaultValue?: T) =>
  Object.fromEntries(
    PROVIDER_ORDER.map((key) => [key, defaultValue])
  ) as Record<ProviderKey, T>;
