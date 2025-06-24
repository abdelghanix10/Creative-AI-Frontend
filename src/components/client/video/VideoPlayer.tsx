"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "~/components/ui/button";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  Download,
  Loader2,
} from "lucide-react";
import { cn } from "~/lib/utils";

interface VideoPlayerProps {
  src: string | null;
  s3Key?: string; // For fetching video URL through API
  poster?: string;
  className?: string;
  title?: string;
  showDownloadButton?: boolean;
  onDownload?: () => void;
  isDownloading?: boolean;
  showControls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  aspectRatio?: string;
}

export function VideoPlayer({
  src,
  s3Key,
  poster,
  className,
  title,
  showDownloadButton = false,
  onDownload,
  isDownloading = false,
  showControls = true,
  autoPlay = false,
  muted = false,
  aspectRatio = "16/9",
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showCustomControls, setShowCustomControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(src);
  const [fetchingUrl, setFetchingUrl] = useState(false);

  // Fetch video URL if s3Key is provided and src is not a direct URL
  useEffect(() => {
    const fetchVideoUrl = async () => {
      if (!s3Key || src?.startsWith("http")) {
        setVideoUrl(src);
        return;
      }

      if (fetchingUrl) return;

      setFetchingUrl(true);
      setIsLoading(true);

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
          setVideoUrl(data.downloadUrl);
        } else {
          console.error("Failed to fetch video URL");
        }
      } catch (error) {
        console.error("Error fetching video URL:", error);
      } finally {
        setFetchingUrl(false);
      }
    };

    void fetchVideoUrl();
  }, [src, s3Key, fetchingUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("volumechange", handleVolumeChange);
    video.addEventListener("loadstart", handleLoadStart);
    video.addEventListener("canplay", handleCanPlay);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("volumechange", handleVolumeChange);
      video.removeEventListener("loadstart", handleLoadStart);
      video.removeEventListener("canplay", handleCanPlay);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(console.error);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!document.fullscreenElement) {
      video.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  };

  const restart = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    video.play().catch(console.error);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!videoUrl && !fetchingUrl) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-muted",
          className,
        )}
        style={{ aspectRatio }}
      >
        <div className="text-center text-muted-foreground">
          <Play className="mx-auto mb-2 h-8 w-8" />
          <p className="text-sm">No video available</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("group relative overflow-hidden rounded-lg", className)}
      onMouseEnter={() => setShowCustomControls(true)}
      onMouseLeave={() => setShowCustomControls(false)}
    >
      <video
        ref={videoRef}
        className="h-full w-full"
        style={{ aspectRatio }}
        poster={poster}
        autoPlay={autoPlay}
        muted={muted}
        preload="metadata"
        onClick={togglePlay}
        src={videoUrl ?? undefined}
      >
        Your browser does not support the video tag.
      </video>

      {/* Loading Overlay */}
      {(isLoading || fetchingUrl) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}

      {/* Custom Controls */}
      {showControls && videoUrl && (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-200",
            showCustomControls || isLoading
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100",
          )}
        >
          {/* Progress Bar */}
          <div className="mb-3 flex items-center gap-2 text-xs text-white">
            <span>{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={handleTimeChange}
              className="flex-1 accent-white"
            />
            <span>{formatTime(duration)}</span>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Play/Pause */}
              <Button
                size="sm"
                variant="ghost"
                onClick={togglePlay}
                className="text-white hover:bg-white/20"
                disabled={!videoUrl}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>

              {/* Restart */}
              <Button
                size="sm"
                variant="ghost"
                onClick={restart}
                className="text-white hover:bg-white/20"
                disabled={!videoUrl}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {/* Download Button */}
              {showDownloadButton && onDownload && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDownload}
                  disabled={isDownloading}
                  className="text-white hover:bg-white/20"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              )}

              {/* Fullscreen */}
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20"
                disabled={!videoUrl}
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Title */}
          {title && <div className="truncate mt-2 text-sm text-white/80">{title}</div>}
        </div>
      )}
    </div>
  );
}
