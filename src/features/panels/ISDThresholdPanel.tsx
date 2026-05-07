import { UnitTooltip } from "@/components/ui/unit-tooltip";
import { usePlayback } from "@/features/playback/PlaybackContext";
import { useFloorVisibility, useThresholds } from "@/features/3d/contexts/visualization";
import { getMetricsForThreshold, getThresholdConfig, METRIC_CONFIGS } from "@/lib/metrics";
import { useAnimationData } from "@/lib/useAnimationData";
import { formatHex, interpolate } from "culori";
import { useMemo } from "react";
import { ColorScaleBar } from "../components/CanvasWithControls/ColorScaleBar";
import { ThresholdSlider } from "../components/CanvasWithControls/ThresholdSlider";

const blue900 = formatHex("oklch(37.9% 0.146 265.522)")!;
const blue600 = formatHex("oklch(54.6% 0.245 262.881)")!;
const blue400 = formatHex("oklch(70.7% 0.165 254.624)")!;
const white = formatHex("#fff")!;
const red400 = formatHex("oklch(70.4% 0.191 22.216)")!;
const red600 = formatHex("oklch(57.7% 0.245 27.325)")!;
const red900 = formatHex("oklch(39.6% 0.141 25.723)")!;
const colorMap = interpolate(
  [
    [blue900, -1],
    [blue600, -0.51],
    [blue400, -0.5],
    [white, 0],
    [red400, 0.5],
    [red600, 0.51],
    [red900, 1],
  ],
  "oklab"
);

const DISPLAY_CORNERS = ["NE", "NW", "SW", "SE"] as const;

type CornerName = "NW" | "NE" | "SW" | "SE";
type ThresholdCrossingFrames = Record<CornerName, number | null>;
const SUMMARY_GRID_CLASS =
  "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)] items-center";

function ThresholdStatusPill({ currentExceeded, everExceeded }: { currentExceeded: boolean; everExceeded: boolean }) {
  if (currentExceeded) {
    return (
      <span className="border border-red-300 bg-red-100 px-1.5 py-0.5 text-[10px] text-red-900">Exceeding Now</span>
    );
  }
  if (everExceeded) {
    return (
      <span className="border border-yellow-300 bg-yellow-100 px-1.5 py-0.5 text-[10px] text-yellow-900">
        Crossed Earlier
      </span>
    );
  }
  return (
    <span className="border border-neutral-300 bg-neutral-50 px-1.5 py-0.5 text-[10px] text-neutral-600">
      Not Crossed
    </span>
  );
}

export function ISDThresholdPanel() {
  const { animationData } = useAnimationData();
  const { storyDrift } = animationData;
  const { storyOrder, dt, cornerNodes, frameCount } = animationData.metadata;
  const { frameIndex } = usePlayback();
  const { visibleFloors } = useFloorVisibility();
  const { thresholds, setThreshold } = useThresholds();
  const threshold = thresholds.interstoryDrift;

  const isdConfig = getThresholdConfig("interstoryDrift");
  const isdMetrics = getMetricsForThreshold("interstoryDrift");
  const { peakStoryDrift } = animationData.precomputed;
  const maxDriftThreshold = Math.max(isdConfig.getPrecomputedMax(animationData), thresholds["interstoryDrift"] || 0, 1);
  const reversedStories = useMemo(
    () => storyOrder.map((storyId, storyIndex) => ({ storyId, storyIndex })).toReversed(),
    [storyOrder]
  );

  const storyThresholdFrame = useMemo(() => {
    const storyThresholds = new Map<string, ThresholdCrossingFrames>();

    for (let frame = 0; frame < frameCount; frame++) {
      for (const storyId in cornerNodes) {
        const corners = cornerNodes[storyId];
        const time: ThresholdCrossingFrames = storyThresholds.get(storyId) ?? {
          NW: null as number | null,
          NE: null as number | null,
          SW: null as number | null,
          SE: null as number | null,
        };

        const nw = storyDrift.get(frame, corners.NW);
        const ne = storyDrift.get(frame, corners.NE);
        const sw = storyDrift.get(frame, corners.SW);
        const se = storyDrift.get(frame, corners.SE);

        if (nw > threshold && time.NW === null) time.NW = frame;
        if (ne > threshold && time.NE === null) time.NE = frame;
        if (sw > threshold && time.SW === null) time.SW = frame;
        if (se > threshold && time.SE === null) time.SE = frame;
      }
    }

    return storyThresholds;
  }, [cornerNodes, frameCount, storyDrift, threshold]);

  // const visibleDamageSummary = useMemo(() => {
  //   let currentExceededCorners = 0;
  //   let everExceededCorners = 0;
  //   let visibleStoryCount = 0;

  //   for (const storyId in cornerNodes) {
  //     if (!visibleFloors.has(storyId)) continue;
  //     visibleStoryCount += 1;
  //     const corners = cornerNodes[storyId];

  //     const thresholdFrames = storyThresholdFrame.get(storyId);

  //     if (thresholdFrames) {
  //       if (thresholdFrames.NW !== null) everExceededCorners += 1;
  //       if (thresholdFrames.NE !== null) everExceededCorners += 1;
  //       if (thresholdFrames.SW !== null) everExceededCorners += 1;
  //       if (thresholdFrames.SE !== null) everExceededCorners += 1;
  //     }

  //     const nw = storyDrift.get(frameIndex, corners.NW);
  //     const ne = storyDrift.get(frameIndex, corners.NE);
  //     const sw = storyDrift.get(frameIndex, corners.SW);
  //     const se = storyDrift.get(frameIndex, corners.SE);
  //     if (nw > thresholds.interstoryDrift) currentExceededCorners += 1;
  //     if (ne > thresholds.interstoryDrift) currentExceededCorners += 1;
  //     if (sw > thresholds.interstoryDrift) currentExceededCorners += 1;
  //     if (se > thresholds.interstoryDrift) currentExceededCorners += 1;
  //   }

  //   return { currentExceededCorners, everExceededCorners, visibleStoryCount };
  // }, [frameIndex, storyThresholdFrame, thresholds.interstoryDrift, visibleFloors, cornerNodes, storyDrift]);

  // const visibleCornerCapacity = Math.max(visibleDamageSummary.visibleStoryCount * DISPLAY_CORNERS.length, 0);
  // const currentExceededPct =
  //   visibleCornerCapacity > 0 ? (visibleDamageSummary.currentExceededCorners / visibleCornerCapacity) * 100 : 0;
  // const everExceededPct =
  //   visibleCornerCapacity > 0 ? (visibleDamageSummary.everExceededCorners / visibleCornerCapacity) * 100 : 0;

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-y-auto p-4">
      <div className="flex flex-col gap-2">
        <div className="py-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">ISD Threshold</span>
          </div>
          <ThresholdSlider
            label={isdConfig.label}
            unit={isdConfig.unit}
            max={maxDriftThreshold}
            tooltip={`Shared threshold for ${isdMetrics.map((metric) => METRIC_CONFIGS[metric].label).join(", ")}`}
            value={thresholds["interstoryDrift"]}
            onChange={(value) => setThreshold("interstoryDrift", value)}
            currentlyUsed></ThresholdSlider>
        </div>

        <div>
          <ColorScaleBar currentMetric={"interstoryDrift"} thresholdHighlighting={true} />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-600">
          <span className="whitespace-nowrap">
            Current Exceeded:{" "}
            <span className="font-mono text-neutral-800">
              {/* {visibleDamageSummary.currentExceededCorners.toLocaleString()} */}
            </span>{" "}
            {/* <span className="text-neutral-500">({currentExceededPct.toFixed(1)}%)</span> */}
          </span>
          <span className="text-neutral-300">•</span>
          <span className="whitespace-nowrap">
            Ever Crossed:{" "}
            <span className="font-mono text-neutral-800">
              {/* {visibleDamageSummary.everExceededCorners.toLocaleString()} */}
            </span>{" "}
            {/* <span className="text-neutral-500">({everExceededPct.toFixed(1)}%)</span> */}
          </span>
        </div>
      </div>

      <div>
        <div
          className={`mt-2 divide-x divide-neutral-300 rounded border border-neutral-300 bg-neutral-50 text-[11px] text-neutral-600 ${SUMMARY_GRID_CLASS}`}>
          <span className="min-w-0 px-2 py-1 font-semibold">Corner</span>
          <span className="min-w-0 px-2 py-1 text-right font-semibold">Current (%)</span>
          <span className="min-w-0 px-2 py-1 text-right font-semibold">Peak (%)</span>
          <span className="min-w-0 px-2 py-1 text-center font-semibold">Status</span>
          <span
            className="min-w-0 px-2 py-1 text-center leading-tight font-semibold"
            title="First crossing time in seconds">
            First Cross (s)
          </span>
        </div>

        <div className="mt-2 space-y-2">
          {reversedStories.map(({ storyId }) => {
            if (!visibleFloors.has(storyId)) return null;
            const thresholdFrames = storyThresholdFrame.get(storyId);

            if (!thresholdFrames) return null;

            let storyCurrentExceeded = 0;
            let storyEverExceeded = 0;
            let corner: "NW" | "NE" | "SW" | "SE";
            for (corner in cornerNodes[storyId]) {
              const current = storyDrift.get(frameIndex, cornerNodes[storyId][corner]);
              if (current > thresholds.interstoryDrift) storyCurrentExceeded += 1;
              if (thresholdFrames[corner] !== null) storyEverExceeded += 1;
            }

            return (
              <section key={storyId} className="overflow-hidden rounded border border-neutral-300 bg-white">
                <div className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50 px-2 py-1.5">
                  <div className="font-mono text-sm font-semibold text-neutral-900">{storyId}</div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] leading-tight text-neutral-600">
                    <span>Current Exceeded</span>
                    <span className="font-mono text-neutral-800">{storyCurrentExceeded}/4</span>
                    <span className="text-neutral-300">•</span>
                    <span>Ever Crossed</span>
                    <span className="font-mono text-neutral-700">{storyEverExceeded}/4</span>
                  </div>
                </div>

                <div className="w-full px-2 py-1 text-xs text-neutral-700">
                  {DISPLAY_CORNERS.map((corner) => {
                    const thresholdFrame = thresholdFrames[corner];
                    const peak = peakStoryDrift[cornerNodes[storyId][corner]];
                    const current = storyDrift.get(frameIndex, cornerNodes[storyId][corner]);
                    const peakSafe = Math.max(Math.abs(peak || 0), 1e-12);
                    const ratio = Math.max(-1, Math.min(1, current / peakSafe));
                    const currentExceeded = current > thresholds.interstoryDrift;

                    return (
                      <div
                        key={corner}
                        className={`${SUMMARY_GRID_CLASS} divide-x divide-neutral-200 ${corner === DISPLAY_CORNERS.at(-1) ? "" : "border-b border-neutral-100"}`}>
                        <div className="flex min-w-0 items-center gap-2 px-2 py-1 font-mono">
                          <div
                            className="h-4 w-4 shrink-0 rotate-45 border border-neutral-300"
                            style={{
                              background: formatHex(colorMap(ratio)) ?? "#ffffff",
                            }}
                          />
                          <span>{corner}</span>
                        </div>
                        <span className="min-w-0 px-2 py-1 text-right font-mono whitespace-nowrap">
                          <UnitTooltip value={current} unit="%" />
                        </span>
                        <span className="min-w-0 px-2 py-1 text-right font-mono whitespace-nowrap">
                          <UnitTooltip value={peak || 0} unit="%" />
                        </span>
                        <div className="flex min-w-0 justify-center px-2 py-1">
                          <ThresholdStatusPill
                            currentExceeded={currentExceeded}
                            everExceeded={thresholdFrame !== null}
                          />
                        </div>
                        <div className="min-w-0 px-2 py-1 text-center font-mono">
                          {thresholdFrame !== null ? (
                            <span className="inline-flex min-w-0 items-center justify-center px-1.5 py-0.5">
                              <UnitTooltip value={thresholdFrame * dt} unit="s" showConversions={false} />
                            </span>
                          ) : (
                            <span className="inline-flex min-w-0 items-center justify-center px-1.5 py-0.5 text-neutral-500">
                              -
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
