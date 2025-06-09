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
import { Download, Loader2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import Image from "next/image";
import { useState, useCallback } from "react";

interface RecentImage {
  id: string;
  prompt: string;
  provider: string;
  modelId: string;
  s3Key: string;
  createdAt: Date;
}

interface ImageDialogProps {
  image: RecentImage | null;
  isOpen: boolean;
  onClose: () => void;
  imagePreviewUrl?: string;
  onDownload: (s3Key: string, filename: string) => void;
  isDownloading: boolean;
}

export function ImageDialog({
  image,
  isOpen,
  onClose,
  imagePreviewUrl,
  onDownload,
  isDownloading,
}: ImageDialogProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isHoveringImage, setIsHoveringImage] = useState(false);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev * 1.2, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev / 1.2, 0.1));
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Allow panning at any zoom level
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    },
    [position],
  );
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent dialog from scrolling
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    },
    [handleZoomIn, handleZoomOut],
  );

  if (!image) return null;

  const providerName =
    image.provider === "fireworks1"
      ? "PlayGround"
      : image.provider === "fireworks2"
        ? "Flux"
        : "Stable Diffusion";
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`max-h-[90vh] w-11/12 max-w-4xl rounded-lg px-8 ${isHoveringImage ? "overflow-y-hidden" : "overflow-y-auto"}`}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant="secondary">Image</Badge>
            Generated{" "}
            {formatDistanceToNow(new Date(image.createdAt), {
              addSuffix: true,
            })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Display with Zoom Controls */}
          <div className="relative">
            {/* Zoom Controls */}
            <div className="absolute right-2 top-2 z-10 flex gap-1 rounded-lg bg-black/50 p-1 backdrop-blur-sm">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleZoomOut}
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
                disabled={zoom <= 0.1}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <div className="flex items-center px-2 text-xs text-white">
                {Math.round(zoom * 100)}%
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleZoomIn}
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
                disabled={zoom >= 5}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleReset}
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>{" "}
            {/* Image Container */}
            <div
              className="relative w-full overflow-hidden rounded-lg bg-muted"
              onWheel={handleWheel}
              onMouseEnter={() => setIsHoveringImage(true)}
              onMouseLeave={() => setIsHoveringImage(false)}
            >
              {imagePreviewUrl ? (
                <div
                  className="relative h-full w-full"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  style={{
                    cursor: isDragging ? "grabbing" : "grab",
                  }}
                >
                  <div
                    className="relative h-full w-full transition-transform duration-150 ease-out"
                    style={{
                      transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                      transformOrigin: "center center",
                    }}
                  >
                    <Image
                      src={imagePreviewUrl}
                      alt={image.prompt}
                      fill
                      className="!static w-full object-contain"
                      priority
                      draggable={false}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-muted-foreground/20">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">Loading image...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Image Details */}
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-lg font-semibold">Prompt</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {image.prompt}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <h4 className="mb-1 font-medium">Provider</h4>
                <p className="text-sm text-muted-foreground">{providerName}</p>
              </div>

              <div>
                <h4 className="mb-1 font-medium">Model</h4>
                <p className="text-sm text-muted-foreground">
                  {image.modelId.split("/").pop()}
                </p>
              </div>

              <div>
                <h4 className="mb-1 font-medium">Created</h4>
                <p className="text-sm text-muted-foreground">
                  {new Date(image.createdAt).toLocaleString()}
                </p>
              </div>

              <div>
                <h4 className="mb-1 font-medium">Image ID</h4>
                <p className="font-mono text-sm text-muted-foreground">
                  {image.id}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="text-xs text-muted-foreground">
              Scroll to zoom • Click and drag to pan • Right-click to save
            </div>
            <Button
              onClick={() => onDownload(image.s3Key, `image-${image.id}.png`)}
              disabled={isDownloading}
              className="flex items-center gap-2"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
