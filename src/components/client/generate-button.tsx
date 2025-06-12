"use client";

export function GenerateButton({
  onGenerate,
  isDisabled,
  isLoading,
  creditsRemaining,
  characterCount,
  characterLimit,
  buttonText = "Generate Speech",
  className,
  fullWidth,
  showCharacterCount,
  showCredits,
}: {
  onGenerate: () => void;
  isDisabled?: boolean;
  isLoading?: boolean;
  showDownload?: boolean;
  creditsRemaining: number;
  characterCount?: number;
  characterLimit?: number;
  buttonText?: string;
  className?: string;
  fullWidth?: boolean;
  showCharacterCount?: boolean;
  showCredits?: boolean;
}) {
  return (
    <div
      className={`flex w-full flex-col-reverse items-center gap-4 md:flex-row md:justify-between ${className}`}
    >
      {(showCredits ||
        (showCharacterCount && characterCount !== undefined)) && (
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          {showCredits && (
            <div className="flex items-center">
              <span className="text-xs text-muted-foreground">
                {creditsRemaining.toLocaleString()} credits remaining
              </span>
            </div>
          )}

          {/* Character counter */}
          {showCharacterCount &&
            characterCount !== undefined &&
            characterLimit !== undefined && (
              <p className="text-xs text-muted-foreground">
                <span>{characterCount}</span> / <span>{characterLimit}</span>
                <span className="ml-1 hidden sm:inline-block">characters</span>
              </p>
            )}
        </div>
      )}

      <div
        className={`flex items-center gap-3 ${fullWidth ? "w-full" : "w-full md:w-fit"}`}
      >
        <button
          className={`h-9 w-full whitespace-nowrap rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground ${isDisabled ? "cursor-not-allowed opacity-50" : "hover:bg-primary/90"}`}
          onClick={onGenerate}
          disabled={isDisabled || isLoading}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
              <span className="ml-2">{buttonText}</span>
            </div>
          ) : (
            buttonText
          )}
        </button>
      </div>
    </div>
  );
}
