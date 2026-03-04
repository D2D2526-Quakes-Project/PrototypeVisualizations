import { formatHex, interpolate } from "culori";
import { useMemo } from "react";
import { usePlayback } from "@/features/playback/PlaybackContext";
import { useAnimationData } from "@/lib/useAnimationData";
import { useFloorVisibility, useThresholds } from "@/features/view-3d/contexts/visualization";
import { UnitTooltip } from "@/components/ui/unit-tooltip";
import { Slider } from "@/components/ui/slider";

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
  "oklab",
);

const DISPLAY_CORNERS = ["NE", "NW", "SW", "SE"] as const;
const CORNER_DATA_INDEX: Record<CornerName, number> = {
  NW: 0,
  NE: 1,
  SW: 2,
  SE: 3,
};

type CornerName = "NW" | "NE" | "SW" | "SE";
type ThresholdCrossingFrames = Record<CornerName, number | null>;
const SUMMARY_GRID_CLASS =
  "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)] items-center";
const DAMAGE_RATIO_LEGEND_GRADIENT = `linear-gradient(90deg, ${blue900} 0%, ${blue600} 24.5%, ${blue400} 25%, ${white} 50%, ${red400} 75%, ${red600} 75.5%, ${red900} 100%)`;

function ThresholdStatusPill({
  currentExceeded,
  everExceeded,
}: {
  currentExceeded: boolean;
  everExceeded: boolean;
}) {
  if (currentExceeded) {
    return (
      <span className="rounded border border-red-300 bg-red-100 px-1.5 py-0.5 text-[10px] text-red-900">
        Exceeding Now
      </span>
    );
  }
  if (everExceeded) {
    return (
      <span className="rounded border border-yellow-300 bg-yellow-100 px-1.5 py-0.5 text-[10px] text-yellow-900">
        Crossed Earlier
      </span>
    );
  }
  return (
    <span className="rounded border border-neutral-300 bg-neutral-50 px-1.5 py-0.5 text-[10px] text-neutral-600">
      Not Crossed
    </span>
  );
}

export function DamageThresholdPanel() {
  const { animationData } = useAnimationData();
  const { storyOrder, dt } = animationData.metadata;
  const { frameIndex, playing } = usePlayback();
  const { visibleFloors } = useFloorVisibility();
  const { thresholds, setThreshold } = useThresholds();

  const { storyDrift, peakStoryDrift } = animationData.precomputed;
  const maxDriftThreshold = Math.max(
    1,
    Math.ceil(((animationData.precomputed.maxStoryDrift ?? thresholds.interstoryDrift ?? 0.5) * 1.2) / 0.05) * 0.05,
  );
  const reversedStories = useMemo(
    () => storyOrder.map((storyId, storyIndex) => ({ storyId, storyIndex })).toReversed(),
    [storyOrder],
  );

  const storyThresholdFrame = useMemo(() => {
    const storyThresholds = new Map<string, ThresholdCrossingFrames>();
    const { data, frameCount, cornerCount, storyCount } = storyDrift;
    const storyStride = frameCount * cornerCount;
    const threshold = thresholds.interstoryDrift;

    // Skip ground story (index 0): parser only computes interstory drift for stories above ground.
    for (let storyIndex = 1; storyIndex < storyCount; storyIndex++) {
      const storyId = storyOrder[storyIndex];
      const time: ThresholdCrossingFrames = {
        NW: null as number | null,
        NE: null as number | null,
        SW: null as number | null,
        SE: null as number | null,
      };
      const storyBase = storyIndex * storyStride;

      for (let frame = 0; frame < frameCount; frame++) {
        const frameBase = storyBase + frame * cornerCount;
        const nw = data[frameBase];
        const ne = data[frameBase + 1];
        const sw = data[frameBase + 2];
        const se = data[frameBase + 3];

        if (nw > threshold && time.NW === null) {
          time.NW = frame;
        }
        if (ne > threshold && time.NE === null) {
          time.NE = frame;
        }
        if (sw > threshold && time.SW === null) {
          time.SW = frame;
        }
        if (se > threshold && time.SE === null) {
          time.SE = frame;
        }
        if (time.NW !== null && time.NE !== null && time.SW !== null && time.SE !== null) {
          break;
        }
      }

      storyThresholds.set(storyId, time);
    }

    return storyThresholds;
  }, [storyDrift, thresholds.interstoryDrift, storyOrder]);

  const visibleDamageSummary = useMemo(() => {
    let currentExceededCorners = 0;
    let everExceededCorners = 0;
    let visibleStoryCount = 0;
    const storyStride = storyDrift.frameCount * storyDrift.cornerCount;

    for (let storyIndex = 1; storyIndex < storyOrder.length; storyIndex++) {
      const storyId = storyOrder[storyIndex];
      if (!visibleFloors.has(storyId)) continue;
      visibleStoryCount += 1;

      const thresholdFrames = storyThresholdFrame.get(storyId);
      if (thresholdFrames) {
        if (thresholdFrames.NW !== null) everExceededCorners += 1;
        if (thresholdFrames.NE !== null) everExceededCorners += 1;
        if (thresholdFrames.SW !== null) everExceededCorners += 1;
        if (thresholdFrames.SE !== null) everExceededCorners += 1;
      }

      const frameBase = storyIndex * storyStride + frameIndex * storyDrift.cornerCount;
      for (let cornerIndex = 0; cornerIndex < storyDrift.cornerCount; cornerIndex++) {
        if (storyDrift.data[frameBase + cornerIndex] > thresholds.interstoryDrift) {
          currentExceededCorners += 1;
        }
      }
    }

    return { currentExceededCorners, everExceededCorners, visibleStoryCount };
  }, [frameIndex, storyDrift, storyOrder, storyThresholdFrame, thresholds.interstoryDrift, visibleFloors]);

  const visibleCornerCapacity = Math.max(visibleDamageSummary.visibleStoryCount * DISPLAY_CORNERS.length, 0);
  const currentExceededPct =
    visibleCornerCapacity > 0 ? (visibleDamageSummary.currentExceededCorners / visibleCornerCapacity) * 100 : 0;
  const everExceededPct =
    visibleCornerCapacity > 0 ? (visibleDamageSummary.everExceededCorners / visibleCornerCapacity) * 100 : 0;

  return (
    <div className="h-full w-full p-4 flex flex-col gap-4 overflow-y-auto skinny-scrollbar">
      <div>
        <h2 className="text-xl font-bold">ISD Thresholds</h2>
        <p className="text-sm text-neutral-600">Set Story drift ratio limits to see potential damage states.</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="py-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">Warning Threshold</span>
            <span className="font-mono text-sm">
              <UnitTooltip interactive={!playing} value={thresholds.interstoryDrift} unit="%" decimals={3} />
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-600">
            Floors and corners are flagged when interstory drift exceeds this percent threshold.
          </p>
          <Slider
            value={[thresholds.interstoryDrift]}
            min={0}
            max={maxDriftThreshold}
            step={0.01}
            onValueChange={(values) => setThreshold("interstoryDrift", values[0] ?? thresholds.interstoryDrift)}
            className="mt-3"
            aria-label="Interstory drift warning threshold percent"
          />
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-neutral-500">
            <span>0%</span>
            <span className="text-right">
              Max panel range: <UnitTooltip interactive={!playing} value={maxDriftThreshold} unit="%" decimals={2} />
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-600">
          <span className="whitespace-nowrap">
            Visible Stories:{" "}
            <span className="font-mono text-neutral-800">{visibleDamageSummary.visibleStoryCount.toLocaleString()}</span>
          </span>
          <span className="text-neutral-300">•</span>
          <span className="whitespace-nowrap">
            Corners: <span className="font-mono text-neutral-800">{visibleCornerCapacity.toLocaleString()}</span>
          </span>
          <span className="text-neutral-300">•</span>
          <span className="whitespace-nowrap">
            Current Exceeded:{" "}
            <span className="font-mono text-neutral-800">
              {visibleDamageSummary.currentExceededCorners.toLocaleString()}
            </span>{" "}
            <span className="text-neutral-500">({currentExceededPct.toFixed(1)}%)</span>
          </span>
          <span className="text-neutral-300">•</span>
          <span className="whitespace-nowrap">
            Ever Crossed:{" "}
            <span className="font-mono text-neutral-800">{visibleDamageSummary.everExceededCorners.toLocaleString()}</span>{" "}
            <span className="text-neutral-500">({everExceededPct.toFixed(1)}%)</span>
          </span>
        </div>

        <div className="pt-0.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-600">
            <span className="whitespace-nowrap">
              Warning Threshold: <span className="font-mono text-neutral-800">{thresholds.interstoryDrift.toFixed(3)}%</span>
            </span>
            <span className="text-neutral-300">•</span>
            <span className="whitespace-nowrap">Corner Color = Current Drift / Peak Drift (ratio)</span>
            <span className="text-neutral-300">•</span>
            <span className="whitespace-nowrap">Status pills indicate threshold crossing state</span>
          </div>
          <div
            className="mt-1.5 h-2 rounded-sm border border-neutral-200"
            style={{ background: DAMAGE_RATIO_LEGEND_GRADIENT }}
            title="Corner tile color is normalized by current drift divided by peak drift for that corner"
          />
          <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-neutral-500">
            <span>-1.0</span>
            <span>-0.5</span>
            <span>0.0</span>
            <span>+0.5</span>
            <span>+1.0</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold mt-4">Story ISD Summary</h3>
        <div
          className={`mt-2 rounded border border-neutral-300 bg-neutral-50 text-[11px] text-neutral-600 divide-x divide-neutral-300 ${SUMMARY_GRID_CLASS}`}>
          <span className="font-semibold px-2 py-1 min-w-0">Corner</span>
          <span className="text-right font-semibold px-2 py-1 min-w-0">Current (%)</span>
          <span className="text-right font-semibold px-2 py-1 min-w-0">Peak (%)</span>
          <span className="text-center font-semibold px-2 py-1 min-w-0">Status</span>
          <span className="text-center font-semibold px-2 py-1 min-w-0 leading-tight" title="First crossing time in seconds">
            First Cross (s)
          </span>
        </div>

        <div className="mt-2 space-y-2">
          {reversedStories.map(({ storyId, storyIndex }) => {
            if (!visibleFloors.has(storyId)) return null;
            const frameBase =
              storyIndex * storyDrift.frameCount * storyDrift.cornerCount + frameIndex * storyDrift.cornerCount;
            const driftData = storyDrift.data;
            const peaks = peakStoryDrift[storyId];
            const thresholdFrames = storyThresholdFrame.get(storyId);

            if (!peaks || !thresholdFrames) return null;

            let storyCurrentExceeded = 0;
            let storyEverExceeded = 0;
            for (const corner of DISPLAY_CORNERS) {
              const current = driftData[frameBase + CORNER_DATA_INDEX[corner]];
              if (current > thresholds.interstoryDrift) storyCurrentExceeded += 1;
              if (thresholdFrames[corner] !== null) storyEverExceeded += 1;
            }

            return (
              <section key={storyId} className="rounded border border-neutral-300 bg-white overflow-hidden">
                <div className="flex items-center justify-between gap-3 bg-neutral-50 px-2 py-1.5 border-b border-neutral-200">
                  <div className="font-mono text-sm font-semibold text-neutral-900">{storyId}</div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] leading-tight text-neutral-600">
                    <span>Current Exceeded</span>
                    <span className="font-mono text-neutral-800">{storyCurrentExceeded}/4</span>
                    <span className="text-neutral-300">•</span>
                    <span>Ever Crossed</span>
                    <span className="font-mono text-neutral-700">{storyEverExceeded}/4</span>
                  </div>
                </div>

                <div className="w-full text-xs text-neutral-700 px-2 py-1">
                  {DISPLAY_CORNERS.map((corner) => {
                    const thresholdFrame = thresholdFrames[corner];
                    const peak = peaks[corner];
                    const current = driftData[frameBase + CORNER_DATA_INDEX[corner]];
                    const peakSafe = Math.max(Math.abs(peak || 0), 1e-12);
                    const ratio = Math.max(-1, Math.min(1, current / peakSafe));
                    const currentExceeded = current > thresholds.interstoryDrift;

                    return (
                      <div
                        key={corner}
                        className={`${SUMMARY_GRID_CLASS} divide-x divide-neutral-200 ${corner === DISPLAY_CORNERS.at(-1) ? "" : "border-b border-neutral-100"}`}>
                        <div className="flex items-center gap-2 font-mono min-w-0 px-2 py-1">
                          <div
                            className="h-4 w-4 shrink-0 rotate-45 border border-neutral-300"
                            style={{
                              background: formatHex(colorMap(ratio)) ?? "#ffffff",
                            }}
                          />
                          <span>{corner}</span>
                        </div>
                        <span className="font-mono text-right whitespace-nowrap px-2 py-1 min-w-0">
                          <UnitTooltip interactive={!playing} value={current} unit="%" decimals={4} />
                        </span>
                        <span className="font-mono text-right whitespace-nowrap px-2 py-1 min-w-0">
                          <UnitTooltip interactive={!playing} value={peak || 0} unit="%" decimals={4} />
                        </span>
                        <div className="flex justify-center px-2 py-1 min-w-0">
                          <ThresholdStatusPill currentExceeded={currentExceeded} everExceeded={thresholdFrame !== null} />
                        </div>
                        <div className="font-mono text-center px-2 py-1 min-w-0">
                          {thresholdFrame !== null ? (
                            <span className="inline-flex items-center justify-center rounded border border-yellow-300 bg-yellow-100 px-1.5 py-0.5 min-w-0">
                              <UnitTooltip
                                interactive={!playing}
                                value={thresholdFrame * dt}
                                unit="s"
                                decimals={2}
                                showConversions={false}
                              />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center rounded border border-neutral-300 bg-white px-1.5 py-0.5 min-w-0 text-neutral-500">
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
