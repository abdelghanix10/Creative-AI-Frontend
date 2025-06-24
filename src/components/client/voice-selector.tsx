import { useEffect, useRef, useState } from "react";
import {
  IoChevronDown,
  IoChevronUp,
  IoCloudUploadOutline,
  IoPlay,
  IoStop,
} from "react-icons/io5";
import { useVoiceStore } from "~/stores/voice-store";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";

type VoiceServiceType = "styletts2" | "seedvc" | "make-an-audio";

export function VoiceSelector({ service }: { service: VoiceServiceType }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();

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

  // Add voice loading initialization
  useEffect(() => {
    void loadVoices().catch((error) => {
      console.error("Failed to load voices:", error);
    });
  }, [loadVoices]);

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

  // Voice preview functionality - uses S3 URLs directly from voice data
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

      // Find the voice in the current service's voices
      const voice = voices.find((v) => v.id === voiceId);

      if (!voice) {
        throw new Error("Voice not found");
      }

      if (!voice.previewUrl) {
        throw new Error("No preview URL available for this voice");
      }

      // Create or get audio element
      if (!audioRefs.current[voiceId]) {
        audioRefs.current[voiceId] = new Audio();
      }

      const audio = audioRefs.current[voiceId];
      if (audio) {
        audio.src = voice.previewUrl;

        // Set up event listeners
        audio.onended = () => {
          setPlayingVoiceId(null);
        };

        audio.onerror = () => {
          setPlayingVoiceId(null);
          console.error("Error playing voice preview");
          toast.error(
            "Failed to play voice preview. The audio file may not be available.",
          );
        };

        await audio.play();
      }
    } catch (error) {
      console.error("Error playing voice preview:", error);
      setPlayingVoiceId(null);
      toast.error("Failed to play voice preview.");
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

      await response.json();

      // Start polling for voice list updates
      let pollAttempts = 0;
      const maxPollAttempts = 30; // Poll for up to 5 minutes (30 * 10s = 300s)

      const pollForVoiceUpdate = async () => {
        try {
          const voicesBeforeUpdate = getVoices(service).length;
          await loadVoices();
          const voicesAfterUpdate = getVoices(service).length;

          if (voicesAfterUpdate > voicesBeforeUpdate) {
            // New voice detected
            toast.success(
              "Voice processing completed! Your new voice is now available.",
              {
                duration: 5000,
              },
            );
            // Reset form state first
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";

            setIsUploading(false);
            return; // Stop polling
          }

          pollAttempts++;
          if (pollAttempts < maxPollAttempts) {
            // Continue polling every 10 seconds
            setTimeout(() => {
              void pollForVoiceUpdate();
            }, 10000);
          } else {
            // Max attempts reached
            toast(
              "Voice processing is taking longer than expected. Please check back later.",
              {
                duration: 7000,
                icon: "⚠️",
              },
            );
          }
        } catch (error) {
          console.error("Failed to check for voice updates:", error);
          setUploadError(
            error instanceof Error
              ? error.message
              : "An unknown error occurred.",
          );
          pollAttempts++;
          if (pollAttempts < maxPollAttempts) {
            setTimeout(() => {
              void pollForVoiceUpdate();
            }, 10000);
          }
        }
      };

      // Start first poll after 10 seconds (give backend time to start processing)
      setTimeout(() => {
        void pollForVoiceUpdate();
      }, 10000);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError(
        error instanceof Error ? error.message : "An unknown error occurred.",
      );
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
            {/* Group voices by service type */}
            {/* Group voices by service type */}
            {(() => {
              const systemVoices = voices.filter(
                (voice) => voice.voiceType === "system",
              );
              const userVoices = voices.filter(
                (voice) => voice.voiceType !== "system",
              );

              return (
                <>
                  {/* System Voices Section */}
                  {systemVoices.length > 0 && (
                    <>
                      <div className="border-b border-border bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
                        System Voices
                      </div>
                      {systemVoices.map((voice) => (
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
                            disabled={!voice.previewUrl}
                            className={`ml-auto rounded-full p-1 text-muted-foreground hover:bg-muted ${!voice.previewUrl ? "cursor-not-allowed opacity-50" : ""}`}
                            title={
                              !voice.previewUrl
                                ? "Preview not available"
                                : playingVoiceId === voice.id
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
                    </>
                  )}

                  {/* User Voices Section */}
                  {userVoices.length > 0 && (
                    <>
                      {systemVoices.length > 0 && (
                        <div className="border-b border-border" />
                      )}
                      <div className="border-b border-border bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
                        User Voices
                      </div>
                      {userVoices.map((voice) => (
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
                            disabled={!voice.previewUrl}
                            className={`ml-auto rounded-full p-1 text-muted-foreground hover:bg-muted ${!voice.previewUrl ? "cursor-not-allowed opacity-50" : ""}`}
                            title={
                              !voice.previewUrl
                                ? "Preview not available"
                                : playingVoiceId === voice.id
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
                    </>
                  )}
                </>
              );
            })()}
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
              Max 2MB, recommended
              {service === "styletts2" ? "3-30s" : "3-10s"} audio.
            </p>
          </div>
        )}

        {/* Admin System Voice Upload Section */}
        {session?.user?.role === "ADMIN" && (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 shadow-sm dark:border-amber-800 dark:bg-amber-950/20">
            <h3 className="mb-2 text-sm font-medium text-amber-900 dark:text-amber-100">
              🔧 Admin: Upload System Voice
            </h3>
            <SystemVoiceUpload
              service={service}
              onUploadSuccess={() => void loadVoices()}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Admin-only System Voice Upload Component
function SystemVoiceUpload({
  service,
  onUploadSuccess,
}: {
  service: VoiceServiceType;
  onUploadSuccess: () => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    formData.append("service", service);

    try {
      // Use a server-side API route that will handle the external API calls
      const apiPath = `/api/admin/upload-system-voice`;

      const response = await fetch(apiPath, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        let errorMessage = "Failed to upload system voice.";
        try {
          const errorData = (await response.json()) as { detail?: string };
          errorMessage = errorData.detail ?? errorMessage;
        } catch {
          // If JSON parsing fails, use default message
        }
        throw new Error(errorMessage);
      }

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      // Reset form state first
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Show success toast
      toast.success("System voice has been uploaded successfully!", {
        duration: 5000,
      });

      console.log("System voice upload completed:", result);

      // Reload voices and call success callback
      onUploadSuccess();
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
    <>
      <input
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        ref={fileInputRef}
        className="mb-2 block w-full text-sm text-muted-foreground file:mr-4 file:rounded-full file:border-0 file:bg-amber-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-amber-700 hover:file:bg-amber-100 dark:file:bg-amber-950/30 dark:file:text-amber-400 dark:hover:file:bg-amber-900/50"
      />
      {selectedFile && (
        <p className="mb-1 text-xs text-amber-700 dark:text-amber-300">
          Selected: {selectedFile.name} (
          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
        </p>
      )}
      {uploadError && (
        <p className="mb-2 text-xs text-red-600 dark:text-red-400">
          {uploadError}
        </p>
      )}
      <button
        onClick={handleUpload}
        disabled={!selectedFile || isUploading}
        className="flex w-full items-center justify-center rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-700 dark:hover:bg-amber-600"
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
            Upload System Voice
          </>
        )}
      </button>
      <p className="mt-1 text-center text-xs text-amber-700 dark:text-amber-300">
        This will be available to all users as a system voice.
      </p>
    </>
  );
}
