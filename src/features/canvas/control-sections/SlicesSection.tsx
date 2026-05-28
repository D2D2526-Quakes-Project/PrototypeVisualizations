import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SquareSplitHorizontalIcon } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { UnitTooltip } from "@/components/ui/unit-tooltip";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useCanvasState } from "@/features/3d/contexts/CanvasContext";

export function SlicesSection() {
  const {
    sliceEnabled,
    setSliceEnabled,
    sliceXRange,
    sliceYRange,
    sliceZRange,
    setSliceXRange,
    setSliceYRange,
    setSliceZRange,
  } = useCanvasState();
  const { animationData } = useAnimationData();

  const maxBounds = animationData.precomputed.boundingBox.max;
  const minBounds = animationData.precomputed.boundingBox.min;

  return (
    <>
      <Label className="flex items-center gap-1">
        <SquareSplitHorizontalIcon size={12} className="text-muted-foreground" />
        <span className="text-foreground flex-1 text-xs font-medium">Slice View</span>
        <Switch size="sm" checked={sliceEnabled} onCheckedChange={setSliceEnabled} />
      </Label>

      {sliceEnabled && (
        <div className="space-y-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-muted-foreground text-xs">X</span>
              <span className="text-muted-foreground text-xs">
                <UnitTooltip value={sliceXRange[0] / 12} unit="feet" decimals={0} /> ↔{" "}
                <UnitTooltip value={sliceXRange[1] / 12} unit="feet" decimals={0} />
              </span>
            </div>
            <Slider
              value={sliceXRange}
              onValueChange={(val) => setSliceXRange(val as [number, number])}
              max={maxBounds[0]}
              min={minBounds[0]}
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-muted-foreground text-xs">Y</span>
              <span className="text-muted-foreground text-xs">
                <UnitTooltip value={sliceYRange[0] / 12} unit="feet" decimals={0} /> ↔{" "}
                <UnitTooltip value={sliceYRange[1] / 12} unit="feet" decimals={0} />
              </span>
            </div>
            <Slider
              value={sliceYRange}
              onValueChange={(val) => setSliceYRange(val as [number, number])}
              max={maxBounds[1]}
              min={minBounds[1]}
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-muted-foreground text-xs">Z</span>
              <span className="text-muted-foreground text-xs">
                <UnitTooltip value={sliceZRange[0] / 12} unit="feet" decimals={0} /> ↔{" "}
                <UnitTooltip value={sliceZRange[1] / 12} unit="feet" decimals={0} />
              </span>
            </div>
            <Slider
              value={sliceZRange}
              onValueChange={(val) => setSliceZRange(val as [number, number])}
              max={maxBounds[2]}
              min={minBounds[2]}
            />
          </div>
        </div>
      )}
    </>
  );
}
