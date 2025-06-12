import { useState } from "react";
import { ArrowUpRight, ArrowUp, RefreshCw } from "lucide-react";
import { getRandomSuggestions, type Suggestion } from "~/lib/suggestions";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import { AspectRatioToggle } from "./AspectRatioToggle";

type QualityMode = "performance" | "quality";

interface PromptInputProps {
  onSubmit: (prompt: string, aspectRatio: string) => void;
  isLoading?: boolean;
  showProviders: boolean;
  onToggleProviders: () => void;
  mode: QualityMode;
  onModeChange: (mode: QualityMode) => void;
  suggestions: Suggestion[];
}

export function PromptInput({
  suggestions: initSuggestions,
  isLoading,
  onSubmit,
}: PromptInputProps) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>(initSuggestions);

  const updateSuggestions = () => {
    setSuggestions(getRandomSuggestions());
  };
  const handleSuggestionSelect = (prompt: string) => {
    setInput(prompt);
    onSubmit(prompt, aspectRatio);
  };

  const handleSubmit = () => {
    if (!isLoading && input.trim()) {
      onSubmit(input, aspectRatio);
    }
  };

  // const handleRefreshSuggestions = () => {
  //   setCurrentSuggestions(getRandomSuggestions());
  // };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        onSubmit(input, aspectRatio);
      }
    }
  };

  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const handleAspectRatioChange = (newRatio: string) => {
    setAspectRatio(newRatio);
  };

  return (
    <div className="mb-8 w-full">
      <div className="rounded-xl bg-muted p-4">
        <div className="flex flex-col gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your prompt here"
            rows={3}
            className="resize-none border-none bg-transparent p-0 text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <div className="flex items-end justify-between pt-1">
            <div className="flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between space-x-2">
                <button
                  onClick={updateSuggestions}
                  className="group flex items-center justify-between rounded-lg bg-background px-2 py-1 text-sm transition-colors duration-200 hover:bg-muted"
                >
                  <RefreshCw className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                </button>
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionSelect(suggestion.prompt)}
                    className={cn(
                      "group flex items-center justify-between rounded-lg bg-background px-2 py-1 text-sm transition-colors duration-200 hover:bg-muted",
                      index > 2
                        ? "hidden md:flex"
                        : index > 1
                          ? "hidden sm:flex"
                          : "",
                    )}
                  >
                    <span>
                      <span className="text-xs text-foreground sm:text-sm">
                        {suggestion.text.toLowerCase()}
                      </span>
                    </span>
                    <ArrowUpRight className="ml-1 h-2 w-2 text-muted-foreground group-hover:text-foreground sm:h-3 sm:w-3" />
                  </button>
                ))}
              </div>
              <AspectRatioToggle
                onValueChange={handleAspectRatioChange}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={isLoading ?? !input.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? (
                <Spinner className="h-3 w-3" />
              ) : (
                <ArrowUp className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
