import { create } from "zustand";
import { ServiceType } from "~/types/services";

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
  service: ServiceType;
}

// API function to fetch voices from StyleTTS2 (Text-to-Speech)
const fetchStyleTTS2Voices = async (): Promise<string[]> => {
  try {
    const response = await fetch(`/api/voices/styletts2`, { // Updated to internal API route
      method: "GET",
      // Headers like Authorization are handled by the server-side API route
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch StyleTTS2 voices: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    console.error("Error fetching StyleTTS2 voices:", error);
    // Fallback to default StyleTTS2 voices if API fails
    return ["default-styletts2-voice1", "default-styletts2-voice2"]; // Example fallback
  }
};

// API function to fetch voices from SeedVC (Speech-to-Speech)
const fetchSeedVCVoices = async (): Promise<string[]> => {
  try {
    const response = await fetch(`/api/voices/seedvc`, { // Updated to internal API route
      method: "GET",
      // Headers like Authorization are handled by the server-side API route
    });
    
    console.log('rsep' + response);

    if (!response.ok) {
      throw new Error(`Failed to fetch SeedVC voices: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    console.error("Error fetching SeedVC voices:", error);
    // Fallback to default SeedVC voices if API fails
    return ["default-seedvc-voice1", "default-seedvc-voice2"]; // Example fallback
  }
};

// Generate voices dynamically from both APIs
const generateVoicesFromAPI = async (): Promise<Voice[]> => {
  const styletts2VoiceIds = await fetchStyleTTS2Voices();
  const seedvcVoiceIds = await fetchSeedVCVoices();
  const voices: Voice[] = [];
  let gradientIndex = 0;

  // Add StyleTTS2 voices
  styletts2VoiceIds.forEach((voiceId) => {
    voices.push({
      id: voiceId,
      name: voiceId.charAt(0).toUpperCase() + voiceId.slice(1), // Capitalize first letter
      gradientColors: generateGradientColor(gradientIndex++),
      service: "styletts2",
    });
  });
  
  // Add SeedVC voices
  seedvcVoiceIds.forEach((voiceId) => {
    voices.push({
      id: voiceId,
      name: voiceId.charAt(0).toUpperCase() + voiceId.slice(1),
      gradientColors: generateGradientColor(gradientIndex++),
      service: "seedvc",
    });
  });
  
  // Add Make-An-Audio voices (if any, or keep as placeholder)
  // For now, let's assume Make-An-Audio doesn't fetch from an API in the same way
  // or you might have a different way to populate these.
  // If they also come from an API, we can add another fetch function.
  const makeAnAudioVoices = [{ id: "maa-default", name: "Default MAA", service: "make-an-audio" as ServiceType }]; 
  makeAnAudioVoices.forEach((voiceInfo) => {
    voices.push({
      id: voiceInfo.id,
      name: voiceInfo.name,
      gradientColors: generateGradientColor(gradientIndex++),
      service: voiceInfo.service,
    });
  });

  return voices;
};

interface VoiceState {
  voices: Voice[];
  selectedVoices: Record<ServiceType, Voice | null>;
  isLoading: boolean;
  error: string | null;
  loadVoices: () => Promise<void>;
  getVoices: (service: ServiceType) => Voice[];
  getSelectedVoice: (service: ServiceType) => Voice | null;
  selectVoice: (service: ServiceType, voice: string) => void;
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
      const defaultStyleTTS2Voice = voices.find((v) => v.service === "styletts2") ?? null;
      const defaultSeedVCVoice = voices.find((v) => v.service === "seedvc") ?? null;
      // Assuming make-an-audio might not have a default selectable voice in the same way, or it's handled differently
      const defaultMakeAnAudioVoice = voices.find((v) => v.service === "make-an-audio") ?? null;

      set({
        voices,
        selectedVoices: {
          styletts2: defaultStyleTTS2Voice,
          seedvc: defaultSeedVCVoice,
          "make-an-audio": defaultMakeAnAudioVoice, // Or keep null if not applicable
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
      serviceVoices.find((voice) => voice.id === voiceId) || serviceVoices[0];

    set((state) => ({
      selectedVoices: {
        ...state.selectedVoices,
        [service]: selectedVoice,
      },
    }));
  },
}));
