"use client";

import type React from "react";

import {
  ArrowRight,
  Check,
  ChevronDown,
  Upload,
  X,
  Settings,
} from "lucide-react";
import { useState } from "react";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import { useAutoResizeTextarea } from "~/hooks/use-auto-resize-textarea";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";

interface AI_PromptProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onSubmit?: () => void;
  // Image upload props
  image?: File | null;
  onImageChange?: (file: File | null) => void;
  imagePreview?: string | null;
  // Model selection props
  onModelChange?: (model: string, apiEndpoint: string) => void; // Additional settings props
  onSettingsChange?: (settings: {
    duration?: string;
    aspectRatio?: string;
    resolution?: string;
  }) => void;
  // Video mode props
  onModeChange?: (mode: "text-to-video" | "image-to-video") => void;
}

export default function AI_Prompt({
  value,
  onChange,
  placeholder = "What can I do for you?",
  disabled = false,
  onSubmit,
  image: _image,
  onImageChange,
  imagePreview,
  onModelChange,
  onSettingsChange,
  onModeChange,
}: AI_PromptProps) {
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 72,
    maxHeight: 300,
  });
  const [selectedModel, setSelectedModel] = useState("LTX Video");
  const [duration, setDuration] = useState("5");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [resolution, setResolution] = useState("720");
  const [videoMode, setVideoMode] = useState<
    "text-to-video" | "image-to-video"
  >("text-to-video");
  // Video generation models with their API endpoints
  const VIDEO_MODELS = [
    {
      name: "LTX Video",
      textToVideoEndpoint: "fal-ai/ltx-video-13b-distilled",
      imageToVideoEndpoint: "fal-ai/ltx-video-13b-distilled/image-to-video",
      icon: (
        <svg
          width="1em"
          height="1em"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="2"
            y="3"
            width="20"
            height="14"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
          <path d="M8 9l5 3-5 3V9z" fill="currentColor" />
          <circle cx="19" cy="19" r="2" fill="currentColor" />
        </svg>
      ),
    },
    {
      name: "Kling Video",
      textToVideoEndpoint: "fal-ai/kling-video/v1.6/pro/text-to-video",
      imageToVideoEndpoint: "fal-ai/kling-video/v1.6/pro/image-to-video",
      icon: (
        <svg
          width="1em"
          height="1em"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="3"
            y="4"
            width="18"
            height="12"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
          <path d="M9 8l6 4-6 4V8z" fill="currentColor" />
          <path d="M2 19h20" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
    },
  ];
  const handleModelSelect = (model: {
    name: string;
    textToVideoEndpoint: string;
    imageToVideoEndpoint: string;
  }) => {
    setSelectedModel(model.name);
    if (onModelChange) {
      const endpoint =
        videoMode === "text-to-video"
          ? model.textToVideoEndpoint
          : model.imageToVideoEndpoint;
      onModelChange(model.name, endpoint);
    }
  };

  const handleModeChange = (mode: "text-to-video" | "image-to-video") => {
    setVideoMode(mode);
    if (onModeChange) {
      onModeChange(mode);
    }
    // Update the API endpoint when mode changes
    const currentModel = getCurrentModel();
    if (onModelChange && currentModel) {
      const endpoint =
        mode === "text-to-video"
          ? currentModel.textToVideoEndpoint
          : currentModel.imageToVideoEndpoint;
      onModelChange(currentModel.name, endpoint);
    }
  };
  const handleSettingsChange = (
    newDuration?: string,
    newAspectRatio?: string,
    newResolution?: string,
  ) => {
    if (newDuration !== undefined) {
      setDuration(newDuration);
    }
    if (newAspectRatio !== undefined) {
      setAspectRatio(newAspectRatio);
    }
    if (newResolution !== undefined) {
      setResolution(newResolution);
    }

    if (onSettingsChange) {
      onSettingsChange({
        duration: newDuration ?? duration,
        aspectRatio: newAspectRatio ?? aspectRatio,
        resolution: newResolution ?? resolution,
      });
    }
  };

  const getCurrentModel = () => {
    return (
      VIDEO_MODELS.find((m) => m.name === selectedModel) ?? VIDEO_MODELS[0]!
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (onSubmit) {
        onSubmit();
      }
      adjustHeight(true);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    adjustHeight();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageChange) {
      onImageChange(file);
    }
  };

  const handleRemoveImage = () => {
    if (onImageChange) {
      onImageChange(null);
    }
  };

  return (
    <div className="w-4/6 py-4">
      <div className="rounded-2xl bg-black/5 p-1.5 dark:bg-white/5">
        <div className="relative">
          <div className="relative flex flex-col">
            {/* Image Preview */}
            {imagePreview && videoMode === "image-to-video" && (
              <div className="w-32 relative mb-2 rounded-lg border border-black/10 dark:border-white/10">
                <div className="relative h-32 w-32 overflow-hidden rounded-lg">
                  <Image
                    src={imagePreview}
                    alt="Upload preview"
                    fill
                    className="object-cover"
                  />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                    disabled={disabled}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
            {/* Video Mode Toggle */}
            <div className="mb-2 rounded-lg border border-black/10 bg-black/5 p-3 dark:border-white/10 dark:bg-white/5">
              <div className="mb-2 flex items-center gap-2">
                <Settings className="h-4 w-4 text-black/70 dark:text-white/70" />
                <span className="text-sm font-medium text-black/70 dark:text-white/70">
                  Video Mode
                </span>
              </div>
              <div className="flex rounded-lg bg-black/10 p-1 dark:bg-white/10">
                <button
                  onClick={() => handleModeChange("text-to-video")}
                  className={cn(
                    "flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all",
                    videoMode === "text-to-video"
                      ? "bg-white text-black shadow-sm dark:bg-black dark:text-white"
                      : "text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white",
                  )}
                  disabled={disabled}
                >
                  Text to Video
                </button>
                <button
                  onClick={() => handleModeChange("image-to-video")}
                  className={cn(
                    "flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all",
                    videoMode === "image-to-video"
                      ? "bg-white text-black shadow-sm dark:bg-black dark:text-white"
                      : "text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white",
                  )}
                  disabled={disabled}
                >
                  Image to Video
                </button>
              </div>
            </div>
            {/* Additional Settings for Kling Video */}
            {selectedModel === "Kling Video" && (
              <div className="mb-2 rounded-lg border border-black/10 bg-black/5 p-3 dark:border-white/10 dark:bg-white/5">
                <div className="mb-2 flex items-center gap-2">
                  <Settings className="h-4 w-4 text-black/70 dark:text-white/70" />
                  <span className="text-sm font-medium text-black/70 dark:text-white/70">
                    Additional Settings
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-black/60 dark:text-white/60">
                      Duration
                    </label>{" "}
                    <Select
                      value={duration}
                      onValueChange={(value) =>
                        handleSettingsChange(value, undefined, undefined)
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 seconds</SelectItem>
                        <SelectItem value="10">10 seconds</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-black/60 dark:text-white/60">
                      Aspect Ratio
                    </label>{" "}
                    <Select
                      value={aspectRatio}
                      onValueChange={(value) =>
                        handleSettingsChange(undefined, value, undefined)
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select ratio" />
                      </SelectTrigger>{" "}
                      <SelectContent>
                        <SelectItem value="16:9">16:9</SelectItem>
                        <SelectItem value="9:16">9:16</SelectItem>
                        <SelectItem value="1:1">1:1</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            {/* Additional Settings for LTX Video */}
            {selectedModel === "LTX Video" && (
              <div className="mb-2 rounded-lg border border-black/10 bg-black/5 p-3 dark:border-white/10 dark:bg-white/5">
                <div className="mb-2 flex items-center gap-2">
                  <Settings className="h-4 w-4 text-black/70 dark:text-white/70" />
                  <span className="text-sm font-medium text-black/70 dark:text-white/70">
                    Additional Settings
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-black/60 dark:text-white/60">
                      Resolution
                    </label>
                    <Select
                      value={resolution}
                      onValueChange={(value) =>
                        handleSettingsChange(undefined, undefined, value)
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select resolution" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="720">720p</SelectItem>
                        <SelectItem value="480">480p</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-black/60 dark:text-white/60">
                      Aspect Ratio
                    </label>
                    <Select
                      value={aspectRatio}
                      onValueChange={(value) =>
                        handleSettingsChange(undefined, value, undefined)
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select ratio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16:9">16:9</SelectItem>
                        <SelectItem value="9:16">9:16</SelectItem>
                        <SelectItem value="1:1">1:1</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
              <Textarea
                id="ai-input-15"
                value={value}
                placeholder={placeholder}
                className={cn(
                  "w-full resize-none rounded-xl rounded-b-none border-none bg-black/5 px-4 py-3 placeholder:text-black/70 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-white/5 dark:text-white dark:placeholder:text-white/70",
                  "min-h-[72px]",
                )}
                ref={textareaRef}
                onKeyDown={handleKeyDown}
                onChange={handleChange}
                disabled={disabled}
              />
            </div>
            <div className="flex h-14 items-center rounded-b-xl bg-black/5 dark:bg-white/5">
              <div className="absolute bottom-3 left-3 right-3 flex w-[calc(100%-24px)] items-center justify-between">
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex h-8 items-center gap-1 rounded-md pl-1 pr-2 text-xs hover:bg-black/10 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0 dark:text-white dark:hover:bg-white/10"
                      >
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={selectedModel}
                            initial={{
                              opacity: 0,
                              y: -5,
                            }}
                            animate={{
                              opacity: 1,
                              y: 0,
                            }}
                            exit={{
                              opacity: 0,
                              y: 5,
                            }}
                            transition={{
                              duration: 0.15,
                            }}
                            className="flex items-center gap-1"
                          >
                            {getCurrentModel().icon}
                            {selectedModel}
                            <ChevronDown className="h-3 w-3 opacity-50" />
                          </motion.div>
                        </AnimatePresence>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className={cn(
                        "min-w-[10rem]",
                        "border-black/10 dark:border-white/10",
                        "bg-gradient-to-b from-white via-white to-neutral-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-800",
                      )}
                    >
                      {VIDEO_MODELS.map((model) => (
                        <DropdownMenuItem
                          key={model.name}
                          onSelect={() => handleModelSelect(model)}
                          className="flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2">
                            {model.icon}
                            <span>{model.name}</span>
                          </div>
                          {selectedModel === model.name && (
                            <Check className="h-4 w-4 text-blue-500" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>{" "}
                  </DropdownMenu>
                  <div className="mx-0.5 h-4 w-px bg-black/10 dark:bg-white/10" />
                  {/* Upload button - only visible in image-to-video mode */}
                  {videoMode === "image-to-video" && (
                    <label
                      className={cn(
                        "cursor-pointer rounded-lg bg-black/5 p-2 dark:bg-white/5",
                        "hover:bg-black/10 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0 dark:hover:bg-white/10",
                        "text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white",
                        disabled && "cursor-not-allowed opacity-50",
                      )}
                      aria-label="Upload image"
                    >
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={disabled}
                      />
                      <Upload className="h-4 w-4 transition-colors" />
                    </label>
                  )}
                </div>
                <button
                  type="button"
                  className={cn(
                    "rounded-lg bg-black/5 p-2 dark:bg-white/5",
                    "hover:bg-black/10 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0 dark:hover:bg-white/10",
                  )}
                  aria-label="Send message"
                  disabled={!value.trim() || disabled}
                  onClick={onSubmit}
                >
                  <ArrowRight
                    className={cn(
                      "h-4 w-4 transition-opacity duration-200 dark:text-white",
                      !value.trim() || disabled ? "opacity-30" : "opacity-100",
                    )}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
