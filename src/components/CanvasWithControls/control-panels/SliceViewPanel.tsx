import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScanEye } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { UnitTooltip } from "@/components/ui/unit-tooltip";

interface SliceViewPanelProps {
  sliceEnabled: boolean;
  xRange: [number, number];
  yRange: [number, number];
  zRange: [number, number];
  toggleSliceEnabled: () => void;
  setXRange: (range: [number, number]) => void;
  setYRange: (range: [number, number]) => void;
  setZRange: (range: [number, number]) => void;
}

export function SliceViewPanel({
  sliceEnabled,
  xRange,
  yRange,
  zRange,
  toggleSliceEnabled,
  setXRange,
  setYRange,
  setZRange,
}: SliceViewPanelProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-1">
        <Label className="flex items-center gap-1 text-xs font-medium text-neutral-700 cursor-pointer">
          <ScanEye size={12} className="text-neutral-500" />
          Slice View
        </Label>
        <Switch size="sm" checked={sliceEnabled} onCheckedChange={toggleSliceEnabled} />
      </div>

      {sliceEnabled && (
        <div className="space-y-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-neutral-500">X</span>
              <span className="text-[10px] text-neutral-500">
                <UnitTooltip value={xRange[0]} unit="in" decimals={0} /> ↔ <UnitTooltip value={xRange[1]} unit="in" decimals={0} />
              </span>
            </div>
            <Slider
              value={xRange}
              onValueChange={(val) => setXRange(val as [number, number])}
              className=""
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-neutral-500">Y</span>
              <span className="text-[10px] text-neutral-500">
                <UnitTooltip value={yRange[0]} unit="in" decimals={0} /> ↔ <UnitTooltip value={yRange[1]} unit="in" decimals={0} />
              </span>
            </div>
            <Slider
              value={yRange}
              onValueChange={(val) => setYRange(val as [number, number])}
              className=""
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-neutral-500">Z</span>
              <span className="text-[10px] text-neutral-500">
                <UnitTooltip value={zRange[0]} unit="in" decimals={0} /> ↔ <UnitTooltip value={zRange[1]} unit="in" decimals={0} />
              </span>
            </div>
            <Slider
              value={zRange}
              onValueChange={(val) => setZRange(val as [number, number])}
              className=""
            />
          </div>
        </div>
      )}
    </>
  );
}
