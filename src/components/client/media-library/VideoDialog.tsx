"use client";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { Download, Loader2, Video, Clock, Monitor } from "lucide-react";
import { VideoPlayer } from "../video/VideoPlayer";
import Image from "next/image";

interface VideoData {
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

interface VideoDialogProps {
  video: VideoData | null;
  isOpen: boolean;
  onClose: () => void;
  videoUrl?: string;
  onDownload: (videoUrl: string, filename: string) => void;
  isDownloading: boolean;
}

export function VideoDialog({
  video,
  isOpen,
  onClose,
  videoUrl,
  onDownload,
  isDownloading,
}: VideoDialogProps) {
  if (!video) return null;

  const handleDownload = () => {
    if (videoUrl) {
      const filename = `video_${video.id}_${Date.now()}.mp4`;
      onDownload(videoUrl, filename);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "Unknown";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getProviderDisplayName = (provider: string) => {
    switch (provider.toLowerCase()) {
      case "fal-ai":
        return "Fal AI";
      case "lumalabs":
        return "Luma Labs";
      case "stability":
        return "Stability AI";
      default:
        return provider;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] w-11/12 max-w-5xl overflow-hidden !overflow-y-auto rounded-lg p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Details
          </DialogTitle>
        </DialogHeader>

        <div className="flex lg:max-h-[calc(90vh-80px)] flex-col gap-6 overflow-hidden p-6 pt-0 lg:flex-row">
          {/* Video Player Section */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="relative flex-1 overflow-hidden rounded-lg bg-black">
              <VideoPlayer
                src={videoUrl ?? null}
                poster={undefined}
                className="h-full w-full"
                title={video.prompt}
                showControls={true}
                aspectRatio={video.aspectRatio ?? "16/9"}
              />
            </div>

            {/* Video Controls */}
            <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <Button
                onClick={handleDownload}
                disabled={isDownloading || !videoUrl}
                className="flex items-center gap-2"
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isDownloading ? "Downloading..." : "Download"}
              </Button>
            </div>
          </div>

          {/* Video Details Section */}
          <div className="flex w-full flex-col gap-4 px-1 overflow-y-auto lg:w-80">
            {/* Prompt */}
            <div className="space-y-2">
              {video.imageUrl && (
                <>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Image Source
                  </h3>
                  <div className="mb-2">
                    <Image
                      src={video.imageUrl}
                      alt="Video thumbnail"
                      width={320}
                      height={180}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700"
                    />
                  </div>
                </>
              )}
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                Prompt
              </h3>
              <p className="rounded-lg bg-gray-50 p-3 text-sm leading-relaxed dark:bg-gray-800">
                {video.prompt}
              </p>
            </div>

            {/* Video Metadata */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                Video Information
              </h3>

              <div className="space-y-3">
                {/* Provider and Model */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Provider:
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {getProviderDisplayName(video.provider)}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Model:
                  </span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {video.modelId}
                  </Badge>
                </div>

                {/* Mode */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Mode:
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {video.mode}
                  </Badge>
                </div>

                {/* Duration */}
                {video.duration && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                      <Clock className="h-3 w-3" />
                      Duration:
                    </span>
                    <span className="font-mono text-sm">
                      {formatDuration(video.duration)}
                    </span>
                  </div>
                )}

                {/* Resolution */}
                {video.resolution && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Resolution:
                    </span>
                    <span className="font-mono text-sm">
                      {video.resolution}
                    </span>
                  </div>
                )}

                {/* Aspect Ratio */}
                {video.aspectRatio && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                      <Monitor className="h-3 w-3" />
                      Aspect Ratio:
                    </span>
                    <span className="font-mono text-sm">
                      {video.aspectRatio}
                    </span>
                  </div>
                )}

                {/* Created At */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Created:
                  </span>
                  <span className="text-sm">
                    {formatDistanceToNow(video.createdAt, { addSuffix: true })}
                  </span>
                </div>

                {/* Video ID */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    ID:
                  </span>
                  <span className="max-w-32 truncate font-mono text-xs text-gray-500 dark:text-gray-400">
                    {video.id}
                  </span>
                </div>
              </div>
            </div>

            {/* Technical Details */}
            <div className="space-y-2 border-t border-gray-200 pt-4 dark:border-gray-700">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                Technical Details
              </h3>
              <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                <div>Format: MP4</div>
                <div>Codec: H.264</div>
                {video.aspectRatio && (
                  <div>Aspect Ratio: {video.aspectRatio}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
