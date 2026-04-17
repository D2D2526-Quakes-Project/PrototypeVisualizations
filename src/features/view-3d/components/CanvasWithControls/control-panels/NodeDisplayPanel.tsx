import { Slider } from "@/components/ui/slider";
import { useViewStore } from "@/state";
import {
  BlendIcon,
  ChevronsLeftRightEllipsisIcon,
  Circle,
  Layers,
  MoveHorizontal,
  MoveVertical,
  Sliders,
} from "lucide-react";

export function NodeDisplayPanel() {
  const nodeScale = useViewStore((s) => s.nodeScale);
  const nodeOpacity = useViewStore((s) => s.nodeOpacity);
  const floorOpacity = useViewStore((s) => s.floorOpacity);
  const belowThresholdNodeScale = useViewStore((s) => s.belowThresholdNodeScale);
  const connectionLineWidth = useViewStore((s) => s.connectionLineWidth);
  const connectionLineOpacity = useViewStore((s) => s.connectionLineOpacity);
  // const belowThresholdNodeOpacity = useViewStore((s) => s.belowThresholdNodeOpacity);
  const setNodeScale = useViewStore((s) => s.setNodeScale);
  const setNodeOpacity = useViewStore((s) => s.setNodeOpacity);
  const setBelowThresholdNodeScale = useViewStore((s) => s.setBelowThresholdNodeScale);
  // const setBelowThresholdNodeOpacity = useViewStore((s) => s.setBelowThresholdNodeOpacity);
  const setFloorOpacity = useViewStore((s) => s.setFloorOpacity);
  const setConnectionLineWidth = useViewStore((s) => s.setConnectionLineWidth);
  const setConnectionLineOpacity = useViewStore((s) => s.setConnectionLineOpacity);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Sliders size={12} className="text-neutral-500" />
        <span className="text-xs font-medium text-neutral-700">Node Display</span>
      </div>

      <div className="flex items-center gap-2">
        <Circle size={12} className="shrink-0 text-neutral-400" />
        <span className="w-16 shrink-0 text-[10px] text-neutral-500">Scale</span>
        <Slider
          value={[nodeScale]}
          onValueChange={(val) => setNodeScale(val[0])}
          min={0.1}
          max={3}
          step={0.1}
          className="flex-1"
        />
        <span className="w-10 shrink-0 text-right text-[10px] text-neutral-500">{nodeScale.toFixed(1)}x</span>
      </div>

      <div className="flex items-center gap-2">
        <BlendIcon size={12} className="shrink-0 text-neutral-400" />
        <span className="w-16 shrink-0 text-[10px] text-neutral-500">Opacity</span>
        <Slider
          value={[nodeOpacity]}
          onValueChange={(val) => setNodeOpacity(val[0])}
          min={0}
          max={1}
          step={0.05}
          className="flex-1"
        />
        <span className="w-10 shrink-0 text-right text-[10px] text-neutral-500">{(nodeOpacity * 100).toFixed(0)}%</span>
      </div>

      <div className="flex items-center gap-2">
        <Layers size={12} className="shrink-0 text-neutral-400" />
        <span className="w-16 shrink-0 text-[10px] text-neutral-500">Floor</span>
        <Slider
          value={[floorOpacity]}
          onValueChange={(val) => setFloorOpacity(val[0])}
          min={0}
          max={1}
          step={0.05}
          className="flex-1"
        />
        <span className="w-10 shrink-0 text-right text-[10px] text-neutral-500">
          {(floorOpacity * 100).toFixed(0)}%
        </span>
      </div>

      <div className="flex items-center gap-2">
        <MoveHorizontal size={12} className="shrink-0 text-neutral-400" />
        <span className="w-16 shrink-0 text-[10px] text-neutral-500">Conn Width</span>
        <Slider
          value={[connectionLineWidth]}
          onValueChange={(val) => setConnectionLineWidth(val[0])}
          min={1}
          max={10}
          step={0.5}
          className="flex-1"
        />
        <span className="w-10 shrink-0 text-right text-[10px] text-neutral-500">{connectionLineWidth.toFixed(1)}</span>
      </div>

      <div className="flex items-center gap-2">
        <ChevronsLeftRightEllipsisIcon size={12} className="shrink-0 text-neutral-400" />
        <span className="w-16 shrink-0 text-[10px] text-neutral-500">Conn Opacity</span>
        <Slider
          value={[connectionLineOpacity]}
          onValueChange={(val) => setConnectionLineOpacity(val[0])}
          min={0}
          max={1}
          step={0.05}
          className="flex-1"
        />
        <span className="w-10 shrink-0 text-right text-[10px] text-neutral-500">
          {(connectionLineOpacity * 100).toFixed(0)}%
        </span>
      </div>

      <div className="border-neutral-200">
        <span className="text-[10px] font-medium text-neutral-600">Below Threshold</span>
      </div>

      <div className="flex items-center gap-2">
        <Circle size={12} className="shrink-0 text-neutral-400" />
        <span className="w-16 shrink-0 text-[10px] text-neutral-500">Scale</span>
        <Slider
          value={[belowThresholdNodeScale]}
          onValueChange={(val) => setBelowThresholdNodeScale(val[0])}
          min={0}
          max={1}
          step={0.05}
          className="flex-1"
        />
        <span className="w-10 shrink-0 text-right text-[10px] text-neutral-500">
          {belowThresholdNodeScale.toFixed(1)}x
        </span>
      </div>

      {/* <div className="flex items-center gap-2">
        <Circle size={12} className="shrink-0 text-neutral-400" />
        <span className="w-16 shrink-0 text-[10px] text-neutral-500">Opacity</span>
        <Slider
          value={[belowThresholdNodeOpacity]}
          onValueChange={(val) => setBelowThresholdNodeOpacity(val[0])}
          min={0}
          max={1}
          step={0.05}
          className="flex-1"
        />
        <span className="w-10 shrink-0 text-right text-[10px] text-neutral-500">
          {Math.round(belowThresholdNodeOpacity * 100)}%
        </span>
      </div> */}
    </div>
  );
}
