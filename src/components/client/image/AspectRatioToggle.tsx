"use client";

import { Button } from "~/components/ui/button";
import { useToast } from "~/hooks/use-toast";
import { useState } from "react";

export type AspectRatioOption = "2:3" | "16:9" | "1:1";

interface AspectRatioToggleProps {
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

const dimensionOptions = [
  { id: "1-1", label: "1:1", ratio: "1:1", aspectRatio: 1 },
  { id: "2-3", label: "2:3", ratio: "2:3", aspectRatio: 2 / 3 },
  { id: "16-9", label: "16:9", ratio: "16:9", aspectRatio: 16 / 9 },
];

export function AspectRatioToggle({
  onValueChange,
  disabled = false,
}: AspectRatioToggleProps) {
  const { toast } = useToast();
  const [customRatio, setCustomRatio] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [selectedOption, setSelectedOption] =
    useState<AspectRatioOption>("1:1");

  const handleOptionSelect = (option: AspectRatioOption) => {
    setSelectedOption(option);

    setShowCustomInput(false);
    onValueChange(option);
    toast({
      description: `Aspect ratio set to ${option}`,
      duration: 2000,
    });
  };

  const handleCustomSubmit = () => {
    if (customRatio && /^\d+:\d+$/.test(customRatio)) {
      onValueChange(customRatio);
      toast({
        description: `Custom aspect ratio set to ${customRatio}`,
        duration: 2000,
      });
    } else {
      toast({
        description: "Please enter a valid aspect ratio (e.g., 4:5)",
        duration: 2000,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="text-lg font-semibold">Image Dimensions (Flux Only)</div>
      <div className="flex flex-col md:flex-row items-start gap-2">
        <div className="flex gap-2 flex-wrap">
          {dimensionOptions.map((option) => (
            <Button
              key={option.id}
              variant={
                selectedOption === option.ratio ? "default" : "secondary"
              }
              size="sm"
              disabled={disabled}
              onClick={() =>
                handleOptionSelect(option.ratio as AspectRatioOption)
              }
              className={`h-16 w-16 p-2 flex flex-col items-center gap-2 ${
                selectedOption === option.ratio
                  ? "bg-slate-900/90 hover:bg-slate-900/80"
                  : ""
              }`}
            >
              <div
                className={`rounded border-2 border-current`}
                style={{
                  width:
                    option.aspectRatio >= 1
                      ? "20px"
                      : `${20 * option.aspectRatio}px`,
                  height:
                    option.aspectRatio >= 1
                      ? `${20 / option.aspectRatio}px`
                      : "20px",
                }}
              />
              <div>{option.ratio}</div>
            </Button>
          ))}
        </div>

        {showCustomInput && (
          <div className="flex gap-2 mt-2 md:mt-0">
            <input
              type="text"
              placeholder="e.g., 4:5"
              className="px-2 py-1 text-sm border rounded"
              value={customRatio}
              onChange={(e) => setCustomRatio(e.target.value)}
            />
            <Button variant="outline" size="sm" onClick={handleCustomSubmit}>
              Apply
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
