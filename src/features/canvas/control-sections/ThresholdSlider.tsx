import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UnitTooltip } from "@/components/ui/unit-tooltip";
import type { UnitConfig } from "@/features/metrics/metrics";
import { formatNumber } from "@/lib/utils";

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
    <div className={`col-span-3 grid grid-cols-subgrid items-center gap-2 ${currentlyUsed ? "" : "opacity-50"}`}>
      <Tooltip disableHoverableContent>
        <TooltipTrigger asChild>
          <span className="text-xs text-neutral-500">{label}</span>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          {tooltip}
          <br />
          Currently: {formatNumber(value, 2)} {unit.abbr}
        </TooltipContent>
      </Tooltip>

      <div className="border-border flex min-w-32 items-center border-x px-2 py-1">
        <Slider value={[value, max]} onValueChange={(val) => onChange(val[0])} max={max} step={0.01} />
      </div>
      <span className="min-w-10 text-right text-xs text-neutral-500">
        <UnitTooltip value={value} unit={unit} decimals={2} />
      </span>
    </div>
  );
}
