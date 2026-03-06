import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { UnitConfig } from "@/lib/metrics";
import { UnitTooltip } from "@/components/ui/unit-tooltip";

interface ThresholdSliderProps {
  label: string;
  value: number;
  unit: UnitConfig;
  onChange: (value: number) => void;
  max?: number;
  tooltip?: string;
  currentlyUsed?: boolean;
}

export function ThresholdSlider({
  label,
  value,
  unit,
  onChange,
  max = 1,
  tooltip,
  currentlyUsed = false,
}: ThresholdSliderProps) {
  return (
    <div className={`flex items-center gap-1 ${currentlyUsed ? "" : "opacity-50"}`}>
      <Tooltip disableHoverableContent>
        <TooltipTrigger asChild>
          <span className="w-8 shrink-0 text-[10px] text-neutral-500">{label}</span>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          {tooltip}
          <br />
          Currently: <UnitTooltip value={value} unit={unit.abbr} decimals={2} />
        </TooltipContent>
      </Tooltip>

      <Slider value={[value]} onValueChange={(val) => onChange(val[0])} max={max} step={0.01} className="flex-1" />
      <span className="w-12 shrink-0 text-right text-[10px] text-neutral-500">
        <UnitTooltip value={value} unit={unit.abbr} decimals={2} />
      </span>
    </div>
  );
}
