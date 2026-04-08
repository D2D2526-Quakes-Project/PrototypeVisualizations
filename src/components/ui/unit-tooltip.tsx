import { memo, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatValue, getConversions, CONVERSION_UNITS as UNITS } from "@/lib/metrics";
import { usePlayback } from "@/features/playback/PlaybackContext";

interface UnitTooltipProps {
  value: number;
  unit: string;
  decimals?: number;
  showConversions?: boolean;
  side?: "top" | "right" | "bottom" | "left";
  children?: React.ReactNode;
}

interface TooltipBodyProps {
  value: number;
  unit: string;
  decimals: number;
  showConversions: boolean;
}

const TooltipBody = memo(function TooltipBody({ value, unit, decimals, showConversions }: TooltipBodyProps) {
  const unitInfo = UNITS[unit];
  const fullName = unitInfo?.fullName || unit;
  const conversions = useMemo(
    () => (showConversions ? getConversions(value, unit) : []),
    [showConversions, value, unit]
  );

  return (
    <div className="flex min-w-25 flex-col gap-1">
      <div
        className={`flex items-center justify-between gap-4 border-white/20 pb-1 ${conversions.length > 0 ? "border-b" : ""}`}>
        <span className="font-medium">{formatValue(value, decimals)}</span>
        <span className="text-white/70">{fullName}</span>
      </div>
      {conversions.length > 0 && (
        <div className="flex flex-col gap-0.5 py-1">
          {conversions.map((conv) => (
            <div key={conv.unit} className="flex items-center justify-between gap-1 text-white/80">
              <span>{formatValue(conv.value, decimals)}</span>
              <span className="flex flex-1 justify-between gap-2 text-xs text-white/60">
                <span>{conv.unit}</span>
                <span>({conv.fullName})</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

function UnitTooltipComponent({
  value,
  unit,
  decimals = 2,
  showConversions = true,
  side = "top",
  children,
}: UnitTooltipProps) {
  const formattedValue = useMemo(() => formatValue(value, decimals), [value, decimals]);
  const { playing } = usePlayback();
  const interactive = !playing;

  const displayValue = (
    <span className={interactive ? "cursor-help" : undefined}>
      {children || (
        <span>
          {formattedValue} {unit}
        </span>
      )}
    </span>
  );

  if (!interactive) {
    return displayValue;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{displayValue}</TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs">
        <TooltipBody value={value} unit={unit} decimals={decimals} showConversions={showConversions} />
      </TooltipContent>
    </Tooltip>
  );
}

function areUnitTooltipPropsEqual(prev: UnitTooltipProps, next: UnitTooltipProps): boolean {
  return (
    Object.is(prev.value, next.value) &&
    prev.unit === next.unit &&
    prev.decimals === next.decimals &&
    prev.showConversions === next.showConversions &&
    prev.side === next.side &&
    prev.children === next.children
  );
}

export const UnitTooltip = memo(UnitTooltipComponent, areUnitTooltipPropsEqual);
