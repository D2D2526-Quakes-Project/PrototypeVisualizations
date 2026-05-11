import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { convertUnits, getConversions, UNITS, type Unit } from "@/features/metrics/metrics";
import { usePlayback } from "@/features/playback/usePlayback";
import { formatNumber } from "@/lib/utils";
import { memo, useMemo } from "react";

interface UnitTooltipProps {
  value: number;
  unit: Unit;
  decimals?: number;
  showConversions?: boolean;
  side?: "top" | "right" | "bottom" | "left";
  children?: React.ReactNode;
}

interface TooltipBodyProps {
  value: number;
  unit: Unit;
  decimals: number;
  showConversions: boolean;
}

const TooltipBody = memo(function TooltipBody({ value, unit: unitKey, decimals, showConversions }: TooltipBodyProps) {
  const unit = UNITS[unitKey];
  const fullName = unit.label;
  const conversions = useMemo(() => (showConversions ? getConversions(unitKey) : []), [showConversions, unitKey]);

  return (
    <div className="flex min-w-25 flex-col gap-1">
      <div
        className={`flex items-center justify-between gap-4 border-white/20 pb-1 ${conversions.length > 0 ? "border-b" : ""}`}>
        <span className="font-medium">{formatNumber(value, decimals)}</span>
        <span className="text-white/70">{fullName}</span>
      </div>
      {conversions.length > 0 && (
        <div className="flex flex-col gap-0.5 py-1">
          {conversions.map((conv) => {
            const conversion = UNITS[conv];
            const convertedValue = convertUnits(value, unit.label, conv);

            if (!convertedValue) return null;

            return (
              <div key={conv} className="flex items-center justify-between gap-1 text-white/80">
                <span>{formatNumber(convertedValue, decimals)}</span>
                <span className="flex flex-1 justify-between gap-2 text-xs text-white/60">
                  <span>{conversion.abbr}</span>
                  <span>({conversion.label})</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

function UnitTooltipComponent({
  value,
  unit: unitKey,
  decimals = 2,
  showConversions = true,
  side = "top",
  children,
}: UnitTooltipProps) {
  const formattedValue = useMemo(() => formatNumber(value, decimals), [value, decimals]);
  const { playing } = usePlayback();
  const interactive = !playing;
  const unit = UNITS[unitKey];

  const displayValue = (
    <span className={interactive ? "cursor-help" : undefined}>
      {children || (
        <span>
          {formattedValue} {unit.abbr}
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
        <TooltipBody value={value} unit={unitKey} decimals={decimals} showConversions={showConversions} />
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
