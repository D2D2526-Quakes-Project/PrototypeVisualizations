import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScanEye } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { UnitTooltip } from "@/components/ui/unit-tooltip";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useCamera } from "@/features/3d/contexts/CanvasContext";

export function SliceViewPanel() {
  const { sliceEnabled, setSliceEnabled, xRange, yRange, zRange, setXRange, setYRange, setZRange } = useCamera();
  const { animationData } = useAnimationData();

  const maxBounds = animationData.precomputed.boundingBox.max;
  const minBounds = animationData.precomputed.boundingBox.min;

  return (
    <>
      <div className="mb-1 flex items-center justify-between">
        <Label className="flex cursor-pointer items-center gap-1 text-xs font-medium text-neutral-700">
          <ScanEye size={12} className="text-neutral-500" />
          Slice View
        </Label>
        <Switch size="sm" checked={sliceEnabled} onCheckedChange={setSliceEnabled} />
      </div>

      {sliceEnabled && (
        <div className="space-y-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-neutral-500">X</span>
              <span className="text-[10px] text-neutral-500">
                <UnitTooltip value={xRange[0]} unit="in" decimals={0} /> ↔{" "}
                <UnitTooltip value={xRange[1]} unit="in" decimals={0} />
              </span>
            </div>
            <Slider
              value={xRange}
              onValueChange={(val) => setXRange(val as [number, number])}
              max={maxBounds[0]}
              min={minBounds[0]}
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-neutral-500">Y</span>
              <span className="text-[10px] text-neutral-500">
                <UnitTooltip value={yRange[0]} unit="in" decimals={0} /> ↔{" "}
                <UnitTooltip value={yRange[1]} unit="in" decimals={0} />
              </span>
            </div>
            <Slider
              value={yRange}
              onValueChange={(val) => setYRange(val as [number, number])}
              max={maxBounds[1]}
              min={minBounds[1]}
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-neutral-500">Z</span>
              <span className="text-[10px] text-neutral-500">
                <UnitTooltip value={zRange[0]} unit="in" decimals={0} /> ↔{" "}
                <UnitTooltip value={zRange[1]} unit="in" decimals={0} />
              </span>
            </div>
            <Slider
              value={zRange}
              onValueChange={(val) => setZRange(val as [number, number])}
              max={maxBounds[2]}
              min={minBounds[2]}
            />
          </div>
        </div>
      )}
    </>
  );
}
