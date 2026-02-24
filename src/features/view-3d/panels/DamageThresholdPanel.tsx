import { formatHex, interpolate } from "culori";
import React, { useMemo } from "react";
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

export function DamageThresholdPanel() {
  const { animationData } = useAnimationData();
  const { storyOrder, dt } = animationData.metadata;
  const { frameIndex, playing } = usePlayback();
  const { visibleFloors, setFloorVisible, showAllFloors, hideAllFloors } = useFloorVisibility();
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

  const visibleStoryRange = useMemo<[number, number]>(() => {
    const visibleIndices = storyOrder
      .map((storyId, storyIndex) => (visibleFloors.has(storyId) ? storyIndex : -1))
      .filter((storyIndex) => storyIndex >= 0);

    if (visibleIndices.length === 0) {
      return [0, Math.max(storyOrder.length - 1, 0)];
    }

    return [visibleIndices[0], visibleIndices[visibleIndices.length - 1]];
  }, [storyOrder, visibleFloors]);

  const hasNonContiguousVisibility = useMemo(() => {
    const [startIndex, endIndex] = visibleStoryRange;
    for (let storyIndex = startIndex; storyIndex <= endIndex; storyIndex++) {
      if (!visibleFloors.has(storyOrder[storyIndex])) {
        return true;
      }
    }
    return false;
  }, [storyOrder, visibleFloors, visibleStoryRange]);

  const visibleDamageSummary = useMemo(() => {
    let currentExceededCorners = 0;
    let everExceededCorners = 0;
    let visibleStoryCount = 0;
    const storyStride = storyDrift.frameCount * storyDrift.cornerCount;

    for (let storyIndex = 0; storyIndex < storyOrder.length; storyIndex++) {
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

  const applyVisibleStoryRange = (range: number[]) => {
    const [rawStart, rawEnd] = range;
    const start = Math.max(0, Math.min(Math.round(rawStart ?? 0), storyOrder.length - 1));
    const end = Math.max(start, Math.min(Math.round(rawEnd ?? start), storyOrder.length - 1));

    storyOrder.forEach((storyId, storyIndex) => {
      const inRange = storyIndex >= start && storyIndex <= end;
      setFloorVisible(storyId, inRange);
    });
  };

  return (
    <div className="h-full w-full p-4 flex flex-col gap-4 overflow-y-auto skinny-scrollbar">
      <div>
        <h2 className="text-xl font-bold">Damage Thresholds</h2>
        <p className="text-sm text-neutral-600">Set Story drift ratio limits to see potential damage states.</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-3">
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
          <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-500">
            <span>0%</span>
            <span>
              Max panel range: <UnitTooltip interactive={!playing} value={maxDriftThreshold} unit="%" decimals={2} />
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {[0.2, 0.5, 1.0].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setThreshold("interstoryDrift", preset)}
                className={`rounded border px-2 py-1 text-xs transition-colors ${
                  Math.abs(thresholds.interstoryDrift - preset) < 0.001
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-neutral-300 bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                }`}>
                {preset.toFixed(1)}%
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded border border-neutral-200 bg-neutral-50 p-2">
            <div className="text-neutral-500">Visible Floors</div>
            <div className="font-mono text-sm text-neutral-800">{visibleDamageSummary.visibleStoryCount}</div>
          </div>
          <div className="rounded border border-neutral-200 bg-neutral-50 p-2">
            <div className="text-neutral-500">Current Exceedances</div>
            <div className="font-mono text-sm text-neutral-800">{visibleDamageSummary.currentExceededCorners}</div>
          </div>
          <div className="rounded border border-neutral-200 bg-neutral-50 p-2">
            <div className="text-neutral-500">Ever Exceeded</div>
            <div className="font-mono text-sm text-neutral-800">{visibleDamageSummary.everExceededCorners}</div>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold">Floor Visibility</h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={showAllFloors}
              className="rounded border border-neutral-300 bg-neutral-100 px-2 py-1 text-xs hover:bg-neutral-200">
              Show All
            </button>
            <button
              type="button"
              onClick={hideAllFloors}
              className="rounded border border-neutral-300 bg-neutral-100 px-2 py-1 text-xs hover:bg-neutral-200">
              Hide All
            </button>
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2 text-xs text-neutral-600">
            <span>Visible floor band (contiguous)</span>
            <span className="font-mono">
              {storyOrder[visibleStoryRange[0]]} - {storyOrder[visibleStoryRange[1]]}
            </span>
          </div>
          <Slider
            value={visibleStoryRange}
            min={0}
            max={Math.max(storyOrder.length - 1, 0)}
            step={1}
            onValueChange={applyVisibleStoryRange}
            className="mt-3"
            aria-label="Visible floor range"
          />
          <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-500">
            <span>{storyOrder[0]}</span>
            <span>{storyOrder.at(-1)}</span>
          </div>
          {hasNonContiguousVisibility && (
            <p className="mt-2 text-xs text-amber-700">
              Current floor visibility contains gaps from other controls. Moving the slider will normalize it to one band.
            </p>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold mt-4">Story Damage Summary</h3>
        <div className="w-full text-xs text-neutral-600 grid grid-cols-[auto_1fr_auto_auto_auto] p-2 gap-1">
          <span className="whitespace-nowrap">Corner</span>
          <span className="whitespace-nowrap text-center">Current Drift</span>
          <span className="whitespace-nowrap text-center">Peak Drift</span>
          <span className="whitespace-nowrap text-center" title="Time in seconds the corner crossed warning threshold">
            Warning (s)
          </span>
        </div>

        {reversedStories.map(({ storyId, storyIndex }) => {
          if (!visibleFloors.has(storyId)) return null;
          const frameBase = storyIndex * storyDrift.frameCount * storyDrift.cornerCount + frameIndex * storyDrift.cornerCount;
          const driftData = storyDrift.data;
          const peaks = peakStoryDrift[storyId];
          const thresholdFrames = storyThresholdFrame.get(storyId);

          if (!peaks || !thresholdFrames) return null;

          return (
            <React.Fragment key={storyId}>
              <div className="font-mono text-sm">{storyId}</div>
              <div className="w-full text-xs text-neutral-600 grid grid-cols-[auto_1fr_auto_auto_auto] items-center p-2 gap-2">
                {DISPLAY_CORNERS.map((corner) => {
                  const thresholdFrame = thresholdFrames[corner];
                  const peak = peaks[corner];
                  const current = driftData[frameBase + CORNER_DATA_INDEX[corner]];

                  return (
                    <React.Fragment key={corner}>
                      <div
                        className="h-4 aspect-square rotate-45"
                        style={{
                          background: formatHex(colorMap(current / (peak || 0.0001))),
                        }}
                      />
                      <div className="font-mono">{corner}</div>
                      <span className="w-12 font-mono text-right shrink-0">
                        <UnitTooltip interactive={!playing} value={current} unit="%" decimals={4} />
                      </span>
                      <span className="w-12 font-mono text-right shrink-0">
                        <UnitTooltip interactive={!playing} value={peak || 0} unit="%" decimals={4} />
                      </span>
                      <div
                        className={`w-14 font-mono text-center p-1 rounded ${thresholdFrame !== null ? "bg-yellow-200" : ""}`}>
                        {thresholdFrame !== null ? (
                          <UnitTooltip
                            interactive={!playing}
                            value={thresholdFrame * dt}
                            unit="s"
                            decimals={2}
                            showConversions={false}
                          />
                        ) : (
                          "-"
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
