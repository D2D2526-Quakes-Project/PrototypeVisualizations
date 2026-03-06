import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LayoutGrid } from "lucide-react";

interface ExpandedScalePanelProps {
  expansionEnabled: boolean;
  displacementEnabled: boolean;
  xExpansion: number;
  yExpansion: number;
  zExpansion: number;
  xzDisplacementScale: number;
  zDisplacementScale: number;
  toggleExpansion: () => void;
  toggleDisplacement: () => void;
  setExpansion: (axis: "x" | "y" | "z", factor: number) => void;
  setDisplacementScale: (axis: "xz" | "z", factor: number) => void;
}

export function ExpandedScalePanel({
  expansionEnabled,
  displacementEnabled,
  xExpansion,
  yExpansion,
  zExpansion,
  xzDisplacementScale,
  zDisplacementScale,
  toggleExpansion,
  toggleDisplacement,
  setExpansion,
  setDisplacementScale,
}: ExpandedScalePanelProps) {
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
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={xExpansion}
              onChange={(e) => setExpansion("x", parseFloat(e.target.value))}
              className="h-1 flex-1"
            />
            <span className="w-8 text-right text-[10px] text-neutral-500">{xExpansion.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 text-[10px] text-neutral-500">Y</span>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={yExpansion}
              onChange={(e) => setExpansion("y", parseFloat(e.target.value))}
              className="h-1 flex-1"
            />
            <span className="w-8 text-right text-[10px] text-neutral-500">{yExpansion.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 text-[10px] text-neutral-500">Z</span>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={zExpansion}
              onChange={(e) => setExpansion("z", parseFloat(e.target.value))}
              className="h-1 flex-1"
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
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={xzDisplacementScale}
              onChange={(e) => setDisplacementScale("xz", parseFloat(e.target.value))}
              className="h-1 flex-1"
            />
            <span className="w-8 text-right text-[10px] text-neutral-500">{xzDisplacementScale.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-6 text-[10px] text-neutral-500">Z</span>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={zDisplacementScale}
              onChange={(e) => setDisplacementScale("z", parseFloat(e.target.value))}
              className="h-1 flex-1"
            />
            <span className="w-8 text-right text-[10px] text-neutral-500">{zDisplacementScale.toFixed(1)}</span>
          </div>
        </div>
      )}
    </>
  );
}
