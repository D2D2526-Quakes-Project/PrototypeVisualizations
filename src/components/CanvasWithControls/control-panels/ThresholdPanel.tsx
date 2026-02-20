import { useThresholds } from "@/contexts/visualization";
import type { BuildingAnimationData } from "@/lib/types";
import type { ThresholdType } from "@/stores";
import { Sliders, Layers } from "lucide-react";
import { ThresholdSlider } from "../helpers/ThresholdSlider";

interface ThresholdPanelProps {
  animationData: BuildingAnimationData;
  setThreshold: (type: ThresholdType, value: number) => void;
}

export function ThresholdPanel({ animationData, setThreshold }: ThresholdPanelProps) {
  const { thresholds, thresholdUnits } = useThresholds();

  const maxDisp = animationData.precomputed.maxDisplacement * 1.2;
  const maxVel = (animationData.precomputed.maxVelocity ?? 10) * 1.2;
  const maxAcc = (animationData.precomputed.maxAcceleration ?? 20) * 1.2;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 mb-1">
        <Sliders size={12} className="text-neutral-500" />
        <span className="text-xs font-medium text-neutral-700">Thresholds</span>
      </div>

      <ThresholdSlider
        label="Disp"
        value={thresholds.displacementMag}
        unit={thresholdUnits.displacementMag}
        onChange={(v) => setThreshold("displacementMag", v)}
        max={maxDisp}
        tooltip="Displacement magnitude threshold - nodes above this value will be highlighted"
      />
      <ThresholdSlider
        label="Disp X"
        value={thresholds.displacementX}
        unit={thresholdUnits.displacementX}
        onChange={(v) => setThreshold("displacementX", v)}
        max={maxDisp}
        tooltip="Displacement threshold in X direction (horizontal)"
      />
      <ThresholdSlider
        label="Disp Y"
        value={thresholds.displacementY}
        unit={thresholdUnits.displacementY}
        onChange={(v) => setThreshold("displacementY", v)}
        max={maxDisp}
        tooltip="Displacement threshold in Y direction (horizontal)"
      />
      <ThresholdSlider
        label="Disp Z"
        value={thresholds.displacementZ}
        unit={thresholdUnits.displacementZ}
        onChange={(v) => setThreshold("displacementZ", v)}
        max={maxDisp}
        tooltip="Displacement threshold in Z direction (vertical)"
      />

      {animationData.displacementRot && (
        <>
          <ThresholdSlider
            label="Rot"
            value={thresholds.rotationMag}
            unit={thresholdUnits.rotationMag}
            onChange={(v) => setThreshold("rotationMag", v)}
            max={0.05}
            tooltip="Combined rotation magnitude threshold (radians)"
          />
          <ThresholdSlider
            label="Rot X"
            value={thresholds.rotationX}
            unit={thresholdUnits.rotationX}
            onChange={(v) => setThreshold("rotationX", v)}
            max={0.05}
            tooltip="Rotation threshold about X axis (radians)"
          />
          <ThresholdSlider
            label="Rot Y"
            value={thresholds.rotationY}
            unit={thresholdUnits.rotationY}
            onChange={(v) => setThreshold("rotationY", v)}
            max={0.05}
            tooltip="Rotation threshold about Y axis (radians)"
          />
          <ThresholdSlider
            label="Rot Z"
            value={thresholds.rotationZ}
            unit={thresholdUnits.rotationZ}
            onChange={(v) => setThreshold("rotationZ", v)}
            max={0.05}
            tooltip="Rotation threshold about Z axis (radians)"
          />
        </>
      )}

      {animationData.velocityLin && (
        <>
          <ThresholdSlider
            label="Vel"
            value={thresholds.velocityMag}
            unit={thresholdUnits.velocityMag}
            onChange={(v) => setThreshold("velocityMag", v)}
            max={maxVel}
            tooltip="Velocity magnitude threshold (inches/second)"
          />
          <ThresholdSlider
            label="Vel X"
            value={thresholds.velocityX}
            unit={thresholdUnits.velocityX}
            onChange={(v) => setThreshold("velocityX", v)}
            max={maxVel}
            tooltip="Velocity threshold in X direction (inches/second)"
          />
          <ThresholdSlider
            label="Vel Y"
            value={thresholds.velocityY}
            unit={thresholdUnits.velocityY}
            onChange={(v) => setThreshold("velocityY", v)}
            max={maxVel}
            tooltip="Velocity threshold in Y direction (inches/second)"
          />
          <ThresholdSlider
            label="Vel Z"
            value={thresholds.velocityZ}
            unit={thresholdUnits.velocityZ}
            onChange={(v) => setThreshold("velocityZ", v)}
            max={maxVel}
            tooltip="Velocity threshold in Z direction (inches/second)"
          />
        </>
      )}

      {animationData.velocityRot && (
        <>
          <ThresholdSlider
            label="RVel"
            value={thresholds.rotationVelocityMag}
            unit={thresholdUnits.rotationVelocityMag}
            onChange={(v) => setThreshold("rotationVelocityMag", v)}
            max={0.5}
            tooltip="Angular velocity magnitude threshold (radians/second)"
          />
          <ThresholdSlider
            label="RVel X"
            value={thresholds.rotationVelocityX}
            unit={thresholdUnits.rotationVelocityX}
            onChange={(v) => setThreshold("rotationVelocityX", v)}
            max={0.5}
            tooltip="Angular velocity threshold about X axis (radians/second)"
          />
          <ThresholdSlider
            label="RVel Y"
            value={thresholds.rotationVelocityY}
            unit={thresholdUnits.rotationVelocityY}
            onChange={(v) => setThreshold("rotationVelocityY", v)}
            max={0.5}
            tooltip="Angular velocity threshold about Y axis (radians/second)"
          />
          <ThresholdSlider
            label="RVel Z"
            value={thresholds.rotationVelocityZ}
            unit={thresholdUnits.rotationVelocityZ}
            onChange={(v) => setThreshold("rotationVelocityZ", v)}
            max={0.5}
            tooltip="Angular velocity threshold about Z axis (radians/second)"
          />
        </>
      )}

      {animationData.accelerationLin && (
        <>
          <ThresholdSlider
            label="Acc"
            value={thresholds.accelerationMag}
            unit={thresholdUnits.accelerationMag}
            onChange={(v) => setThreshold("accelerationMag", v)}
            max={maxAcc}
            tooltip="Acceleration magnitude threshold (inches/second²)"
          />
          <ThresholdSlider
            label="Acc X"
            value={thresholds.accelerationX}
            unit={thresholdUnits.accelerationX}
            onChange={(v) => setThreshold("accelerationX", v)}
            max={maxAcc}
            tooltip="Acceleration threshold in X direction (inches/second²)"
          />
          <ThresholdSlider
            label="Acc Y"
            value={thresholds.accelerationY}
            unit={thresholdUnits.accelerationY}
            onChange={(v) => setThreshold("accelerationY", v)}
            max={maxAcc}
            tooltip="Acceleration threshold in Y direction (inches/second²)"
          />
          <ThresholdSlider
            label="Acc Z"
            value={thresholds.accelerationZ}
            unit={thresholdUnits.accelerationZ}
            onChange={(v) => setThreshold("accelerationZ", v)}
            max={maxAcc}
            tooltip="Acceleration threshold in Z direction (inches/second²)"
          />
        </>
      )}

      {animationData.accelerationRot && (
        <>
          <ThresholdSlider
            label="RAcc"
            value={thresholds.rotationAccelerationMag}
            unit={thresholdUnits.rotationAccelerationMag}
            onChange={(v) => setThreshold("rotationAccelerationMag", v)}
            max={2}
            tooltip="Angular acceleration magnitude threshold (radians/second²)"
          />
          <ThresholdSlider
            label="RAcc X"
            value={thresholds.rotationAccelerationX}
            unit={thresholdUnits.rotationAccelerationX}
            onChange={(v) => setThreshold("rotationAccelerationX", v)}
            max={2}
            tooltip="Angular acceleration threshold about X axis (radians/second²)"
          />
          <ThresholdSlider
            label="RAcc Y"
            value={thresholds.rotationAccelerationY}
            unit={thresholdUnits.rotationAccelerationY}
            onChange={(v) => setThreshold("rotationAccelerationY", v)}
            max={2}
            tooltip="Angular acceleration threshold about Y axis (radians/second²)"
          />
          <ThresholdSlider
            label="RAcc Z"
            value={thresholds.rotationAccelerationZ}
            unit={thresholdUnits.rotationAccelerationZ}
            onChange={(v) => setThreshold("rotationAccelerationZ", v)}
            max={2}
            tooltip="Angular acceleration threshold about Z axis (radians/second²)"
          />
        </>
      )}

      <ThresholdSlider
        label="ISD Peak"
        value={thresholds.interstoryDrift}
        unit={thresholdUnits.interstoryDrift}
        onChange={(v) => setThreshold("interstoryDrift", v)}
        max={5}
        tooltip="Peak interstory drift ratio threshold - floors exceeding this % will be highlighted"
      />
      <ThresholdSlider
        label="ISD Avg"
        value={thresholds.interstoryDriftAvg}
        unit={thresholdUnits.interstoryDriftAvg}
        onChange={(v) => setThreshold("interstoryDriftAvg", v)}
        max={5}
        tooltip="Average interstory drift ratio threshold across all floors (%)"
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

export function FloorsPanel({
  visibleFloors,
  toggleFloor,
  showAllFloors,
  hideAllFloors,
  storyOrder,
}: FloorsPanelProps) {
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
      <div className="grid grid-cols-3 gap-0.5 max-h-32 overflow-y-auto">
        {storyOrder.map((storyId) => (
          <button
            key={storyId}
            onClick={() => toggleFloor(storyId)}
            className={`text-[9px] px-1 py-0.5 rounded border transition-colors ${
              visibleFloors.has(storyId)
                ? "bg-blue-100 border-blue-300 text-blue-700"
                : "bg-neutral-100 border-neutral-300 text-neutral-400"
            }`}>
            {storyId}
          </button>
        ))}
      </div>
    </>
  );
}
