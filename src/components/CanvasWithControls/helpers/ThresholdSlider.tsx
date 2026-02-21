import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ThresholdSliderProps {
  label: string;
  value: number;
  unit: string;
  onChange: (value: number) => void;
  max?: number;
  tooltip?: string;
  currentlyUsed?: boolean;
}

export function ThresholdSlider({ label, value, unit, onChange, max = 1, tooltip, currentlyUsed = false }: ThresholdSliderProps) {
  return (
    <div className={`flex items-center gap-1 ${currentlyUsed ? "" : "opacity-50"}`}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-[10px] text-neutral-500 w-8 shrink-0">{label}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>

      <Slider value={[value]} onValueChange={(val) => onChange(val[0])} max={max} step={0.01} className="flex-1" />
      <span className="text-[10px] text-neutral-500 w-12 text-right shrink-0">
        {value.toFixed(2)} {unit}
      </span>
    </div>
  );
}
