import { useEffect, useRef, useState } from "react";
import {
  IoChevronDown,
  IoChevronUp,
  IoCloudUploadOutline,
  IoPlay,
  IoStop,
} from "react-icons/io5";
import { useVoiceStore } from "~/stores/voice-store";
import type { ServiceType } from "~/types/services";
import {
  generateTextToSpeech,
  generationStatus,
} from "~/actions/generate-speech";
import { useToast } from "~/hooks/use-toast";

export function VoiceSelector({ service }: { service: ServiceType }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const getVoices = useVoiceStore((state) => state.getVoices);
  const getSelectedVoice = useVoiceStore((state) => state.getSelectedVoice);
  const selectVoice = useVoiceStore((state) => state.selectVoice);
  const loadVoices = useVoiceStore((state) => state.loadVoices);

  const voices = getVoices(service);
  const selectedVoice = getSelectedVoice(service);

  // Add voice loading initialization
  useEffect(() => {
    void loadVoices().catch((error) => {
      console.error("Failed to load voices:", error);
    });
  }, [loadVoices]);

  // State for file upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for voice preview
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Voice preview functionality
  const handlePlayVoice = async (voiceId: string) => {
    if (playingVoiceId === voiceId) {
      // Stop playing
      const audio = audioRefs.current[voiceId];
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setPlayingVoiceId(null);
      return;
    }

    // Stop any currently playing audio
    if (playingVoiceId) {
      const currentAudio = audioRefs.current[playingVoiceId];
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    }

    try {
      setPlayingVoiceId(voiceId);

      // Generate a sample audio for the voice
      const result = await generateTextToSpeech(
        "Hello, this is a voice preview.",
        voiceId,
      );

      // Poll for the audio generation to complete
      const pollForAudio = async (audioId: string): Promise<string | null> => {
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds max

        while (attempts < maxAttempts) {
          const status = await generationStatus(audioId);

          if (status.success && status.audioUrl) {
            return status.audioUrl;
          }

          if (!status.success) {
            throw new Error("Voice generation failed");
          }

          // Wait 1 second before polling again
          await new Promise((resolve) => setTimeout(resolve, 1000));
          attempts++;
        }

        throw new Error("Voice preview generation timed out");
      };

      const audioUrl = await pollForAudio(result.audioId);

      if (!audioUrl) {
        throw new Error("Failed to get audio URL");
      }

      // Create or get audio element
      if (!audioRefs.current[voiceId]) {
        audioRefs.current[voiceId] = new Audio();
      }

      const audio = audioRefs.current[voiceId];
      if (audio) {
        audio.src = audioUrl;

        // Set up event listeners
        audio.onended = () => {
          setPlayingVoiceId(null);
        };

        audio.onerror = () => {
          setPlayingVoiceId(null);
          console.error("Error playing voice preview");
        };

        await audio.play();
      }
    } catch (error) {
      console.error("Error generating voice preview:", error);
      setPlayingVoiceId(null);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadError(null);
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError("File size must be less than 10MB.");
        setSelectedFile(null);
        return;
      }

      // Note: Validating audio duration (max 30s) client-side requires reading the audio file.
      // This can be done using the Web Audio API (AudioContext.decodeAudioData).
      // For brevity, this example omits direct duration validation here, assuming server-side validation.
      // You might want to add it for better UX.
      // Example: const audio = new Audio(URL.createObjectURL(file)); audio.onloadedmetadata = () => { if (audio.duration > 30) setUploadError("Audio duration must be 30s or less.")}

      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError("Please select a file to upload.");
      return;
    }
    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    // Remove extension and replace dots with underscores for voice_name
    const baseName = selectedFile.name
      .replace(/\.[^/.]+$/, "")
      .replace(/\./g, "_");
    formData.append("voice_name", baseName);

    try {
      // Determine API endpoint based on service
      let apiPath = "";
      if (service === "styletts2") {
        apiPath = "/api/styletts2-upload-voice"; // Example, adjust to your actual API route
      } else if (service === "seedvc") {
        apiPath = "/api/seedvc-upload-voice"; // Example, adjust to your actual API route
      }

      if (!apiPath) {
        throw new Error("Service not configured for upload.");
      }

      const response = await fetch(apiPath, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = "Failed to upload voice.";
        try {
          const errorData = (await response.json()) as { detail?: string };
          errorMessage = errorData.detail ?? errorMessage;
        } catch {
          // If JSON parsing fails, use default message
        }
        throw new Error(errorMessage);
      }

      const result: unknown = await response.json();

      // Show success toast
      toast({
        title: "Voice Upload Successful",
        description:
          "Your voice has been uploaded and is being processed in the background.",
      });

      console.log(
        "Voice upload initiated. It will be processed in the background.",
        result,
      );
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Reload voices after successful upload
      void loadVoices().catch((error) => {
        console.error("Failed to reload voices after upload:", error);
      });
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError(
        error instanceof Error ? error.message : "An unknown error occurred.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative" ref={dropdownRef}>
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-foreground hover:cursor-pointer hover:bg-muted/50"
        >
          <div className="flex items-center">
            <div
              className="relative mr-2.5 flex h-4 w-4 items-center justify-center overflow-hidden rounded-full"
              style={{ background: selectedVoice?.gradientColors }}
            ></div>
            <span className="text-sm">
              {selectedVoice?.name ?? "No voice selected"}
            </span>
          </div>
          {isOpen ? (
            <IoChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <IoChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        {isOpen && (
          <div className="absolute left-0 right-0 z-10 mt-1 max-h-60 overflow-auto rounded-lg border border-border bg-background shadow-lg">
            {voices.map((voice) => (
              <div
                key={voice.id}
                className={`flex items-center px-3 py-2 text-foreground hover:cursor-pointer hover:bg-muted ${voice.id === selectedVoice?.id ? "bg-muted/50" : ""}`}
                onClick={() => {
                  selectVoice(service, voice.id);
                  setIsOpen(false);
                }}
              >
                <div
                  className="relative mr-2 flex h-4 w-4 items-center justify-center overflow-hidden rounded-full"
                  style={{ background: voice.gradientColors }}
                />
                <span className="text-sm">{voice.name}</span>
                {/* Play button for voice preview */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void handlePlayVoice(voice.id);
                  }}
                  className="ml-auto rounded-full p-1 text-muted-foreground hover:bg-muted"
                  title={
                    playingVoiceId === voice.id
                      ? "Stop preview"
                      : "Play preview"
                  }
                >
                  {playingVoiceId === voice.id ? (
                    <IoStop className="h-4 w-4" />
                  ) : (
                    <IoPlay className="h-4 w-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
        {/* Voice Upload Section */}
        {/* Show upload for StyleTTS2 or SeedVC */}
        {(service === "styletts2" || service === "seedvc") && (
          <div className="mt-2 rounded-lg border border-border bg-background p-3 shadow-sm">
            <h3 className="mb-2 text-sm font-medium text-foreground">
              Upload New Voice
            </h3>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="mb-2 block w-full text-sm text-muted-foreground file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-950/30 dark:file:text-blue-400 dark:hover:file:bg-blue-900/50"
            />
            {selectedFile && (
              <p className="mb-1 text-xs text-muted-foreground">
                Selected: {selectedFile.name} (
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
            {uploadError && (
              <p className="mb-2 text-xs text-destructive">{uploadError}</p>
            )}
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="flex w-full items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <svg
                    className="mr-2 h-4 w-4 animate-spin text-current"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <IoCloudUploadOutline className="mr-2 h-4 w-4" />
                  Upload Voice
                </>
              )}
            </button>
            <p className="mt-1 text-center text-xs text-muted-foreground">
              Max 10MB, recommended
              {service === "styletts2" ? "3-30s" : "3-10s"} audio.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
