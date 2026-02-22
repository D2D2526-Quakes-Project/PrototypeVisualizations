import { useThresholds } from "@/features/view-3d/contexts/visualization";
import { METRIC_CONFIGS, type Metric } from "@/lib/metrics";
import type { BuildingAnimationData } from "@/lib/types";
import { Layers, RotateCcw, Sliders } from "lucide-react";
import { ThresholdSlider } from "../ThresholdSlider";

interface ThresholdPanelProps {
  animationData: BuildingAnimationData;
  setThreshold: (type: Metric, value: number) => void;
  currentMetric: Metric;
}

function isThresholdUsed(thresholdKey: Metric, currentMetric: Metric): boolean {
  return currentMetric === thresholdKey;
}

export function ThresholdPanel({ animationData, setThreshold, currentMetric }: ThresholdPanelProps) {
  const { thresholds, resetThresholds } = useThresholds();

  const maxDisp = animationData.precomputed.maxDisplacement * 1.2;
  const maxVel = (animationData.precomputed.maxVelocity ?? 10) * 1.2;
  const maxAcc = (animationData.precomputed.maxAcceleration ?? 20) * 1.2;

  const maxRot = (animationData.precomputed.maxRotation ?? 0.05) * 1.2;
  const maxRotVel = (animationData.precomputed.maxRotationVelocity ?? 0.5) * 1.2;
  const maxRotAcc = (animationData.precomputed.maxRotationAcceleration ?? 2) * 1.2;

  const maxISD = (animationData.precomputed.maxStoryDrift ?? 5) * 1.2;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1">
          <Sliders size={12} className="text-neutral-500" />
          <span className="text-xs font-medium text-neutral-700">Thresholds</span>
        </div>
        <button
          onClick={resetThresholds}
          className="inline-flex items-center gap-1 rounded border border-neutral-300 bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-700 transition-colors hover:bg-neutral-200"
          title="Reset all thresholds to default values">
          <RotateCcw size={10} />
          Reset
        </button>
      </div>

      <ThresholdSlider
        label="Disp"
        value={thresholds.displacementMag}
        unit={METRIC_CONFIGS.displacementMag.unit}
        onChange={(v) => setThreshold("displacementMag", v)}
        max={maxDisp}
        tooltip="Displacement magnitude threshold - nodes above this value will be highlighted"
        currentlyUsed={isThresholdUsed("displacementMag", currentMetric)}
      />
      <ThresholdSlider
        label="Disp X"
        value={thresholds.displacementX}
        unit={METRIC_CONFIGS.displacementX.unit}
        onChange={(v) => setThreshold("displacementX", v)}
        max={maxDisp}
        tooltip="Displacement threshold in X direction (horizontal)"
        currentlyUsed={isThresholdUsed("displacementX", currentMetric)}
      />
      <ThresholdSlider
        label="Disp Y"
        value={thresholds.displacementY}
        unit={METRIC_CONFIGS.displacementY.unit}
        onChange={(v) => setThreshold("displacementY", v)}
        max={maxDisp}
        tooltip="Displacement threshold in Y direction (horizontal)"
        currentlyUsed={isThresholdUsed("displacementY", currentMetric)}
      />
      <ThresholdSlider
        label="Disp Z"
        value={thresholds.displacementZ}
        unit={METRIC_CONFIGS.displacementZ.unit}
        onChange={(v) => setThreshold("displacementZ", v)}
        max={maxDisp}
        tooltip="Displacement threshold in Z direction (vertical)"
        currentlyUsed={isThresholdUsed("displacementZ", currentMetric)}
      />

      {animationData.displacementRot && (
        <>
          <ThresholdSlider
            label="Rot"
            value={thresholds.rotationMag}
            unit={METRIC_CONFIGS.rotationMag.unit}
            onChange={(v) => setThreshold("rotationMag", v)}
            max={maxRot}
            tooltip="Combined rotation magnitude threshold (radians)"
            currentlyUsed={isThresholdUsed("rotationMag", currentMetric)}
          />
          <ThresholdSlider
            label="Rot X"
            value={thresholds.rotationX}
            unit={METRIC_CONFIGS.rotationX.unit}
            onChange={(v) => setThreshold("rotationX", v)}
            max={maxRot}
            tooltip="Rotation threshold about X axis (radians)"
            currentlyUsed={isThresholdUsed("rotationX", currentMetric)}
          />
          <ThresholdSlider
            label="Rot Y"
            value={thresholds.rotationY}
            unit={METRIC_CONFIGS.rotationY.unit}
            onChange={(v) => setThreshold("rotationY", v)}
            max={maxRot}
            tooltip="Rotation threshold about Y axis (radians)"
            currentlyUsed={isThresholdUsed("rotationY", currentMetric)}
          />
          <ThresholdSlider
            label="Rot Z"
            value={thresholds.rotationZ}
            unit={METRIC_CONFIGS.rotationZ.unit}
            onChange={(v) => setThreshold("rotationZ", v)}
            max={maxRot}
            tooltip="Rotation threshold about Z axis (radians)"
            currentlyUsed={isThresholdUsed("rotationZ", currentMetric)}
          />
        </>
      )}

      {animationData.velocityLin && (
        <>
          <ThresholdSlider
            label="Vel"
            value={thresholds.velocityMag}
            unit={METRIC_CONFIGS.velocityMag.unit}
            onChange={(v) => setThreshold("velocityMag", v)}
            max={maxVel}
            tooltip="Velocity magnitude threshold (inches/second)"
            currentlyUsed={isThresholdUsed("velocityMag", currentMetric)}
          />
          <ThresholdSlider
            label="Vel X"
            value={thresholds.velocityX}
            unit={METRIC_CONFIGS.velocityX.unit}
            onChange={(v) => setThreshold("velocityX", v)}
            max={maxVel}
            tooltip="Velocity threshold in X direction (inches/second)"
            currentlyUsed={isThresholdUsed("velocityX", currentMetric)}
          />
          <ThresholdSlider
            label="Vel Y"
            value={thresholds.velocityY}
            unit={METRIC_CONFIGS.velocityY.unit}
            onChange={(v) => setThreshold("velocityY", v)}
            max={maxVel}
            tooltip="Velocity threshold in Y direction (inches/second)"
            currentlyUsed={isThresholdUsed("velocityY", currentMetric)}
          />
          <ThresholdSlider
            label="Vel Z"
            value={thresholds.velocityZ}
            unit={METRIC_CONFIGS.velocityZ.unit}
            onChange={(v) => setThreshold("velocityZ", v)}
            max={maxVel}
            tooltip="Velocity threshold in Z direction (inches/second)"
            currentlyUsed={isThresholdUsed("velocityZ", currentMetric)}
          />
        </>
      )}

      {animationData.velocityRot && (
        <>
          <ThresholdSlider
            label="RVel"
            value={thresholds.rotationVelocityMag}
            unit={METRIC_CONFIGS.rotationVelocityMag.unit}
            onChange={(v) => setThreshold("rotationVelocityMag", v)}
            max={maxRotVel}
            tooltip="Angular velocity magnitude threshold (radians/second)"
            currentlyUsed={isThresholdUsed("rotationVelocityMag", currentMetric)}
          />
          <ThresholdSlider
            label="RVel X"
            value={thresholds.rotationVelocityX}
            unit={METRIC_CONFIGS.rotationVelocityX.unit}
            onChange={(v) => setThreshold("rotationVelocityX", v)}
            max={maxRotVel}
            tooltip="Angular velocity threshold about X axis (radians/second)"
            currentlyUsed={isThresholdUsed("rotationVelocityX", currentMetric)}
          />
          <ThresholdSlider
            label="RVel Y"
            value={thresholds.rotationVelocityY}
            unit={METRIC_CONFIGS.rotationVelocityY.unit}
            onChange={(v) => setThreshold("rotationVelocityY", v)}
            max={maxRotVel}
            tooltip="Angular velocity threshold about Y axis (radians/second)"
            currentlyUsed={isThresholdUsed("rotationVelocityY", currentMetric)}
          />
          <ThresholdSlider
            label="RVel Z"
            value={thresholds.rotationVelocityZ}
            unit={METRIC_CONFIGS.rotationVelocityZ.unit}
            onChange={(v) => setThreshold("rotationVelocityZ", v)}
            max={maxRotVel}
            tooltip="Angular velocity threshold about Z axis (radians/second)"
            currentlyUsed={isThresholdUsed("rotationVelocityZ", currentMetric)}
          />
        </>
      )}

      {animationData.accelerationLin && (
        <>
          <ThresholdSlider
            label="Acc"
            value={thresholds.accelerationMag}
            unit={METRIC_CONFIGS.accelerationMag.unit}
            onChange={(v) => setThreshold("accelerationMag", v)}
            max={maxAcc}
            tooltip="Acceleration magnitude threshold (inches/second²)"
            currentlyUsed={isThresholdUsed("accelerationMag", currentMetric)}
          />
          <ThresholdSlider
            label="Acc X"
            value={thresholds.accelerationX}
            unit={METRIC_CONFIGS.accelerationX.unit}
            onChange={(v) => setThreshold("accelerationX", v)}
            max={maxAcc}
            tooltip="Acceleration threshold in X direction (inches/second²)"
            currentlyUsed={isThresholdUsed("accelerationX", currentMetric)}
          />
          <ThresholdSlider
            label="Acc Y"
            value={thresholds.accelerationY}
            unit={METRIC_CONFIGS.accelerationY.unit}
            onChange={(v) => setThreshold("accelerationY", v)}
            max={maxAcc}
            tooltip="Acceleration threshold in Y direction (inches/second²)"
            currentlyUsed={isThresholdUsed("accelerationY", currentMetric)}
          />
          <ThresholdSlider
            label="Acc Z"
            value={thresholds.accelerationZ}
            unit={METRIC_CONFIGS.accelerationZ.unit}
            onChange={(v) => setThreshold("accelerationZ", v)}
            max={maxAcc}
            tooltip="Acceleration threshold in Z direction (inches/second²)"
            currentlyUsed={isThresholdUsed("accelerationZ", currentMetric)}
          />
        </>
      )}

      {animationData.accelerationRot && (
        <>
          <ThresholdSlider
            label="RAcc"
            value={thresholds.rotationAccelerationMag}
            unit={METRIC_CONFIGS.rotationAccelerationMag.unit}
            onChange={(v) => setThreshold("rotationAccelerationMag", v)}
            max={maxRotAcc}
            tooltip="Angular acceleration magnitude threshold (radians/second²)"
          />
          <ThresholdSlider
            label="RAcc X"
            value={thresholds.rotationAccelerationX}
            unit={METRIC_CONFIGS.rotationAccelerationX.unit}
            onChange={(v) => setThreshold("rotationAccelerationX", v)}
            max={maxRotAcc}
            tooltip="Angular acceleration threshold about X axis (radians/second²)"
          />
          <ThresholdSlider
            label="RAcc Y"
            value={thresholds.rotationAccelerationY}
            unit={METRIC_CONFIGS.rotationAccelerationY.unit}
            onChange={(v) => setThreshold("rotationAccelerationY", v)}
            max={maxRotAcc}
            tooltip="Angular acceleration threshold about Y axis (radians/second²)"
          />
          <ThresholdSlider
            label="RAcc Z"
            value={thresholds.rotationAccelerationZ}
            unit={METRIC_CONFIGS.rotationAccelerationZ.unit}
            onChange={(v) => setThreshold("rotationAccelerationZ", v)}
            max={maxRotAcc}
            tooltip="Angular acceleration threshold about Z axis (radians/second²)"
          />
        </>
      )}

      <ThresholdSlider
        label="ISD Peak"
        value={thresholds.interstoryDrift}
        unit={METRIC_CONFIGS.interstoryDrift.unit}
        onChange={(v) => setThreshold("interstoryDrift", v)}
        max={maxISD}
        tooltip="Peak interstory drift ratio threshold - floors exceeding this % will be highlighted"
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
