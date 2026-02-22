import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatValue, getConversions, CONVERSION_UNITS as UNITS } from "@/lib/metrics";

interface UnitTooltipProps {
  value: number;
  unit: string;
  decimals?: number;
  showConversions?: boolean;
  side?: "top" | "right" | "bottom" | "left";
  children?: React.ReactNode;
}

export function UnitTooltip({
  value,
  unit,
  decimals = 3,
  showConversions = true,
  side = "top",
  children,
}: UnitTooltipProps) {
  const unitInfo = UNITS[unit];
  const fullName = unitInfo?.fullName || unit;
  const conversions = showConversions ? getConversions(value, unit) : [];

  const content = (
    <div className="flex flex-col gap-1 min-w-25">
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
              <span className="text-white/60 text-xs flex justify-between flex-1 gap-2">
                <span>{conv.unit}</span>
                <span>({conv.fullName})</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const displayValue = (
    <span className="cursor-help">
      {children || (
        <span>
          {formatValue(value, decimals)}
          {unit}
        </span>
      )}
    </span>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{displayValue}</TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
