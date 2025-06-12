"use client";

import { VideoPlayer } from "./VideoPlayer";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Video, Download, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";

interface VideoCardProps {
  video: {
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
  };
  viewMode: "grid" | "list";
  onDownload: (videoUrl: string, filename: string) => void;
  isDownloading: boolean;
  imagePreviewUrl?: string;
  videoUrl?: string;
  onClick?: () => void;
}

export function VideoCard({
  video,
  viewMode,
  onDownload,
  isDownloading,
  imagePreviewUrl,
  videoUrl,
  onClick,
}: VideoCardProps) {
  const getVideoSrc = () => {
    if (!video.videoUrl) return null;

    // If it's a direct URL, use it directly
    if (video.videoUrl.startsWith("http")) {
      return video.videoUrl;
    }

    // If we have a processed videoUrl, use it
    if (videoUrl) {
      return videoUrl;
    }

    // Otherwise return null and let the VideoPlayer handle the API call
    return null;
  };

  const handleDownload = () => {
    if (video.videoUrl) {
      onDownload(video.videoUrl, `video-${video.id}.mp4`);
    }
  };

  if (viewMode === "grid") {
    return (
      <div>
        <div className="mb-2 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            <Badge variant="secondary" className="text-xs">
              video
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(video.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>{" "}
        {video.videoUrl && (
          <div className="mb-3 overflow-hidden rounded-md bg-muted">
            <VideoPlayer
              src={getVideoSrc()}
              s3Key={
                !video.videoUrl.startsWith("http") ? video.videoUrl : undefined
              }
              poster={imagePreviewUrl}
              className="aspect-video"
              title={video.prompt}
              showDownloadButton={true}
              onDownload={handleDownload}
              isDownloading={isDownloading}
              aspectRatio={video.aspectRatio ?? "16/9"}
            />
          </div>
        )}
        <p className="mb-2 line-clamp-2 text-sm font-medium cursor-pointer" onClick={onClick}>
          {video.prompt}
        </p>
        <div className="flex items-center justify-between">
          <div className="truncate text-xs text-muted-foreground capitalize">
            {video.provider} • {video.modelId}
            {video.duration && ` • ${video.duration}s`}
            {video.resolution && ` • ${video.resolution}`}
          </div>
          {video.videoUrl && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Download className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="flex w-full flex-col items-center gap-4 sm:flex-row">
      <div
        className="relative h-16 w-24 flex-shrink-0 cursor-pointer overflow-hidden rounded-md bg-muted"
        onClick={onClick}
      >
        {video.videoUrl ? (
          <VideoPlayer
            src={getVideoSrc()}
            s3Key={
              !video.videoUrl.startsWith("http") ? video.videoUrl : undefined
            }
            poster={imagePreviewUrl}
            className="h-full w-full"
            showControls={false}
            aspectRatio={video.aspectRatio ?? "16/9"}
            onDownload={handleDownload}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Video className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <Video className="h-4 w-4" />
          <Badge variant="secondary" className="text-xs">
            video
          </Badge>
        </div>
        <p
          className="line-clamp-2 w-full cursor-pointer text-sm font-medium"
          onClick={onClick}
        >
          {video.prompt}
        </p>
        <div className="truncate text-xs capitalize text-muted-foreground">
          {video.provider} • {video.modelId}
          {video.duration && ` • ${video.duration}s`}
          {video.resolution && ` • ${video.resolution}`}
        </div>
      </div>
      <div className="flex flex-col items-center gap-2 text-xs">
        <span className="text-muted-foreground">
          {formatDistanceToNow(new Date(video.createdAt), {
            addSuffix: true,
          })}
        </span>
        {video.videoUrl && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Download className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
