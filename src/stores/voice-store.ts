import { create } from "zustand";
import type { ServiceType } from "~/types/services";

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
  service: ServiceType;
  voiceType?: string;
  previewUrl?: string | null;
}

type VoiceServiceType = "styletts2" | "seedvc" | "make-an-audio";

interface VoiceApiResponse {
  voices: string[];
  voicePreviews?: Array<{
    id: string;
    name: string;
    service: string;
    voiceType?: string;
    previewUrl: string | null;
  }>;
  voicesWithDetails?: Array<{
    id: string;
    name: string;
    service: string;
    voiceType?: string;
    previewUrl: string | null;
  }>;
}

const fetchStyleTTS2Voices = async (): Promise<Voice[]> => {
  try {
    const response = await fetch(`/api/voices/styletts2`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch StyleTTS2 voices: ${response.statusText}`,
      );
    }

    const data = (await response.json()) as VoiceApiResponse;
    let gradientIndex = 0;

    return (data.voicesWithDetails ?? []).map((voice) => ({
      id: voice.id,
      name: voice.name,
      gradientColors: generateGradientColor(gradientIndex++),
      service: "styletts2" as ServiceType,
      voiceType: voice.voiceType,
      previewUrl: voice.previewUrl,
    }));
  } catch (error) {
    console.error("Error fetching StyleTTS2 voices:", error);
    return [];
  }
};

const fetchSeedVCVoices = async (): Promise<Voice[]> => {
  try {
    const response = await fetch(`/api/voices/seedvc`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch SeedVC voices: ${response.statusText}`);
    }

    const data = (await response.json()) as VoiceApiResponse;
    let gradientIndex = 0;

    return (data.voicesWithDetails ?? []).map((voice) => ({
      id: voice.id,
      name: voice.name,
      gradientColors: generateGradientColor(gradientIndex++),
      service: "seedvc" as ServiceType,
      voiceType: voice.voiceType,
      previewUrl: voice.previewUrl,
    }));
  } catch (error) {
    console.error("Error fetching SeedVC voices:", error);
    return [];
  }
};

const fetchMakeAnAudioVoices = async (): Promise<Voice[]> => {
  try {
    const response = await fetch(`/api/voices/make-an-audio`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Make-An-Audio voices: ${response.statusText}`,
      );
    }

    const data = (await response.json()) as VoiceApiResponse;
    let gradientIndex = 0;

    return (data.voicesWithDetails ?? []).map((voice) => ({
      id: voice.id,
      name: voice.name,
      gradientColors: generateGradientColor(gradientIndex++),
      service: "make-an-audio" as ServiceType,
      voiceType: voice.voiceType,
      previewUrl: voice.previewUrl,
    }));
  } catch (error) {
    console.error("Error fetching Make-An-Audio voices:", error);
    return [];
  }
};

// Generate voices dynamically from database APIs
const generateVoicesFromAPI = async (): Promise<Voice[]> => {
  const styletts2Voices = await fetchStyleTTS2Voices();
  const seedvcVoices = await fetchSeedVCVoices();
  const makeAnAudioVoices = await fetchMakeAnAudioVoices();

  return [...styletts2Voices, ...seedvcVoices, ...makeAnAudioVoices];
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
    return get().voices.filter((voice) => voice.service === service);
  },

  getSelectedVoice: (service) => {
    return get().selectedVoices[service];
  },

  selectVoice: (service, voiceId) => {
    const serviceVoices = get().voices.filter(
      (voice) => voice.service === service,
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
