import { useThresholds } from "@/features/view-3d/contexts/visualization";
import { METRIC_CONFIGS, type Metric } from "@/lib/metrics";
import type { BuildingAnimationData } from "@/lib/types";
import { AlertTriangle, Layers, RotateCcw, Sliders } from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";
import { useEffect, useState } from "react";
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
      <div className="mb-1 flex items-center justify-between gap-2">
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
  setFloorVisible: (storyId: string, visible: boolean) => void;
  showAllFloors: () => void;
  hideAllFloors: () => void;
  storyOrder: string[];
  storyHeights: Record<string, number>;
}

export function FloorsPanel({
  visibleFloors,
  setFloorVisible,
  showAllFloors,
  hideAllFloors,
  storyOrder,
  storyHeights,
}: FloorsPanelProps) {
  const [dragVisibility, setDragVisibility] = useState<boolean | null>(null);
  const noFloorsVisible = storyOrder.length > 0 && visibleFloors.size === 0;

  useEffect(() => {
    if (dragVisibility === null) return;
    const handleMouseUp = () => setDragVisibility(null);
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [dragVisibility]);

  const handleFloorMouseDown = (event: MouseEvent<HTMLButtonElement>, storyId: string) => {
    event.preventDefault();
    const nextVisible = !visibleFloors.has(storyId);
    setDragVisibility(nextVisible);
    setFloorVisible(storyId, nextVisible);
  };

  const handleFloorMouseEnter = (storyId: string) => {
    if (dragVisibility === null) return;
    setFloorVisible(storyId, dragVisibility);
  };

  const handleFloorKeyDown = (event: KeyboardEvent<HTMLButtonElement>, storyId: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setFloorVisible(storyId, !visibleFloors.has(storyId));
  };

  const orderedStories = [...storyOrder].reverse();

  const formatHeight = (heightIn: number) => {
    if (Number.isInteger(heightIn)) return `${heightIn} in`;
    return `${heightIn.toFixed(1)} in`;
  };

  return (
    <>
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Layers size={12} className="text-neutral-500" />
          <span className="text-xs font-medium text-neutral-700">Floors</span>
        </div>
        <div className="flex items-center gap-1">
          {noFloorsVisible && (
            <button
              type="button"
              onClick={showAllFloors}
              className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-1 py-0.5 text-[9px] font-medium text-amber-800 hover:bg-amber-100"
              title="All floors are hidden. Show all floors.">
              <AlertTriangle size={9} />
              None visible
            </button>
          )}
          <button
            onClick={showAllFloors}
            className="rounded border border-neutral-300 bg-neutral-100 px-1 py-0.5 text-[10px] hover:bg-neutral-200">
            All
          </button>
          <button
            onClick={hideAllFloors}
            className="rounded border border-neutral-300 bg-neutral-100 px-1 py-0.5 text-[10px] hover:bg-neutral-200">
            None
          </button>
        </div>
      </div>
      <div className="pr-1">
        {orderedStories.map((storyId) => {
          const isVisible = visibleFloors.has(storyId);
          return (
            <div
              key={storyId}
              className="mb-1 grid items-center gap-x-2"
              style={{ gridTemplateColumns: "minmax(0, 1fr) auto auto auto" }}>
              <div
                className={`truncate text-[10px] font-medium ${isVisible ? "text-neutral-800" : "text-neutral-500"}`}>
                {storyId}
              </div>

              <div className={`text-[9px] whitespace-nowrap ${isVisible ? "text-neutral-600" : "text-neutral-400"}`}>
                {formatHeight(storyHeights[storyId] ?? 0)}
              </div>

              <div
                className={`w-7 text-[9px] whitespace-nowrap ${isVisible ? "text-neutral-600" : "text-neutral-400"}`}>
                {isVisible ? "Visible" : "Hidden"}
              </div>

              <button
                type="button"
                aria-pressed={isVisible}
                aria-label={`${isVisible ? "Hide" : "Show"} floor ${storyId}`}
                onMouseDown={(event) => handleFloorMouseDown(event, storyId)}
                onMouseEnter={() => handleFloorMouseEnter(storyId)}
                onKeyDown={(event) => handleFloorKeyDown(event, storyId)}
                className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-medium transition-colors select-none ${
                  isVisible
                    ? "border-blue-300 bg-blue-100 text-blue-700"
                    : "border-neutral-300 bg-neutral-100 text-neutral-500"
                }`}>
                {isVisible ? "On" : "Off"}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
