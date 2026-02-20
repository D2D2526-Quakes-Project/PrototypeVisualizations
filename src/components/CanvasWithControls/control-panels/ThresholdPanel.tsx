import { useThresholds } from "@/contexts/visualization";
import { ThresholdSlider } from "../helpers/ThresholdSlider";
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ThresholdPanelProps {
  setThreshold: (type: string, value: number) => void;
}

export function ThresholdPanel({ setThreshold }: ThresholdPanelProps) {
  const { thresholds, thresholdUnits } = useThresholds();

  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-neutral-700 mb-1">Thresholds</div>

      <ThresholdSlider
        label="Disp X"
        value={thresholds.displacementX}
        unit={thresholdUnits.displacementX}
        onChange={(v) => setThreshold("displacementX", v)}
        max={1}
      />
      <ThresholdSlider
        label="Disp Y"
        value={thresholds.displacementY}
        unit={thresholdUnits.displacementY}
        onChange={(v) => setThreshold("displacementY", v)}
        max={1}
      />
      <ThresholdSlider
        label="Disp Z"
        value={thresholds.displacementZ}
        unit={thresholdUnits.displacementZ}
        onChange={(v) => setThreshold("displacementZ", v)}
        max={5}
      />
      <ThresholdSlider
        label="Disp Mag"
        value={thresholds.displacementMag}
        unit={thresholdUnits.displacementMag}
        onChange={(v) => setThreshold("displacementMag", v)}
        max={1}
      />

      <ThresholdSlider
        label="Vel X"
        value={thresholds.velocityX}
        unit={thresholdUnits.velocityX}
        onChange={(v) => setThreshold("velocityX", v)}
        max={5}
      />
      <ThresholdSlider
        label="Vel Y"
        value={thresholds.velocityY}
        unit={thresholdUnits.velocityY}
        onChange={(v) => setThreshold("velocityY", v)}
        max={5}
      />
      <ThresholdSlider
        label="Vel Z"
        value={thresholds.velocityZ}
        unit={thresholdUnits.velocityZ}
        onChange={(v) => setThreshold("velocityZ", v)}
        max={10}
      />
      <ThresholdSlider
        label="Vel Mag"
        value={thresholds.velocityMag}
        unit={thresholdUnits.velocityMag}
        onChange={(v) => setThreshold("velocityMag", v)}
        max={5}
      />

      <ThresholdSlider
        label="Acc X"
        value={thresholds.accelerationX}
        unit={thresholdUnits.accelerationX}
        onChange={(v) => setThreshold("accelerationX", v)}
        max={20}
      />
      <ThresholdSlider
        label="Acc Y"
        value={thresholds.accelerationY}
        unit={thresholdUnits.accelerationY}
        onChange={(v) => setThreshold("accelerationY", v)}
        max={20}
      />
      <ThresholdSlider
        label="Acc Z"
        value={thresholds.accelerationZ}
        unit={thresholdUnits.accelerationZ}
        onChange={(v) => setThreshold("accelerationZ", v)}
        max={50}
      />
      <ThresholdSlider
        label="Acc Mag"
        value={thresholds.accelerationMag}
        unit={thresholdUnits.accelerationMag}
        onChange={(v) => setThreshold("accelerationMag", v)}
        max={20}
      />

      <ThresholdSlider
        label="Rot X"
        value={thresholds.rotationX}
        unit={thresholdUnits.rotationX}
        onChange={(v) => setThreshold("rotationX", v)}
        max={0.1}
      />
      <ThresholdSlider
        label="Rot Y"
        value={thresholds.rotationY}
        unit={thresholdUnits.rotationY}
        onChange={(v) => setThreshold("rotationY", v)}
        max={0.1}
      />
      <ThresholdSlider
        label="Rot Z"
        value={thresholds.rotationZ}
        unit={thresholdUnits.rotationZ}
        onChange={(v) => setThreshold("rotationZ", v)}
        max={0.1}
      />
      <ThresholdSlider
        label="Rot Mag"
        value={thresholds.rotationMag}
        unit={thresholdUnits.rotationMag}
        onChange={(v) => setThreshold("rotationMag", v)}
        max={0.1}
      />

      <ThresholdSlider
        label="ISD Peak"
        value={thresholds.interstoryDrift}
        unit={thresholdUnits.interstoryDrift}
        onChange={(v) => setThreshold("interstoryDrift", v)}
        max={5}
      />
      <ThresholdSlider
        label="ISD Avg"
        value={thresholds.interstoryDriftAvg}
        unit={thresholdUnits.interstoryDriftAvg}
        onChange={(v) => setThreshold("interstoryDriftAvg", v)}
        max={5}
      />
    </div>
  );
}

interface FloorsPanelProps {
  visibleFloors: Set<string>;
  toggleFloor: (storyId: string) => void;
  showAllFloors: () => void;
  hideAllFloors: () => void;
  storyOrder: string[];
}

export function FloorsPanel({ visibleFloors, toggleFloor, showAllFloors, hideAllFloors, storyOrder }: FloorsPanelProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <Layers size={12} className="text-neutral-500" />
          <span className="text-xs font-medium text-neutral-700">Floors</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={showAllFloors}
            className="text-[10px] px-1 py-0.5 bg-neutral-100 hover:bg-neutral-200 rounded border border-neutral-300">
            All
          </button>
          <button
            onClick={hideAllFloors}
            className="text-[10px] px-1 py-0.5 bg-neutral-100 hover:bg-neutral-200 rounded border border-neutral-300">
            None
          </button>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-0.5 max-h-32 overflow-y-auto">
        {storyOrder.map((storyId) => (
          <button
            key={storyId}
            onClick={() => toggleFloor(storyId)}
            className={`text-[10px] px-1 py-0.5 rounded border transition-colors ${
              visibleFloors.has(storyId)
                ? "bg-blue-500 text-white border-blue-600"
                : "bg-neutral-100 text-neutral-500 border-neutral-300 hover:bg-neutral-200"
            }`}>
            {storyId}
          </button>
        ))}
      </div>
    </>
  );
}
