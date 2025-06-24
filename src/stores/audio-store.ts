import { addIssueToContext } from "zod";
import { create } from "zustand";
import { audioManager } from "~/utils/audio-manager";

export interface AudioInfo {
  id: string;
  title: string;
  voice: string | null;
  audioUrl: string;
  duration?: string;
  progress?: number;
  createdAt?: string;
  service?: string;
}

interface AudioState {
  currentAudio: AudioInfo | null;
  isPlaying: boolean;
  isPlaybarOpen: boolean;
  progress: number;
  duration: string;

  setCurrentAudio: (audio: AudioInfo) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setIsPlaybarOpen: (isOpen: boolean) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: string) => void;

  playAudio: (audio: AudioInfo) => void;
  togglePlayPause: () => void;
  togglePlaybar: () => void;
  skipForward: () => void;
  skipBackward: () => void;
  downloadAudio: () => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  currentAudio: null,
  isPlaying: false,
  isPlaybarOpen: false,
  progress: 50,
  duration: "0:00",

  setCurrentAudio: (audio) => set({ currentAudio: audio }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setIsPlaybarOpen: (isPlaybarOpen) => set({ isPlaybarOpen }),
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),

  playAudio: async (audio) => {
    const currentAudioInfo = get().currentAudio;
    const audioElement = audioManager.initialize(); // Should always return the same instance or new if null

    if (!audioElement) {
      console.error("Audio element not initialized");
      set({ isPlaying: false });
      return;
    }

    // If it's the exact same audio URL and it's already trying to play or is playing,
    // or if the request is to play the current audio again, toggle it.
    if (currentAudioInfo && currentAudioInfo.audioUrl === audio.audioUrl) {
      // If it's already playing, and this function is called again for the same audio,
      // it implies a desire to restart or toggle. Let's stick to toggle.
      get().togglePlayPause();
      return;
    }

    // --- Critical section for changing audio source ---
    // 1. Explicitly pause if playing. This is crucial.
    if (!audioElement.paused) {
      audioElement.pause(); // Direct pause on the element
    }

    // 2. Update store state for the new audio. 
    // Set isPlaying to false initially. It will be set to true upon successful playback.
    set({
      currentAudio: audio,
      isPlaybarOpen: true,
      isPlaying: false, 
    });

    // 3. Load and play the new audio source.
    try {
      // Set the new source. The browser will cancel previous loads/plays on this element.
      audioManager.setAudioSource(audio.audioUrl); 
      // audioElement.load(); // Explicit load after setting new src. Often good practice.
      await audioElement.play(); // This is the play call we want to succeed.
      set({ isPlaying: true }); // Playback started successfully.
    } catch (err) {
      console.error("Error playing audio: ", err);
      // If an error occurs (including AbortError if another action interrupts this one),
      // ensure isPlaying is false.
      set(state => ({
        // Only set isPlaying to false if the error is for the *current* audio attempt
        isPlaying: state.currentAudio?.audioUrl === audio.audioUrl ? false : state.isPlaying
      }));
    }
    // --- End of critical section ---
  },

  togglePlayPause: async () => {
    const isPlayingState = get().isPlaying;
    const audioElement = audioManager.getAudio();
    const currentAudioInfo = get().currentAudio;

    if (!audioElement || !currentAudioInfo) return;

    if (isPlayingState) {
      audioElement.pause(); // Direct pause
      set({ isPlaying: false });
    } else {
      try {
        // If src is not set or different, set it. This can happen if playAudio failed before.
        if (audioElement.src !== currentAudioInfo.audioUrl) {
          audioManager.setAudioSource(currentAudioInfo.audioUrl);
          // audioElement.load(); 
        }
        await audioElement.play();
        set({ isPlaying: true });
      } catch (err) {
        console.error("Error in togglePlayPause while trying to play: ", err);
        set({ isPlaying: false });
      }
    }
  },

  togglePlaybar: () => set({ isPlaybarOpen: !get().isPlaybarOpen }),

  skipForward: () => {
    audioManager.skipForward();
  },

  skipBackward: () => {
    audioManager.skipBackward();
  },

  downloadAudio: () => {
    const audio = get().currentAudio;
    if (!audio?.audioUrl) return;

    const link = document.createElement("a");
    link.href = audio.audioUrl;
    link.download = `${audio.title || "audio"}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
}));
