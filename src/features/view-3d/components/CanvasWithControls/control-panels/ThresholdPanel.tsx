import { useColor, useFloorVisibility, useThresholds } from "@/features/view-3d/contexts/visualization";
import {
  getMetricsForThreshold,
  getThresholdConfig,
  getThresholdKey,
  METRIC_CONFIGS,
  THRESHOLD_KEY_ORDER,
  type Metric,
  type ThresholdKey,
} from "@/lib/metrics";
import { useAnimationData } from "@/lib/useAnimationData";
import { AlertTriangle, Layers, RotateCcw, Sliders } from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { ThresholdSlider } from "../ThresholdSlider";

function isThresholdUsed(thresholdKey: ThresholdKey, currentMetric: Metric): boolean {
  return getThresholdKey(currentMetric) === thresholdKey;
}

export function ThresholdPanel() {
  const { animationData } = useAnimationData();
  const { currentMetric } = useColor();
  const { thresholds, setThreshold, resetThresholds } = useThresholds();
  const thresholdRows = useMemo(
    () =>
      THRESHOLD_KEY_ORDER.filter((thresholdKey) => getThresholdConfig(thresholdKey).isAvailable(animationData)).map(
        (thresholdKey) => {
          const config = getThresholdConfig(thresholdKey);
          const metrics = getMetricsForThreshold(thresholdKey);
          return {
            key: thresholdKey,
            label: config.label,
            unit: config.unit,
            max: Math.max(config.getPrecomputedMax(animationData), thresholds[thresholdKey] || 0, 0),
            tooltip: `Shared threshold for ${metrics.map((metric) => METRIC_CONFIGS[metric].label).join(", ")}`,
          };
        }
      ),
    [animationData, thresholds]
  );

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
      {thresholdRows.map((row) => (
        <ThresholdSlider
          key={row.key}
          label={row.label}
          value={thresholds[row.key]}
          unit={row.unit}
          onChange={(value) => setThreshold(row.key, value)}
          max={row.max}
          tooltip={row.tooltip}
          currentlyUsed={isThresholdUsed(row.key, currentMetric)}
        />
      ))}
    </div>
  );
}

export function FloorsPanel() {
  const { animationData } = useAnimationData();

  const storyOrder = animationData.metadata.storyOrder;
  const storyHeights = animationData.metadata.storyHeights;

  const { visibleFloors, setFloorVisible, showAllDefaultFloors, showAllFloors, hideAllFloors } = useFloorVisibility();
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
              onClick={showAllDefaultFloors}
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
