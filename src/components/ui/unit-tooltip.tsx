import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatValue, getConversions, CONVERSION_UNITS as UNITS } from "@/lib/metrics";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

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
  const [copied, setCopied] = useState(false);

  const unitInfo = UNITS[unit];
  const fullName = unitInfo?.fullName || unit;
  const conversions = showConversions ? getConversions(value, unit) : [];

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(formatValue(value, decimals));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

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
      <button
        onClick={handleCopy}
        className="flex items-center justify-center gap-1 mt-1 pt-1 border-t border-white/20 text-xs text-white/70 hover:text-white hover:bg-white/10 rounded py-0.5 transition-colors">
        {copied ? (
          <>
            <Check className="w-3 h-3" />
            <span>Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-3 h-3" />
            <span>Click to copy</span>
          </>
        )}
      </button>
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
