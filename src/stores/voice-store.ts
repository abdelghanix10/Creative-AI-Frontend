import { create } from "zustand";

// Define voice-related services
export type VoiceServiceType = "styletts2" | "seedvc" | "make-an-audio";
export type AllVoiceServiceType = VoiceServiceType | "system";

// Auto-generate gradient colors based on voice count
const generateGradientColor = (index: number): string => {
  const colorSets = [
    ["#8b5cf6", "#ec4899", "#ffffff", "#3b82f6"], // Purple to Pink to White to Blue
    ["#3b82f6", "#10b981", "#ffffff", "#f59e0b"], // Blue to Green to White to Orange
    ["#ec4899", "#f97316", "#ffffff", "#8b5cf6"], // Pink to Orange to White to Purple
    ["#10b981", "#3b82f6", "#ffffff", "#f43f5e"], // Green to Blue to White to Red
    ["#f43f5e", "#f59e0b", "#ffffff", "#10b981"], // Red to Orange to White to Green
    ["#6366f1", "#8b5cf6", "#ffffff", "#06b6d4"], // Indigo to Purple to White to Cyan
    ["#f59e0b", "#ef4444", "#ffffff", "#22c55e"], // Orange to Red to White to Green
    ["#06b6d4", "#3b82f6", "#ffffff", "#a855f7"], // Cyan to Blue to White to Purple
  ];

  const colors = colorSets[index % colorSets.length]!;
  return `linear-gradient(45deg, ${colors.join(", ")})`;
};

export interface Voice {
  id: string;
  name: string;
  gradientColors: string;
  service: AllVoiceServiceType;
  previewUrl?: string; // Optional S3 URL for voice preview
}

// API function to fetch user voices from database for StyleTTS2 service
const fetchStyleTTS2Voices = async (): Promise<{
  voices: string[];
  previews: { id: string; previewUrl: string | null }[];
  details: {
    id: string;
    name: string;
    service: string;
    previewUrl: string | null;
  }[];
}> => {
  try {
    const response = await fetch(`/api/voices/styletts2`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch StyleTTS2 voices: ${response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      voices?: string[];
      voicePreviews?: { id: string; previewUrl: string | null }[];
      voicesWithDetails?: {
        id: string;
        name: string;
        service: string;
        previewUrl: string | null;
      }[];
    };
    return {
      voices: data.voices ?? [],
      previews: data.voicePreviews ?? [],
      details: data.voicesWithDetails ?? [],
    };
  } catch (error) {
    console.error("Error fetching StyleTTS2 voices:", error);
    // Return empty array if API fails since we're fetching from database
    return {
      voices: [],
      previews: [],
      details: [],
    };
  }
};

// API function to fetch user voices from database for SeedVC service
const fetchSeedVCVoices = async (): Promise<{
  voices: string[];
  previews: { id: string; previewUrl: string | null }[];
  details: {
    id: string;
    name: string;
    service: string;
    previewUrl: string | null;
  }[];
}> => {
  try {
    const response = await fetch(`/api/voices/seedvc`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch SeedVC voices: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      voices?: string[];
      voicePreviews?: { id: string; previewUrl: string | null }[];
      voicesWithDetails?: {
        id: string;
        name: string;
        service: string;
        previewUrl: string | null;
      }[];
    };
    return {
      voices: data.voices ?? [],
      previews: data.voicePreviews ?? [],
      details: data.voicesWithDetails ?? [],
    };
  } catch (error) {
    console.error("Error fetching SeedVC voices:", error);
    // Return empty array if API fails since we're fetching from database
    return {
      voices: [],
      previews: [],
      details: [],
    };
  }
};

// API function to fetch user voices from database for Make-An-Audio service
const fetchMakeAnAudioVoices = async (): Promise<{
  voices: string[];
  previews: { id: string; previewUrl: string | null }[];
  details: {
    id: string;
    name: string;
    service: string;
    previewUrl: string | null;
  }[];
}> => {
  try {
    const response = await fetch(`/api/voices/make-an-audio`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Make-An-Audio voices: ${response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      voices?: string[];
      voicePreviews?: { id: string; previewUrl: string | null }[];
      voicesWithDetails?: {
        id: string;
        name: string;
        service: string;
        previewUrl: string | null;
      }[];
    };
    return {
      voices: data.voices ?? [],
      previews: data.voicePreviews ?? [],
      details: data.voicesWithDetails ?? [],
    };
  } catch (error) {
    console.error("Error fetching Make-An-Audio voices:", error);
    // Return empty array if API fails since we're fetching from database
    return {
      voices: [],
      previews: [],
      details: [],
    };
  }
};

// Generate voices dynamically from database APIs
const generateVoicesFromAPI = async (): Promise<Voice[]> => {
  const styletts2Data = await fetchStyleTTS2Voices();
  const seedvcData = await fetchSeedVCVoices();
  const makeAnAudioData = await fetchMakeAnAudioVoices();
  const voices: Voice[] = [];
  const voiceIds = new Set<string>(); // Track unique voice IDs to prevent duplicates
  let gradientIndex = 0;

  // Add StyleTTS2 voices using detailed information
  styletts2Data.details.forEach((voiceDetail) => {
    if (!voiceIds.has(voiceDetail.id)) {
      voiceIds.add(voiceDetail.id);
      voices.push({
        id: voiceDetail.id,
        name: voiceDetail.name,
        gradientColors: generateGradientColor(gradientIndex++),
        service: voiceDetail.service === "system" ? "system" : "styletts2",
        previewUrl: voiceDetail.previewUrl ?? undefined,
      });
    }
  });

  // Add SeedVC voices using detailed information
  seedvcData.details.forEach((voiceDetail) => {
    if (!voiceIds.has(voiceDetail.id)) {
      voiceIds.add(voiceDetail.id);
      voices.push({
        id: voiceDetail.id,
        name: voiceDetail.name,
        gradientColors: generateGradientColor(gradientIndex++),
        service: voiceDetail.service === "system" ? "system" : "seedvc",
        previewUrl: voiceDetail.previewUrl ?? undefined,
      });
    }
  });

  // Add Make-An-Audio voices using detailed information
  makeAnAudioData.details.forEach((voiceDetail) => {
    if (!voiceIds.has(voiceDetail.id)) {
      voiceIds.add(voiceDetail.id);
      voices.push({
        id: voiceDetail.id,
        name: voiceDetail.name,
        gradientColors: generateGradientColor(gradientIndex++),
        service: voiceDetail.service === "system" ? "system" : "make-an-audio",
        previewUrl: voiceDetail.previewUrl ?? undefined,
      });
    }
  });

  return voices;
};

interface VoiceState {
  voices: Voice[];
  selectedVoices: Record<VoiceServiceType, Voice | null>;
  isLoading: boolean;
  error: string | null;
  loadVoices: () => Promise<void>;
  getVoices: (service: VoiceServiceType) => Voice[];
  getSelectedVoice: (service: VoiceServiceType) => Voice | null;
  selectVoice: (service: VoiceServiceType, voice: string) => void;
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  voices: [],
  selectedVoices: {
    styletts2: null,
    seedvc: null,
    "make-an-audio": null,
  },
  isLoading: false,
  error: null,

  loadVoices: async () => {
    set({ isLoading: true, error: null });

    try {
      const voices = await generateVoicesFromAPI();
      const defaultStyleTTS2Voice =
        voices.find((v) => v.service === "styletts2") ?? null;
      const defaultSeedVCVoice =
        voices.find((v) => v.service === "seedvc") ?? null;
      const defaultMakeAnAudioVoice =
        voices.find((v) => v.service === "make-an-audio") ?? null;

      set({
        voices,
        selectedVoices: {
          styletts2: defaultStyleTTS2Voice,
          seedvc: defaultSeedVCVoice,
          "make-an-audio": defaultMakeAnAudioVoice,
        },
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to load voices:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to load voices",
        isLoading: false,
      });
    }
  },

  getVoices: (service) => {
    return get().voices.filter(
      (voice) => voice.service === "styletts2" || voice.service === "seedvc" || voice.service === "system",
    );
  },

  getSelectedVoice: (service) => {
    return get().selectedVoices[service];
  },

  selectVoice: (service, voiceId) => {
    const serviceVoices = get().voices.filter(
      (voice) => voice.service === service || voice.service === "system",
    );

    const selectedVoice =
      serviceVoices.find((voice) => voice.id === voiceId) ?? serviceVoices[0];

    set((state) => ({
      selectedVoices: {
        ...state.selectedVoices,
        [service]: selectedVoice,
      },
    }));
  },
}));
