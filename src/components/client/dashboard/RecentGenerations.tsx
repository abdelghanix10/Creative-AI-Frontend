"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import {
  Play,
  Pause,
  Download,
  Image as ImageIcon,
  Volume2,
  Loader2,
  Music,
} from "lucide-react";
import Image from "next/image";
import { ImageDialog } from "./ImageDialog";
import { VideoDialog } from "../media-library/VideoDialog";
import { VideoCard } from "../video/VideoCard";
import { useAudioStore } from "~/stores/audio-store";

interface RecentImage {
  id: string;
  prompt: string;
  provider: string;
  modelId: string;
  s3Key: string;
  createdAt: Date;
}

interface RecentAudioClip {
  id: string;
  text: string | null;
  voice: string | null;
  s3Key: string | null;
  service: string;
  createdAt: Date;
}

interface RecentVoice {
  id: string;
  text: string | null;
  voice: string | null;
  s3Key: string | null;
  service: string;
  createdAt: Date;
}

interface RecentVideo {
  id: string;
  prompt: string;
  provider: string;
  modelId: string;
  mode: string;
  resolution: string | null;
  aspectRatio: string | null;
  duration: number | null;
  imageUrl: string | null;
  videoUrl: string | null;
  createdAt: Date;
}

interface RecentGenerationsProps {
  images: RecentImage[];
  audioClips: RecentAudioClip[];
  voices: RecentVoice[];
  videos: RecentVideo[];
}

interface MediaVideo {
  id: string;
  prompt: string;
  provider: string;
  modelId: string;
  mode: string;
  resolution: string | null;
  aspectRatio: string | null;
  duration: number | null;
  imageUrl: string | null;
  videoUrl: string | null;
  createdAt: Date;
}

type Tab = "all" | "images" | "audio" | "voices" | "videos";

export default function RecentGenerations({
  images,
  audioClips,
  voices,
  videos,
}: RecentGenerationsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(
    new Set(),
  );
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Map<string, string>>(
    new Map(),
  );
  const [loadingPreviews, setLoadingPreviews] = useState<Set<string>>(
    new Set(),
  );
  const [selectedImage, setSelectedImage] = useState<RecentImage | null>(null);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<MediaVideo | null>(null);
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [videoPreviewUrls, setVideoPreviewUrls] = useState<Map<string, string>>(
    new Map(),
  );

  // Audio store
  const { playAudio, currentAudio, isPlaying } = useAudioStore();
  // Load image preview URLs when component mounts
  useEffect(() => {
    const loadImagePreviews = async () => {
      const imageS3Keys = images.map((img) => img.s3Key).filter(Boolean);
      if (imageS3Keys.length === 0) return;

      setLoadingPreviews(new Set(imageS3Keys));

      try {
        const response = await fetch("/api/preview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ s3Keys: imageS3Keys }),
        });
        if (response.ok) {
          const data = (await response.json()) as {
            previewUrls: Array<{ s3Key: string; url: string | null }>;
          };
          const urlMap = new Map<string, string>();

          data.previewUrls.forEach(({ s3Key, url }) => {
            if (url) {
              urlMap.set(s3Key, url);
            }
          });

          setImagePreviewUrls(urlMap);
        }
      } catch (error) {
        console.error("Error loading image previews:", error);
      } finally {
        setLoadingPreviews(new Set());
      }
    };

    void loadImagePreviews();
  }, [images]);

  useEffect(() => {
    const loadVideoPreviews = async () => {
      // For videos, we don't need to load preview URLs since they already contain direct URLs
      // We only need to fetch preview URLs for S3 keys, not direct URLs
      const videoS3Keys = videos
        .map((video) => video.videoUrl)
        .filter(
          (url): url is string => Boolean(url) && !url?.startsWith("http"),
        );

      if (videoS3Keys.length === 0) return;

      try {
        const response = await fetch("/api/preview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ s3Keys: videoS3Keys }),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            previewUrls: Array<{ s3Key: string; url: string | null }>;
          };
          const urlMap = new Map<string, string>();

          data.previewUrls.forEach(({ s3Key, url }) => {
            if (url) {
              urlMap.set(s3Key, url);
            }
          });

          setVideoPreviewUrls(urlMap);
        }
      } catch (error) {
        console.error("Error loading video previews:", error);
      }
    };

    void loadVideoPreviews();
  }, [videos]);
  const handlePlayAudio = async (
    s3Key: string,
    id: string,
    text: string | null,
    voice: string | null,
    service: string,
    createdAt: Date,
  ) => {
    // Check if this audio is already playing
    if (currentAudio?.id === id && isPlaying) {
      return; // Let the playbar handle pause
    }

    try {
      // Get download URL for audio playback
      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ s3Key }),
      });

      if (response.ok) {
        const data = (await response.json()) as { downloadUrl: string }; // Create audio info object for the store
        const audioInfo = {
          id,
          title: (text?.trim() ?? "") || "Generated Audio",
          voice,
          audioUrl: data.downloadUrl,
          service,
          createdAt: new Date(createdAt).toUTCString(),
        };

        // Use the audio store to play
        playAudio(audioInfo);
      }
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  };

  const downloadFile = async (s3Key: string, filename: string) => {
    if (downloadingFiles.has(s3Key)) return;

    setDownloadingFiles((prev) => new Set(prev).add(s3Key));

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ s3Key }),
      });

      if (response.ok) {
        const data = (await response.json()) as { downloadUrl: string };

        // Create a temporary link to download the file
        const link = document.createElement("a");
        link.href = data.downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error("Failed to get download URL");
      }
    } catch (error) {
      console.error("Error downloading file:", error);
    } finally {
      setDownloadingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(s3Key);
        return newSet;
      });
    }
  };
  const allItems = [
    ...images.map((item) => ({ ...item, type: "image" as const })),
    ...audioClips.map((item) => ({ ...item, type: "audio" as const })),
    ...voices.map((item) => ({ ...item, type: "voice" as const })),
    ...videos.map((item) => ({ ...item, type: "video" as const })),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const getFilteredItems = () => {
    switch (activeTab) {
      case "images":
        return images.map((item) => ({ ...item, type: "image" as const }));
      case "audio":
        return audioClips.map((item) => ({ ...item, type: "audio" as const }));
      case "voices":
        return voices.map((item) => ({ ...item, type: "voice" as const }));
      case "videos":
        return videos.map((item) => ({ ...item, type: "video" as const }));
      default:
        return allItems;
    }
  };

  const filteredItems = getFilteredItems();

  const openImageDialog = (image: RecentImage) => {
    setSelectedImage(image);
    setIsImageDialogOpen(true);
  };

  const closeImageDialog = () => {
    setSelectedImage(null);
    setIsImageDialogOpen(false);
  };

  const openVideoDialog = (video: MediaVideo) => {
    setSelectedVideo(video);
    setIsVideoDialogOpen(true);
  };

  const closeVideoDialog = () => {
    setSelectedVideo(null);
    setIsVideoDialogOpen(false);
  };

  const downloadVideo = async (videoUrl: string, filename: string) => {
    if (downloadingFiles.has(videoUrl)) return;

    setDownloadingFiles((prev) => new Set(prev).add(videoUrl));

    try {
      // Check if it's a direct URL or S3 key
      if (videoUrl.startsWith("http")) {
        // Direct URL - download directly
        const link = document.createElement("a");
        link.href = videoUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // S3 key - fetch through API
        const response = await fetch("/api/download", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ s3Key: videoUrl }),
        });

        if (response.ok) {
          const data = (await response.json()) as { downloadUrl: string };

          const link = document.createElement("a");
          link.href = data.downloadUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          throw new Error("Failed to get download URL");
        }
      }
    } catch (error) {
      console.error("Error downloading video:", error);
    } finally {
      setDownloadingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(videoUrl);
        return newSet;
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col items-start justify-between gap-2 md:flex-row">
          Recent Generations
          <div className="flex gap-2">
            <Button
              variant={activeTab === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("all")}
            >
              All
            </Button>
            <Button
              variant={activeTab === "images" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("images")}
            >
              Images
            </Button>
            <Button
              variant={activeTab === "audio" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("audio")}
            >
              Speech
            </Button>
            <Button
              variant={activeTab === "voices" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("voices")}
            >
              Sound Effects
            </Button>
            <Button
              variant={activeTab === "videos" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("videos")}
            >
              Videos
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {filteredItems.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No generations found. Start creating to see your recent work here!
          </div>
        ) : (
          <div className="columns-xs md:columns-sm">
            {filteredItems.map((item) => (
              <Card key={`${item.type}-${item.id}`} className="overflow-hidden">
                <CardContent className="p-4">
                  {item.type === "image" && "prompt" in item && (
                    <>
                      <div className="mb-2 flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          <Badge variant="secondary" className="text-xs">
                            {item.type}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <div>
                        {/* Image Preview */}
                        <div
                          onClick={() => openImageDialog(item)}
                          className="cursor-pointer"
                        >
                          <div className="relative mb-3 overflow-hidden rounded-md bg-muted transition-opacity hover:opacity-90">
                            {loadingPreviews.has(item.s3Key) ? (
                              <div className="flex aspect-video h-full items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin" />
                              </div>
                            ) : imagePreviewUrls.has(item.s3Key) ? (
                              <Image
                                src={imagePreviewUrls.get(item.s3Key)!}
                                alt={item.prompt}
                                fill
                                className="!static object-cover"
                                onError={() => {
                                  // Remove failed URLs from the map
                                  setImagePreviewUrls((prev) => {
                                    const newMap = new Map(prev);
                                    newMap.delete(item.s3Key);
                                    return newMap;
                                  });
                                }}
                              />
                            ) : (
                              <div className="flex aspect-video h-full items-center justify-center">
                                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <p className="mb-2 line-clamp-2 text-sm font-medium">
                            {item.prompt}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="truncate text-xs text-muted-foreground">
                            {item.provider == "fireworks1"
                              ? "PlayGround"
                              : item.provider == "fireworks2"
                                ? "Flux"
                                : "Stable Diffusion"}
                            • {item.modelId.split("/").pop()}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              downloadFile(item.s3Key, `image-${item.id}.png`)
                            }
                            disabled={downloadingFiles.has(item.s3Key)}
                          >
                            {downloadingFiles.has(item.s3Key) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Download className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                  {item.type === "audio" && "text" in item && (
                    <>
                      <div className="mb-2 flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Volume2 className="h-4 w-4" />
                          <Badge variant="secondary" className="text-xs">
                            {item.type}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>{" "}
                      <div>
                        <p className="mb-2 line-clamp-2 text-sm font-medium">
                          {(item.text?.trim() ?? "") || "Generated Audio"}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-muted-foreground">
                            {item.service} {item.voice && `• ${item.voice}`}
                          </div>
                          <div className="flex gap-1">
                            {item.s3Key && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handlePlayAudio(
                                    item.s3Key!,
                                    item.id,
                                    item.text,
                                    item.voice,
                                    item.service,
                                    item.createdAt,
                                  )
                                }
                                disabled={
                                  currentAudio?.id === item.id && isPlaying
                                }
                              >
                                {currentAudio?.id === item.id && isPlaying ? (
                                  <Pause className="h-3 w-3" />
                                ) : (
                                  <Play className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                            {item.s3Key && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  downloadFile(
                                    item.s3Key!,
                                    `audio-${item.id}.mp3`,
                                  )
                                }
                                disabled={downloadingFiles.has(item.s3Key)}
                              >
                                {downloadingFiles.has(item.s3Key) ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Download className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  {item.type === "voice" && "text" in item && (
                    <>
                      <div className="mb-2 flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Music className="h-4 w-4" />
                          <Badge variant="secondary" className="text-xs">
                            Sound Effects
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>{" "}
                      <div>
                        <p className="mb-2 line-clamp-2 text-sm font-medium">
                          {(item.text?.trim() ?? "") ||
                            "Generated Sound Effect"}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-muted-foreground">
                            {item.service} {item.voice && `• ${item.voice}`}
                          </div>
                          <div className="flex gap-1">
                            {item.s3Key && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handlePlayAudio(
                                    item.s3Key!,
                                    item.id,
                                    item.text,
                                    item.voice,
                                    item.service,
                                    item.createdAt,
                                  )
                                }
                                disabled={
                                  currentAudio?.id === item.id && isPlaying
                                }
                              >
                                {currentAudio?.id === item.id && isPlaying ? (
                                  <Pause className="h-3 w-3" />
                                ) : (
                                  <Play className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                            {item.s3Key && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  downloadFile(
                                    item.s3Key!,
                                    `sound-effect-${item.id}.mp3`,
                                  )
                                }
                                disabled={downloadingFiles.has(item.s3Key)}
                              >
                                {downloadingFiles.has(item.s3Key) ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Download className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  {item.type === "video" && "prompt" in item && (
                    <>
                      <div>
                        <VideoCard
                          video={{
                            id: item.id,
                            prompt: item.prompt,
                            provider: item.provider,
                            modelId: item.modelId,
                            mode: item.mode,
                            resolution: item.resolution,
                            aspectRatio: item.aspectRatio,
                            duration: item.duration,
                            imageUrl: item.imageUrl,
                            videoUrl: item.videoUrl,
                            createdAt: item.createdAt,
                          }}
                          viewMode={"grid"}
                          onDownload={downloadVideo}
                          isDownloading={downloadingFiles.has(
                            item.videoUrl ?? "",
                          )}
                          imagePreviewUrl={
                            item.imageUrl
                              ? imagePreviewUrls.get(item.imageUrl)
                              : undefined
                          }
                          onClick={() => openVideoDialog(item)}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
      <ImageDialog
        image={selectedImage}
        isOpen={isImageDialogOpen}
        onClose={closeImageDialog}
        imagePreviewUrl={
          selectedImage ? imagePreviewUrls.get(selectedImage.s3Key) : undefined
        }
        onDownload={downloadFile}
        isDownloading={
          selectedImage ? downloadingFiles.has(selectedImage.s3Key) : false
        }
      />
      {/* Video Dialog */}
      <VideoDialog
        video={selectedVideo}
        isOpen={isVideoDialogOpen}
        onClose={closeVideoDialog}
        videoUrl={
          selectedVideo?.videoUrl
            ? selectedVideo.videoUrl.startsWith("http")
              ? selectedVideo.videoUrl // Direct URL, use as is
              : (videoPreviewUrls.get(selectedVideo.videoUrl) ??
                selectedVideo.videoUrl) // S3 key, get preview URL
            : undefined
        }
        onDownload={downloadVideo}
        isDownloading={
          selectedVideo?.videoUrl
            ? downloadingFiles.has(selectedVideo.videoUrl)
            : false
        }
      />
    </Card>
  );
}
