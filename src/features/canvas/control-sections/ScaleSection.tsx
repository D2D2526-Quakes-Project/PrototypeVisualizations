import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useCanvasState } from "@/features/3d/contexts/CanvasContext";
import { ImageUpscaleIcon, ListChevronsUpDownIcon, RotateCcwIcon } from "lucide-react";
import { useEffect, useState } from "react";

export function ScaleSection() {
  const {
    expansionEnabled,
    setExpansionEnabled,
    xExpansion,
    setXExpansion,
    yExpansion,
    setYExpansion,
    zExpansion,
    setZExpansion,
    displacementEnabled,
    setDisplacementEnabled,
    xyDisplacementScale: xzDisplacementScale,
    setXyDisplacementScale,
    zDisplacementScale,
    setZDisplacementScale,
    resetExpandedScale,
    resetDisplacementScale,
  } = useCanvasState();
  const [shiftHeld, setShiftHeld] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShiftHeld(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShiftHeld(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const handleExpansionChange = (axis: "x" | "y" | "z", value: number) => {
    if (!shiftHeld) {
      if (axis == "x") setXExpansion(value);
      else if (axis == "y") setYExpansion(value);
      else if (axis == "z") setZExpansion(value);
      return;
    }

    const currentValues = { x: xExpansion, y: yExpansion, z: zExpansion };
    const currentValue = currentValues[axis];
    const ratio = currentValue === 0 ? 1 : value / currentValue;

    setXExpansion(Math.max(0, Math.min(2, currentValues.x * ratio)));
    setYExpansion(Math.max(0, Math.min(2, currentValues.y * ratio)));
    setZExpansion(Math.max(0, Math.min(2, currentValues.z * ratio)));
  };

  const handleDisplacementChange = (axis: "xz" | "z", value: number) => {
    if (!shiftHeld) {
      if (axis == "xz") setXyDisplacementScale(value);
      else if (axis == "z") setZDisplacementScale(value);
      return;
    }

    const currentValues = { xz: xzDisplacementScale, z: zDisplacementScale };
    const currentValue = currentValues[axis];
    const ratio = currentValue === 0 ? 1 : value / currentValue;

    setXyDisplacementScale(Math.max(0, Math.min(5, currentValues.xz * ratio)));
    setZDisplacementScale(Math.max(0, Math.min(5, currentValues.z * ratio)));
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <ListChevronsUpDownIcon size={12} className="text-neutral-500" />
        <Label htmlFor={"expandedscaleid"} className="flex-1 cursor-pointer text-xs font-medium text-neutral-700">
          Expanded Scale
        </Label>
        {expansionEnabled && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="h-full"
            title="Reset Expansion"
            onClick={() => {
              resetExpandedScale();
            }}>
            <RotateCcwIcon className="h-3 w-3" />
          </Button>
        )}
        <Switch id={"expandedscaleid"} size="sm" checked={expansionEnabled} onCheckedChange={setExpansionEnabled} />
      </div>

      {expansionEnabled && (
        <div className="mt-1 space-y-1">
          <div className="flex items-center gap-1">
            <span className="w-4 text-xs text-neutral-500">X</span>
            <Slider
              value={[xExpansion]}
              onValueChange={(val) => handleExpansionChange("x", val[0])}
              min={0}
              max={2}
              step={0.1}
              className="flex-1"
            />
            <span className="w-8 text-right text-xs text-neutral-500">{xExpansion.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 text-xs text-neutral-500">Y</span>
            <Slider
              value={[yExpansion]}
              onValueChange={(val) => handleExpansionChange("y", val[0])}
              min={0}
              max={2}
              step={0.1}
              className="flex-1"
            />
            <span className="w-8 text-right text-xs text-neutral-500">{yExpansion.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 text-xs text-neutral-500">Z</span>
            <Slider
              value={[zExpansion]}
              onValueChange={(val) => handleExpansionChange("z", val[0])}
              min={0}
              max={2}
              step={0.1}
              className="flex-1"
            />
            <span className="w-8 text-right text-xs text-neutral-500">{zExpansion.toFixed(1)}</span>
          </div>
        </div>
      )}

      <div className="my-2 h-px w-full bg-neutral-200" />

      <div className="flex items-center gap-1">
        <ImageUpscaleIcon size={12} className="text-neutral-500" />
        <Label htmlFor={"displacementscaleid"} className="flex-1 cursor-pointer text-xs font-medium text-neutral-700">
          Displacement Scale
        </Label>
        {displacementEnabled && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="h-full"
            title="Reset Displacement"
            onClick={() => {
              resetDisplacementScale();
            }}>
            <RotateCcwIcon className="h-3 w-3" />
          </Button>
        )}
        <Switch
          id={"displacementscaleid"}
          size="sm"
          checked={displacementEnabled}
          onCheckedChange={setDisplacementEnabled}
        />
      </div>

      {displacementEnabled && (
        <div className="mt-1 space-y-1">
          <div className="flex items-center gap-1">
            <span className="w-6 text-xs text-neutral-500">XY</span>
            <Slider
              value={[xzDisplacementScale]}
              onValueChange={(val) => handleDisplacementChange("xz", val[0])}
              min={0}
              max={5}
              step={0.1}
              className="flex-1"
            />
            <span className="w-8 text-right text-xs text-neutral-500">{xzDisplacementScale.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-6 text-xs text-neutral-500">Z</span>
            <Slider
              value={[zDisplacementScale]}
              onValueChange={(val) => handleDisplacementChange("z", val[0])}
              min={0}
              max={5}
              step={0.1}
              className="flex-1"
            />
            <span className="w-8 text-right text-xs text-neutral-500">{zDisplacementScale.toFixed(1)}</span>
          </div>
        </div>
      )}
    </>
  );
}
