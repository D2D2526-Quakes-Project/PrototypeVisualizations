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
      <div className="flex items-center justify-between mb-1">
        <Label className="flex items-center gap-1 text-xs font-medium text-neutral-700 cursor-pointer">
          <LayoutGrid size={12} className="text-neutral-500" />
          Expanded Scale
        </Label>
        <Switch size="sm" checked={expansionEnabled} onCheckedChange={toggleExpansion} />
      </div>

      {expansionEnabled && (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-neutral-500 w-4">X</span>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={xExpansion}
              onChange={(e) => setExpansion("x", parseFloat(e.target.value))}
              className="flex-1 h-1"
            />
            <span className="text-[10px] text-neutral-500 w-8 text-right">
              {xExpansion.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-neutral-500 w-4">Y</span>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={yExpansion}
              onChange={(e) => setExpansion("y", parseFloat(e.target.value))}
              className="flex-1 h-1"
            />
            <span className="text-[10px] text-neutral-500 w-8 text-right">
              {yExpansion.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-neutral-500 w-4">Z</span>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={zExpansion}
              onChange={(e) => setExpansion("z", parseFloat(e.target.value))}
              className="flex-1 h-1"
            />
            <span className="text-[10px] text-neutral-500 w-8 text-right">
              {zExpansion.toFixed(1)}
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-1 mt-2">
        <Label className="flex items-center gap-1 text-xs font-medium text-neutral-700 cursor-pointer">
          <LayoutGrid size={12} className="text-neutral-500" />
          Displacement Scale
        </Label>
        <Switch size="sm" checked={displacementEnabled} onCheckedChange={toggleDisplacement} />
      </div>

      {displacementEnabled && (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-neutral-500 w-6">XY</span>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={xzDisplacementScale}
              onChange={(e) => setDisplacementScale("xz", parseFloat(e.target.value))}
              className="flex-1 h-1"
            />
            <span className="text-[10px] text-neutral-500 w-8 text-right">
              {xzDisplacementScale.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-neutral-500 w-6">Z</span>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={zDisplacementScale}
              onChange={(e) => setDisplacementScale("z", parseFloat(e.target.value))}
              className="flex-1 h-1"
            />
            <span className="text-[10px] text-neutral-500 w-8 text-right">
              {zDisplacementScale.toFixed(1)}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
