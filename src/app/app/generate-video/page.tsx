"use client";

import { useState, useEffect, useRef } from "react";
import { fal } from "@fal-ai/client";
import { PageLayout } from "~/components/client/page-layout";
import AI_Prompt from "~/components/client/video/prompt";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Play, Loader2, CheckCircle, Download } from "lucide-react";
import { VideoPlayer } from "~/components/client/video/VideoPlayer";

// Configure fal client to use the proxy
fal.config({
  proxyUrl: "/api/fal/proxy",
});

type QueueStatus = {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  logs?: Array<{ message: string }>;
  request_id: string;
};

type VideoResponse = {
  data: {
    video: {
      url: string;
    };
  };
};

export default function VideoGenerator() {
  const [image, setImage] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedApiEndpoint, setSelectedApiEndpoint] = useState<string>(
    "fal-ai/ltx-video-13b-distilled",
  );
  const [videoSettings, setVideoSettings] = useState({
    duration: "5",
    aspectRatio: "16:9",
    resolution: "720",
  });
  const [videoMode, setVideoMode] = useState<
    "text-to-video" | "image-to-video"
  >("image-to-video");
  const pollingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const generationContextRef = useRef<{
    prompt: string;
    imageUrl?: string;
    videoMode: "text-to-video" | "image-to-video";
    videoSettings: typeof videoSettings;
    selectedApiEndpoint: string;
  } | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);
  const handleImageChange = (file: File | null) => {
    setImage(file);
    setError(null);

    if (file) {
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };
  const handleModelChange = (modelName: string, apiEndpoint: string) => {
    setSelectedApiEndpoint(apiEndpoint);
  };
  const handleSettingsChange = (settings: {
    duration?: string;
    aspectRatio?: string;
    resolution?: string;
  }) => {
    setVideoSettings((prev) => ({
      ...prev,
      ...settings,
    }));
  };

  const handleModeChange = (mode: "text-to-video" | "image-to-video") => {
    setVideoMode(mode);
    // Clear image when switching to text-to-video mode
    if (mode === "text-to-video") {
      setImage(null);
      setImagePreview(null);
    }
  };
  const fetchResult = async (id: string): Promise<VideoResponse> => {
    const response = await fetch(
      `/api/fal/result?requestId=${id}&selectedApiEndpoint=${encodeURIComponent(selectedApiEndpoint)}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch result: ${response.statusText}`);
    }
    return response.json() as Promise<VideoResponse>;
  };

  const checkStatus = async (id: string) => {
    try {
      console.log("Checking status for request:", id);
      const status = (await fal.queue.status(selectedApiEndpoint, {
        requestId: id,
        logs: true,
      })) as QueueStatus;

      console.log("Received status:", status);

      if (status.status === "COMPLETED") {
        console.log("Generation completed, fetching result...");
        try {
          const response = await fetchResult(id);
          console.log("Received result:", response);
          if (response.data?.video?.url) {
            const videoUrl = response.data.video.url;
            setVideoUrl(videoUrl);
            setIsGenerating(false);
            setProgress("Video generation completed!");

            // Save video to database using stored context
            const context = generationContextRef.current;
            if (context) {
              try {
                const saveResponse = await fetch("/api/save-video", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    prompt: context.prompt,
                    provider: "fal-ai",
                    modelId: context.selectedApiEndpoint.includes("ltx")
                      ? "Ltx-Video"
                      : "Kling-AI",
                    mode: context.videoMode,
                    resolution: context.videoSettings.resolution,
                    aspectRatio: context.videoSettings.aspectRatio,
                    duration: context.videoSettings.duration,
                    imageUrl:
                      context.videoMode === "image-to-video" && context.imageUrl
                        ? context.imageUrl
                        : null,
                    videoUrl: videoUrl,
                  }),
                });
                if (!saveResponse.ok) {
                  try {
                    const errorData = (await saveResponse.json()) as {
                      error?: string;
                    };
                    console.error(
                      "Failed to save video to database:",
                      errorData,
                    );

                    // Handle insufficient credits error
                    if (saveResponse.status === 402) {
                      setError(
                        errorData.error ??
                          "Insufficient credits for video generation",
                      );
                    } else {
                      setError("Failed to save video to database");
                    }
                  } catch {
                    setError("Failed to save video to database");
                  }
                } else {
                  console.log("Video saved to database successfully");
                }
              } catch (saveError) {
                console.error("Error saving video to database:", saveError);
                setError("Error saving video to database");
              }
            }
          } else {
            console.error("No video URL in result:", response);
            setError(
              "Video generation completed but no video URL was returned",
            );
            setIsGenerating(false);
            setProgress("");
          }
        } catch (err) {
          console.error("Error fetching result:", err);
          setError("Failed to fetch video data");
          setIsGenerating(false);
          setProgress("");
        }
      } else if (status.status === "FAILED") {
        console.error("Generation failed:", status);
        setError("Video generation failed");
        setIsGenerating(false);
        setProgress("");
      } else if (
        status.status === "IN_PROGRESS" ||
        status.status === "IN_QUEUE"
      ) {
        const lastLog = status.logs?.[status.logs.length - 1]?.message;
        console.log("Still processing, last log:", lastLog);
        setProgress(lastLog ?? "Processing...");
        // Check again in 5 seconds
        pollingTimeoutRef.current = setTimeout(() => {
          void checkStatus(id);
        }, 5000);
      } else {
        console.error("Unknown status:", status.status);
        setError("Received unknown status from server");
        setIsGenerating(false);
        setProgress("");
      }
    } catch (err) {
      console.error("Error checking status:", err);
      setError(err instanceof Error ? err.message : "Failed to check status");
      setIsGenerating(false);
      setProgress("");
    }
  };
  const handleSubmit = async () => {
    // Validation based on video mode
    if (videoMode === "image-to-video") {
      if (!image || !prompt) {
        setError("Please provide both an image and a prompt");
        return;
      }
    } else {
      // text-to-video mode
      if (!prompt) {
        setError("Please provide a prompt");
        return;
      }
    }

    // Clear any existing polling
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
    }

    setIsGenerating(true);
    setError(null);

    try {
      let imageUrl: string | undefined; // Upload image only for image-to-video mode
      if (videoMode === "image-to-video" && image) {
        setProgress("Uploading image...");
        imageUrl = await fal.storage.upload(image);
      }

      // Store generation context for later use in saving
      generationContextRef.current = {
        prompt,
        imageUrl,
        videoMode,
        videoSettings,
        selectedApiEndpoint,
      };

      setProgress("Starting video generation...");

      // Prepare model-specific input parameters
      const inputParams: Record<string, unknown> = {
        prompt,
        aspect_ratio: videoSettings.aspectRatio,
      };

      // Add image URL for image-to-video mode
      if (videoMode === "image-to-video" && imageUrl) {
        inputParams.image_url = imageUrl;
      }

      // Add model-specific parameters
      if (selectedApiEndpoint.includes("kling-video")) {
        // Kling Video specific parameters
        inputParams.duration = videoSettings.duration; // Kling expects "5" not "5s"
      } else if (selectedApiEndpoint.includes("ltx-video")) {
        // LTX Video specific parameters
        inputParams.width = videoSettings.resolution === "720" ? 1280 : 854;
        inputParams.height = videoSettings.resolution === "720" ? 720 : 480;

        // Set aspect ratio specific dimensions
        if (videoSettings.aspectRatio === "9:16") {
          inputParams.width = videoSettings.resolution === "720" ? 720 : 480;
          inputParams.height = videoSettings.resolution === "720" ? 1280 : 854;
        } else if (videoSettings.aspectRatio === "1:1") {
          inputParams.width = videoSettings.resolution === "720" ? 720 : 480;
          inputParams.height = videoSettings.resolution === "720" ? 720 : 480;
        }
      }

      // Submit to queue
      const { request_id } = await fal.queue.submit(selectedApiEndpoint, {
        input: inputParams,
      });

      console.log("Submitted request with ID:", request_id);
      // Start checking status
      void checkStatus(request_id);
    } catch (err) {
      console.error("Error submitting request:", err);
      setError(err instanceof Error ? err.message : "Failed to generate video");
      setIsGenerating(false);
      setProgress("");
    }
  };
  return (
    <PageLayout
      title="AI Video Generator"
      service="text2video"
      showSidebar={false}
    >
      <div className="flex h-full flex-col gap-8">
        {/* Output Section */}
        <div className="flex items-center justify-center">
          {!prompt && !isGenerating && !videoUrl && (
            // Initial state - show placeholder
            <Card className="w-full max-w-2xl">
              <CardContent className="flex h-96 items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Play className="mx-auto mb-4 h-16 w-16 opacity-50" />{" "}
                  <p className="text-lg">
                    Your generated video will appear here
                  </p>
                  <p className="mt-2 text-sm">
                    Choose between text-to-video or image-to-video mode and
                    enter a prompt to get started
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {isGenerating && (
            // Loading state - show preloader
            <Card className="w-full max-w-2xl">
              <CardContent className="flex h-96 items-center justify-center">
                <div className="text-center">
                  <Loader2 className="mx-auto mb-4 h-16 w-16 animate-spin text-primary" />
                  <p className="text-lg font-medium">
                    Generating your video...
                  </p>
                  {progress && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {progress}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {videoUrl && (
            // Video ready state - show video
            <Card className="w-full max-w-4xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Generated Video
                </CardTitle>
                <CardDescription>
                  Your AI-generated video is ready!
                </CardDescription>
              </CardHeader>{" "}
              <CardContent>
                <div className="relative overflow-hidden rounded-lg bg-black">
                  <VideoPlayer
                    src={videoUrl}
                    className="w-full"
                    aspectRatio="16/9"
                    showDownloadButton={false}
                    title="Generated Video"
                  />
                </div>{" "}
                <div className="mt-4 flex gap-2">
                  <Button asChild className="flex-1">
                    <a
                      href={videoUrl}
                      download="generated-video.mp4"
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Video
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setVideoUrl(null);
                      setPrompt("");
                      setImage(null);
                      setImagePreview(null);
                      setError(null);
                    }}
                  >
                    Generate Another
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            // Error state
            <Card className="w-full max-w-2xl border-destructive">
              <CardContent className="flex h-96 items-center justify-center">
                <div className="text-center text-destructive">
                  <p className="text-lg font-medium">Something went wrong</p>
                  <p className="mt-2 text-sm">{error}</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setError(null);
                      setIsGenerating(false);
                    }}
                  >
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        {/* Prompt Section - Hidden when video is generated */}
        {!videoUrl && (
          <div className="flex h-full items-end space-y-6 align-middle">
            <div className="w-full">
              {/* Prompt Card with integrated image upload */}
              <Card>
                <CardContent className="flex items-center justify-center">
                  <AI_Prompt
                    value={prompt}
                    onChange={setPrompt}
                    placeholder={
                      videoMode === "text-to-video"
                        ? "Describe the video you want to generate..."
                        : "Describe how you want your image to be animated..."
                    }
                    disabled={isGenerating}
                    onSubmit={handleSubmit}
                    image={image}
                    onImageChange={handleImageChange}
                    imagePreview={imagePreview}
                    onModelChange={handleModelChange}
                    onSettingsChange={handleSettingsChange}
                    onModeChange={handleModeChange}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
