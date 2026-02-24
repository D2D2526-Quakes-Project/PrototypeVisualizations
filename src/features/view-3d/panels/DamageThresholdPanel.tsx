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

  return (
    <div className="h-full w-full p-4 flex flex-col gap-4 overflow-y-auto skinny-scrollbar">
      <div>
        <h2 className="text-xl font-bold">Damage Thresholds</h2>
        <p className="text-sm text-neutral-600">Set Story drift ratio limits to see potential damage states.</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="rounded-lg bg-white p-3">
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
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded border border-neutral-300 bg-neutral-50 p-2">
            <div className="text-neutral-500">Current Exceedances</div>
            <div className="font-mono text-sm text-neutral-800">{visibleDamageSummary.currentExceededCorners}</div>
          </div>
          <div className="rounded border border-neutral-300 bg-neutral-50 p-2">
            <div className="text-neutral-500">Ever Exceeded</div>
            <div className="font-mono text-sm text-neutral-800">{visibleDamageSummary.everExceededCorners}</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold mt-4">Story Damage Summary</h3>
        <div className="w-full rounded-t-md border border-b-0 border-neutral-300 bg-neutral-100 text-xs text-neutral-700 grid grid-cols-4 p-2 gap-2">
          <span className="whitespace-nowrap font-semibold">Corner</span>
          <span className="whitespace-nowrap text-center font-semibold">Current Drift</span>
          <span className="whitespace-nowrap text-center font-semibold">Peak Drift</span>
          <span
            className="whitespace-nowrap text-center font-semibold"
            title="Time in seconds the corner crossed warning threshold">
            Warning (s)
          </span>
        </div>

        <div className="rounded-b-md border border-neutral-300 divide-y divide-neutral-300 bg-white">
          {reversedStories.map(({ storyId, storyIndex }) => {
            if (!visibleFloors.has(storyId)) return null;
            const frameBase =
              storyIndex * storyDrift.frameCount * storyDrift.cornerCount + frameIndex * storyDrift.cornerCount;
            const driftData = storyDrift.data;
            const peaks = peakStoryDrift[storyId];
            const thresholdFrames = storyThresholdFrame.get(storyId);

            if (!peaks || !thresholdFrames) return null;

            return (
              <div key={storyId} className="">
                <div className="bg-neutral-50 px-2 py-1 font-mono text-sm font-semibold">{storyId}</div>
                <div className="w-full text-xs text-neutral-700 grid grid-cols-4 divide-x divide-neutral-300 items-center *:px-2 p-2 gap-y-1">
                  {DISPLAY_CORNERS.map((corner) => {
                    const thresholdFrame = thresholdFrames[corner];
                    const peak = peaks[corner];
                    const current = driftData[frameBase + CORNER_DATA_INDEX[corner]];

                    return (
                      <React.Fragment key={corner}>
                        <div className="flex items-center gap-2 font-mono">
                          <div
                            className="h-4 w-4 shrink-0 rotate-45 border border-neutral-300"
                            style={{
                              background: formatHex(colorMap(current / (peak || 0.0001))),
                            }}
                          />
                          <span>{corner}</span>
                        </div>
                        <span className="font-mono text-right">
                          <UnitTooltip interactive={!playing} value={current} unit="%" decimals={4} />
                        </span>
                        <span className="font-mono text-right">
                          <UnitTooltip interactive={!playing} value={peak || 0} unit="%" decimals={4} />
                        </span>
                        <div className="border-0">
                          <div
                            className={`font-mono text-center p-1 rounded border ${
                              thresholdFrame !== null
                                ? "border-yellow-300 bg-yellow-100"
                                : "border-neutral-200 bg-neutral-50"
                            }`}>
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
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
