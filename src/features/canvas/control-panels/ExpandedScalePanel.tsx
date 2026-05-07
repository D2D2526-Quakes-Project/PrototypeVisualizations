import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { LayoutGrid } from "lucide-react";
import { useState, useEffect } from "react";
import { useExpandedScale } from "@/features/3d/contexts/visualization";

export function ExpandedScalePanel() {
  const {
    state: {
      expansionEnabled,
      displacementEnabled,
      xExpansion,
      yExpansion,
      zExpansion,
      xzDisplacementScale,
      zDisplacementScale,
    },
    toggleExpansion,
    toggleDisplacement,
    setExpansion,
    setDisplacementScale,
  } = useExpandedScale();
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
      setExpansion(axis, value);
      return;
    }

    const currentValues = { x: xExpansion, y: yExpansion, z: zExpansion };
    const currentValue = currentValues[axis];
    const ratio = currentValue === 0 ? 1 : value / currentValue;

    setExpansion("x", Math.max(0, Math.min(2, currentValues.x * ratio)));
    setExpansion("y", Math.max(0, Math.min(2, currentValues.y * ratio)));
    setExpansion("z", Math.max(0, Math.min(2, currentValues.z * ratio)));
  };

  const handleDisplacementChange = (axis: "xz" | "z", value: number) => {
    if (!shiftHeld) {
      setDisplacementScale(axis, value);
      return;
    }

    const currentValues = { xz: xzDisplacementScale, z: zDisplacementScale };
    const currentValue = currentValues[axis];
    const ratio = currentValue === 0 ? 1 : value / currentValue;

    setDisplacementScale("xz", Math.max(0, Math.min(5, currentValues.xz * ratio)));
    setDisplacementScale("z", Math.max(0, Math.min(5, currentValues.z * ratio)));
  };
  return (
    <>
      <div className="mb-1 flex items-center justify-between">
        <Label className="flex cursor-pointer items-center gap-1 text-xs font-medium text-neutral-700">
          <LayoutGrid size={12} className="text-neutral-500" />
          Expanded Scale
        </Label>
        <Switch size="sm" checked={expansionEnabled} onCheckedChange={toggleExpansion} />
      </div>

      {expansionEnabled && (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <span className="w-4 text-[10px] text-neutral-500">X</span>
            <Slider
              value={[xExpansion]}
              onValueChange={(val) => handleExpansionChange("x", val[0])}
              min={0}
              max={2}
              step={0.1}
              className="flex-1"
            />
            <span className="w-8 text-right text-[10px] text-neutral-500">{xExpansion.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 text-[10px] text-neutral-500">Y</span>
            <Slider
              value={[yExpansion]}
              onValueChange={(val) => handleExpansionChange("y", val[0])}
              min={0}
              max={2}
              step={0.1}
              className="flex-1"
            />
            <span className="w-8 text-right text-[10px] text-neutral-500">{yExpansion.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 text-[10px] text-neutral-500">Z</span>
            <Slider
              value={[zExpansion]}
              onValueChange={(val) => handleExpansionChange("z", val[0])}
              min={0}
              max={2}
              step={0.1}
              className="flex-1"
            />
            <span className="w-8 text-right text-[10px] text-neutral-500">{zExpansion.toFixed(1)}</span>
          </div>
        </div>
      )}

      <div className="mt-2 mb-1 flex items-center justify-between">
        <Label className="flex cursor-pointer items-center gap-1 text-xs font-medium text-neutral-700">
          <LayoutGrid size={12} className="text-neutral-500" />
          Displacement Scale
        </Label>
        <Switch size="sm" checked={displacementEnabled} onCheckedChange={toggleDisplacement} />
      </div>

      {displacementEnabled && (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <span className="w-6 text-[10px] text-neutral-500">XY</span>
            <Slider
              value={[xzDisplacementScale]}
              onValueChange={(val) => handleDisplacementChange("xz", val[0])}
              min={0}
              max={5}
              step={0.1}
              className="flex-1"
            />
            <span className="w-8 text-right text-[10px] text-neutral-500">{xzDisplacementScale.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-6 text-[10px] text-neutral-500">Z</span>
            <Slider
              value={[zDisplacementScale]}
              onValueChange={(val) => handleDisplacementChange("z", val[0])}
              min={0}
              max={5}
              step={0.1}
              className="flex-1"
            />
            <span className="w-8 text-right text-[10px] text-neutral-500">{zDisplacementScale.toFixed(1)}</span>
          </div>
        </div>
      )}
    </>
  );
}
