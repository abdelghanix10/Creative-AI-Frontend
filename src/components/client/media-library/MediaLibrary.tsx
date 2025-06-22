"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import {
  Play,
  Pause,
  Download,
  Image as ImageIcon,
  Volume2,
  Loader2,
  Search,
  Grid3X3,
  List,
  Globe,
  Music,
} from "lucide-react";
import Image from "next/image";
import { ImageDialog } from "../dashboard/ImageDialog";
import { VideoCard } from "../video/VideoCard";
import { VideoDialog } from "./VideoDialog";
import { useAudioStore } from "~/stores/audio-store";

interface MediaImage {
  id: string;
  prompt: string;
  provider: string;
  modelId: string;
  s3Key: string;
  createdAt: Date;
}

interface MediaAudioClip {
  id: string;
  text: string | null;
  voice: string | null;
  s3Key: string | null;
  service: string;
  createdAt: Date;
}

interface MediaVoice {
  id: string;
  text: string | null;
  voice: string | null;
  s3Key: string | null;
  service: string;
  createdAt: Date;
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

interface MediaLibraryProps {
  images: MediaImage[];
  audioClips: MediaAudioClip[];
  voices: MediaVoice[];
  videos: MediaVideo[];
}

type Tab = "all" | "images" | "audio" | "voices" | "videos";
type ViewMode = "grid" | "list";
type SortBy = "newest" | "oldest" | "name";

export default function MediaLibrary({
  images,
  audioClips,
  voices,
  videos,
}: MediaLibraryProps) {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(
    new Set(),
  );
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Map<string, string>>(
    new Map(),
  );
  const [loadingPreviews, setLoadingPreviews] = useState<Set<string>>(
    new Set(),
  );
  const [selectedImage, setSelectedImage] = useState<MediaImage | null>(null);
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

  // Load video preview URLs when component mounts
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
      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ s3Key }),
      });

      if (response.ok) {
        const data = (await response.json()) as { downloadUrl: string };

        // Create audio info object for the store
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

  const openImageDialog = (image: MediaImage) => {
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
  const allItems = [
    ...images.map((item) => ({ ...item, type: "image" as const })),
    ...audioClips.map((item) => ({ ...item, type: "audio" as const })),
    ...voices.map((item) => ({ ...item, type: "voice" as const })),
    ...videos.map((item) => ({ ...item, type: "video" as const })),
  ];

  const getFilteredAndSortedItems = () => {
    let items = allItems; // Filter by tab
    switch (activeTab) {
      case "images":
        items = images.map((item) => ({ ...item, type: "image" as const }));
        break;
      case "audio":
        items = audioClips.map((item) => ({ ...item, type: "audio" as const }));
        break;
      case "voices":
        items = voices.map((item) => ({ ...item, type: "voice" as const }));
        break;
      case "videos":
        items = videos.map((item) => ({ ...item, type: "video" as const }));
        break;
      default:
        items = allItems;
    } // Filter by search query
    if (searchQuery) {
      items = items.filter((item) => {
        const searchText = searchQuery.toLowerCase();
        if (item.type === "image" && "prompt" in item) {
          return item.prompt.toLowerCase().includes(searchText);
        }
        if (item.type === "audio" && "text" in item) {
          return item.text?.toLowerCase().includes(searchText) ?? false;
        }
        if (item.type === "voice" && "text" in item) {
          return item.text?.toLowerCase().includes(searchText) ?? false;
        }
        if (item.type === "video" && "prompt" in item) {
          return item.prompt.toLowerCase().includes(searchText);
        }
        return false;
      });
    }

    // Sort items
    items.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "name":
          const getItemName = (item: typeof a) => {
            if ("prompt" in item) return item.prompt;
            if ("text" in item) return item.text ?? "";
            return "";
          };
          return getItemName(a).localeCompare(getItemName(b));
        case "newest":
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });

    return items;
  };

  const filteredItems = getFilteredAndSortedItems();

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <Card>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Search */}
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search your media..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-2">
              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name</option>
              </select>

              {/* View Mode */}
              <div className="flex rounded-md border">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Tabs */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant={activeTab === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("all")}
          className="whitespace-nowrap"
        >
          <Globe className="mr-2 h-4 w-4" />
          All ({allItems.length})
        </Button>
        <Button
          variant={activeTab === "images" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("images")}
          className="whitespace-nowrap"
        >
          <ImageIcon className="mr-2 h-4 w-4" />
          Images ({images.length})
        </Button>
        <Button
          variant={activeTab === "audio" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("audio")}
          className="whitespace-nowrap"
        >
          <Volume2 className="mr-2 h-4 w-4" />
          Speech ({audioClips.length})
        </Button>
        <Button
          variant={activeTab === "voices" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("voices")}
          className="whitespace-nowrap"
        >
          <Music className="mr-2 h-4 w-4" />
          Sound Effects ({voices.length})
        </Button>
        <Button
          variant={activeTab === "videos" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("videos")}
          className="whitespace-nowrap"
        >
          <Play className="mr-2 h-4 w-4" />
          Videos ({videos.length})
        </Button>
      </div>
      {/* Content */}
      <Card>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                {searchQuery ? (
                  <Search className="h-6 w-6 text-muted-foreground" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <h3 className="mb-2 text-lg font-semibold">
                {searchQuery ? "No results found" : "No media yet"}
              </h3>
              <p className="mx-auto max-w-sm text-muted-foreground">
                {searchQuery
                  ? `No media found matching "${searchQuery}". Try adjusting your search.`
                  : "Start creating content to see your media library grow!"}
              </p>
            </div>
          ) : (
            <div className={viewMode === "grid" ? "columns-sm" : "space-y-4"}>
              {filteredItems.map((item) => (
                <Card
                  key={`${item.type}-${item.id}`}
                  className={`overflow-hidden ${viewMode === "list" ? "flex" : ""}`}
                >
                  <CardContent
                    className={`${viewMode === "list" ? "flex flex-1 items-center gap-4" : ""}`}
                  >
                    {/* Content for each item type */}
                    {item.type === "image" && "prompt" in item && (
                      <>
                        {viewMode === "grid" ? (
                          <div>
                            <div className="mb-2 flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <ImageIcon className="h-4 w-4" />
                                <Badge variant="secondary" className="text-xs">
                                  image
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(item.createdAt), {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>
                            <div
                              className="cursor-pointer"
                              onClick={() => openImageDialog(item)}
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
                                  downloadFile(
                                    item.s3Key,
                                    `image-${item.id}.png`,
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
                            </div>
                          </div>
                        ) : (
                          <div className="flex w-full flex-col items-center gap-4 sm:flex-row">
                            <div
                              className="relative h-16 w-24 flex-shrink-0 cursor-pointer overflow-hidden rounded-md bg-muted transition-opacity hover:opacity-90"
                              onClick={() => openImageDialog(item)}
                            >
                              {imagePreviewUrls.has(item.s3Key) ? (
                                <Image
                                  src={imagePreviewUrls.get(item.s3Key)!}
                                  alt={item.prompt}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center">
                                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                <ImageIcon className="h-4 w-4" />
                                <Badge variant="secondary" className="text-xs">
                                  image
                                </Badge>
                              </div>
                              <p className="line-clamp-1 text-sm font-medium">
                                {item.prompt}
                              </p>
                              <div className="max-w-fit truncate text-xs text-muted-foreground">
                                {item.provider == "fireworks1"
                                  ? "PlayGround"
                                  : item.provider == "fireworks2"
                                    ? "Flux"
                                    : "Stable Diffusion"}
                                • {item.modelId.split("/").pop()}
                              </div>
                            </div>
                            <div className="flex flex-col items-center gap-2 text-xs">
                              <span className="text-muted-foreground">
                                {formatDistanceToNow(new Date(item.createdAt), {
                                  addSuffix: true,
                                })}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  downloadFile(
                                    item.s3Key,
                                    `image-${item.id}.png`,
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
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    {item.type === "audio" && "text" in item && (
                      <>
                        {viewMode === "grid" ? (
                          <div>
                            <div className="mb-2 flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <Volume2 className="h-4 w-4" />
                                <Badge variant="secondary" className="text-xs">
                                  audio
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(item.createdAt), {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>
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
                                    {currentAudio?.id === item.id &&
                                    isPlaying ? (
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
                        ) : (
                          <div className="flex w-full flex-col items-center gap-4 sm:flex-row">
                            <div className="flex h-16 w-24 flex-shrink-0 items-center justify-center rounded-md bg-muted">
                              <Volume2 className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                <Volume2 className="h-4 w-4" />
                                <Badge variant="secondary" className="text-xs">
                                  audio
                                </Badge>
                              </div>
                              <p className="line-clamp-2 text-sm font-medium">
                                {(item.text?.trim() ?? "") || "Generated Audio"}
                              </p>
                              <div className="text-xs text-muted-foreground">
                                {item.service} {item.voice && `• ${item.voice}`}
                              </div>
                            </div>
                            <div className="flex flex-col items-center gap-2 text-xs">
                              <span className="text-muted-foreground">
                                {formatDistanceToNow(new Date(item.createdAt), {
                                  addSuffix: true,
                                })}
                              </span>
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
                                    {currentAudio?.id === item.id &&
                                    isPlaying ? (
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
                        )}
                      </>
                    )}
                    {item.type === "voice" && "text" in item && (
                      <>
                        {viewMode === "grid" ? (
                          <div>
                            <div className="mb-2 flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <Music className="h-4 w-4" />
                                <Badge variant="secondary" className="text-xs">
                                  sound effect
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(item.createdAt), {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>
                            <p className="mb-2 text-sm font-medium">
                              {(item.text?.trim() ?? "") || "Sound Effect"}
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
                                    {currentAudio?.id === item.id &&
                                    isPlaying ? (
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
                                        `voice-${item.id}.mp3`,
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
                        ) : (
                          <div className="flex w-full flex-col items-center gap-4 sm:flex-row">
                            <div className="flex h-16 w-24 flex-shrink-0 items-center justify-center rounded-md bg-muted">
                              <Music className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                <Music className="h-4 w-4" />
                                <Badge variant="secondary" className="text-xs">
                                  sound effect
                                </Badge>
                              </div>
                              <p className="line-clamp-2 text-sm font-medium">
                                {(item.text?.trim() ?? "") ||"Sound Effect"}
                              </p>
                              <div className="text-xs text-muted-foreground">
                                {item.service} {item.voice && `• ${item.voice}`}
                              </div>
                            </div>
                            <div className="flex flex-col items-center gap-2 text-xs">
                              <span className="text-muted-foreground">
                                {formatDistanceToNow(new Date(item.createdAt), {
                                  addSuffix: true,
                                })}
                              </span>
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
                                    {currentAudio?.id === item.id &&
                                    isPlaying ? (
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
                        )}
                      </>
                    )}
                    {item.type === "video" && "prompt" in item && (
                      <>
                        {viewMode === "grid" ? (
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
                              viewMode={viewMode}
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
                        ) : (
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
                              viewMode={viewMode}
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
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Image Dialog */}
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
    </div>
  );
}
