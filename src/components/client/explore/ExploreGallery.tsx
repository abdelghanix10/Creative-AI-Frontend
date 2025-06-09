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
  Mic,
  Volume2,
  Loader2,
  Search,
  Grid3X3,
  List,
  User,
  Globe,
} from "lucide-react";
import Image from "next/image";
import { ImageDialog } from "../dashboard/ImageDialog";
import { VideoCard } from "../video/VideoCard";
import { VideoDialog } from "../media-library/VideoDialog";

interface ExploreImage {
  id: string;
  prompt: string;
  provider: string;
  modelId: string;
  s3Key: string;
  createdAt: Date;
  user: {
    name: string | null;
    email: string;
  };
}

interface ExploreAudioClip {
  id: string;
  text: string | null;
  voice: string | null;
  s3Key: string | null;
  service: string;
  createdAt: Date;
  user: {
    name: string | null;
    email: string;
  };
}

interface ExploreVoice {
  id: string;
  name: string;
  service: string;
  s3Key: string | null;
  createdAt: Date;
  user: {
    name: string | null;
    email: string;
  };
}

interface ExploreVideo {
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
  user: {
    name: string | null;
    email: string;
  };
}

interface ExploreGalleryProps {
  images: ExploreImage[];
  audioClips: ExploreAudioClip[];
  voices: ExploreVoice[];
  videos: ExploreVideo[];
}

export default function ExploreGallery({
  images,
  audioClips,
  voices,
  videos,
}: ExploreGalleryProps) {
  const [activeTab, setActiveTab] = useState<
    "all" | "images" | "audio" | "voices" | "videos"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  // State for previews and playback
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Map<string, string>>(
    new Map(),
  );
  const [videoPreviewUrls, setVideoPreviewUrls] = useState<Map<string, string>>(
    new Map(),
  );
  const [loadingPreviews, setLoadingPreviews] = useState<Set<string>>(
    new Set(),
  );
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(
    new Set(),
  );

  // Dialog states
  const [selectedImage, setSelectedImage] = useState<ExploreImage | null>(null);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<ExploreVideo | null>(null);
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);

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

  const playAudio = async (s3Key: string, id: string) => {
    if (playingAudio === id) {
      setPlayingAudio(null);
      return;
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
        const audio = new Audio(data.downloadUrl);
        setPlayingAudio(id);
        audio.onended = () => setPlayingAudio(null);
        audio.onerror = () => setPlayingAudio(null);
        await audio.play();
      }
    } catch (error) {
      console.error("Error playing audio:", error);
      setPlayingAudio(null);
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

  const downloadVideo = async (videoUrl: string) => {
    if (!videoUrl) return;

    if (downloadingFiles.has(videoUrl)) return;

    setDownloadingFiles((prev) => new Set(prev).add(videoUrl));

    try {
      // If it's already a direct URL, download directly
      if (videoUrl.startsWith("http")) {
        const link = document.createElement("a");
        link.href = videoUrl;
        link.download = `video_${Date.now()}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // If it's an S3 key, get download URL
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
          link.download = `video_${Date.now()}.mp4`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
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

  const openImageDialog = (image: ExploreImage) => {
    setSelectedImage(image);
    setIsImageDialogOpen(true);
  };

  const closeImageDialog = () => {
    setSelectedImage(null);
    setIsImageDialogOpen(false);
  };

  const openVideoDialog = (video: ExploreVideo) => {
    setSelectedVideo(video);
    setIsVideoDialogOpen(true);
  };

  const closeVideoDialog = () => {
    setSelectedVideo(null);
    setIsVideoDialogOpen(false);
  };

  const getUserDisplayName = (user: { name: string | null; email: string }) => {
    return user.name ?? user.email.split("@")[0] ?? "Anonymous";
  };
  type AllItemTypes =
    | (ExploreImage & { type: "image" })
    | (ExploreAudioClip & { type: "audio" })
    | (ExploreVoice & { type: "voice" })
    | (ExploreVideo & { type: "video" });

  const allItems: AllItemTypes[] = [
    ...images.map((item) => ({ ...item, type: "image" as const })),
    ...audioClips.map((item) => ({ ...item, type: "audio" as const })),
    ...voices.map((item) => ({ ...item, type: "voice" as const })),
    ...videos.map((item) => ({ ...item, type: "video" as const })),
  ];
  const getFilteredAndSortedItems = (): AllItemTypes[] => {
    let items: AllItemTypes[] = allItems;

    // Filter by tab
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
    }

    // Filter by search query
    if (searchQuery) {
      items = items.filter((item) => {
        const searchText = searchQuery.toLowerCase();
        if (item.type === "image") {
          return item.prompt.toLowerCase().includes(searchText);
        }
        if (item.type === "audio") {
          return item.text?.toLowerCase().includes(searchText);
        }
        if (item.type === "voice") {
          return item.name.toLowerCase().includes(searchText);
        }
        if (item.type === "video") {
          return item.prompt.toLowerCase().includes(searchText);
        }
        return false;
      });
    }

    // Sort items
    items.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

    return items;
  };

  const filteredItems = getFilteredAndSortedItems();

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Search */}
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search public content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-2">
              {/* View Mode Toggle */}
              <div className="flex rounded-md border">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as "newest" | "oldest")
                }
                className="rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant={activeTab === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("all")}
            >
              <Globe className="mr-2 h-4 w-4" />
              All ({allItems.length})
            </Button>
            <Button
              variant={activeTab === "images" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("images")}
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              Images ({images.length})
            </Button>
            <Button
              variant={activeTab === "audio" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("audio")}
            >
              <Volume2 className="mr-2 h-4 w-4" />
              Audio ({audioClips.length})
            </Button>
            <Button
              variant={activeTab === "voices" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("voices")}
            >
              <Mic className="mr-2 h-4 w-4" />
              Voices ({voices.length})
            </Button>
            <Button
              variant={activeTab === "videos" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("videos")}
            >
              <Play className="mr-2 h-4 w-4" />
              Videos ({videos.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <Card>
        <CardContent className="p-6">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Globe className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">
                {searchQuery ? "No results found" : "No public content yet"}
              </h3>
              <p className="mx-auto max-w-sm text-muted-foreground">
                {searchQuery
                  ? `No public content found matching "${searchQuery}". Try adjusting your search.`
                  : "Be the first to create and share amazing content with the community!"}
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
                    className={`p-4 ${viewMode === "list" ? "flex w-full items-center gap-4" : ""}`}
                  >
                    {/* Creator Badge */}
                    {item.type === "image" && (
                      <>
                        {viewMode === "grid" ? (
                          <div className="mb-3 break-inside-avoid">
                            <div className="mb-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <ImageIcon className="h-4 w-4" />
                                <Badge variant="secondary" className="text-xs">
                                  image
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  By {getUserDisplayName(item.user)}
                                </span>
                              </div>
                            </div>
                            <div
                              className="cursor-pointer"
                              onClick={() => openImageDialog(item)}
                            >
                              <div className="group relative mb-3 cursor-pointer overflow-hidden rounded-lg">
                                {loadingPreviews.has(item.s3Key) ? (
                                  <div className="flex h-48 items-center justify-center bg-gray-100">
                                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                  </div>
                                ) : (
                                  <Image
                                    src={
                                      imagePreviewUrls.get(item.s3Key) ??
                                      "/placeholder-image.jpg"
                                    }
                                    alt={item.prompt}
                                    width={400}
                                    height={400}
                                    className="h-auto w-full object-cover transition-transform group-hover:scale-105"
                                  />
                                )}
                                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                              </div>
                              <p className="line-clamp-2 text-sm font-medium text-gray-900">
                                {item.prompt}
                              </p>
                            </div>
                            <div className="mt-2">
                              <div className="mt-1 flex items-center justify-between">
                                <p className="truncate text-xs text-gray-500">
                                  {item.provider == "fireworks1"
                                    ? "PlayGround"
                                    : item.provider == "fireworks2"
                                      ? "Flux"
                                      : "Stable Diffusion"}{" "}
                                  • {item.modelId.split("/").pop()}
                                </p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void downloadFile(
                                      item.s3Key,
                                      `image_${item.id}.jpg`,
                                    );
                                  }}
                                  disabled={downloadingFiles.has(item.s3Key)}
                                >
                                  {downloadingFiles.has(item.s3Key) ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              <p className="text-xs text-gray-400">
                                {formatDistanceToNow(new Date(item.createdAt), {
                                  addSuffix: true,
                                })}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col w-full items-start gap-4">
                            <div
                              className="flex cursor-pointer items-center gap-4"
                              onClick={() => openImageDialog(item)}
                            >
                              <div className="h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg">
                                {loadingPreviews.has(item.s3Key) ? (
                                  <div className="flex h-full items-center justify-center bg-gray-100">
                                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                  </div>
                                ) : (
                                  <Image
                                    src={
                                      imagePreviewUrls.get(item.s3Key) ??
                                      "/placeholder-image.jpg"
                                    }
                                    alt={item.prompt}
                                    width={64}
                                    height={64}
                                    className="h-full w-full object-cover"
                                  />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="mb-1 flex items-center gap-2">
                                  <ImageIcon className="h-4 w-4" />
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    image
                                  </Badge>
                                </div>
                                <p className="line-clamp-2 font-medium text-gray-900">
                                  {item.prompt}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {item.provider == "fireworks1"
                                    ? "PlayGround"
                                    : item.provider == "fireworks2"
                                      ? "Flux"
                                      : "Stable Diffusion"}{" "}
                                  • {item.modelId.split("/").pop()}
                                </p>
                              </div>
                              <div className="flex flex-col items-center gap-2 text-xs">
                                <p className="text-xs text-gray-400 text-muted-foreground">
                                  {formatDistanceToNow(
                                    new Date(item.createdAt),
                                    {
                                      addSuffix: true,
                                    },
                                  )}
                                </p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void downloadFile(
                                      item.s3Key,
                                      `image_${item.id}.jpg`,
                                    );
                                  }}
                                  disabled={downloadingFiles.has(item.s3Key)}
                                >
                                  {downloadingFiles.has(item.s3Key) ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                By {getUserDisplayName(item.user)}
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    {(item.type === "audio" || item.type === "voice") && (
                      <div className="space-y-3">
                        <div>
                          {item.type === "audio" && "text" in item && (
                            <p className="font-medium text-gray-900">
                              {item.text ?? "Audio Clip"}
                            </p>
                          )}
                          {item.type === "voice" && "name" in item && (
                            <p className="font-medium text-gray-900">
                              {item.name}
                            </p>
                          )}
                          <p className="text-sm text-gray-500">
                            {item.service}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(item.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        {item.s3Key && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => playAudio(item.s3Key!, item.id)}
                              className="flex-1"
                            >
                              {playingAudio === item.id ? (
                                <Pause className="mr-2 h-4 w-4" />
                              ) : (
                                <Play className="mr-2 h-4 w-4" />
                              )}
                              {playingAudio === item.id ? "Pause" : "Play"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                downloadFile(
                                  item.s3Key!,
                                  `${item.type}_${item.id}.mp3`,
                                )
                              }
                              disabled={downloadingFiles.has(item.s3Key)}
                            >
                              {downloadingFiles.has(item.s3Key) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    {item.type === "video" && (
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
                              onClick={() =>
                                openVideoDialog(item as ExploreVideo)
                              }
                            />
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                By {getUserDisplayName(item.user)}
                              </span>
                            </div>
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
                              onClick={() =>
                                openVideoDialog(item as ExploreVideo)
                              }
                            />
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                By {getUserDisplayName(item.user)}
                              </span>
                            </div>
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
        isOpen={isImageDialogOpen}
        onClose={closeImageDialog}
        image={
          selectedImage
            ? {
                id: selectedImage.id,
                prompt: selectedImage.prompt,
                provider: selectedImage.provider,
                modelId: selectedImage.modelId,
                s3Key: selectedImage.s3Key,
                createdAt: selectedImage.createdAt,
              }
            : null
        }
        imagePreviewUrl={
          selectedImage?.s3Key
            ? imagePreviewUrls.get(selectedImage.s3Key)
            : undefined
        }
        onDownload={(s3Key, filename) => downloadFile(s3Key, filename)}
        isDownloading={
          selectedImage?.s3Key
            ? downloadingFiles.has(selectedImage.s3Key)
            : false
        }
      />

      {/* Video Dialog */}
      <VideoDialog
        isOpen={isVideoDialogOpen}
        onClose={closeVideoDialog}
        video={
          selectedVideo
            ? {
                id: selectedVideo.id,
                prompt: selectedVideo.prompt,
                provider: selectedVideo.provider,
                modelId: selectedVideo.modelId,
                mode: selectedVideo.mode,
                resolution: selectedVideo.resolution,
                aspectRatio: selectedVideo.aspectRatio,
                duration: selectedVideo.duration,
                imageUrl: selectedVideo.imageUrl,
                videoUrl: selectedVideo.videoUrl,
                createdAt: selectedVideo.createdAt,
              }
            : null
        }
        videoUrl={
          selectedVideo?.videoUrl?.startsWith("http")
            ? selectedVideo.videoUrl
            : selectedVideo?.videoUrl
              ? videoPreviewUrls.get(selectedVideo.videoUrl)
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
