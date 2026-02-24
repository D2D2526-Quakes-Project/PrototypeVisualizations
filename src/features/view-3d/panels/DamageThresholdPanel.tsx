import { formatHex, interpolate } from "culori";
import React, { useMemo } from "react";
import { usePlayback } from "@/features/playback/PlaybackContext";
import { useAnimationData } from "@/lib/useAnimationData";
import { useFloorVisibility, useThresholds } from "@/features/view-3d/contexts/visualization";
import { UnitTooltip } from "@/components/ui/unit-tooltip";

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
  const { visibleFloors, toggleFloor, showAllFloors, hideAllFloors } = useFloorVisibility();
  const { thresholds, setThreshold } = useThresholds();

  const { storyDrift, peakStoryDrift } = animationData.precomputed;
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

  return (
    <div className="h-full w-full p-4 flex flex-col gap-4 overflow-y-auto skinny-scrollbar">
      <div>
        <h2 className="text-xl font-bold">Damage Thresholds</h2>
        <p className="text-sm text-neutral-600">Set Story drift ratio limits to see potential damage states.</p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex flex-col">
          <span className="font-semibold">
            Warning Threshold:{" "}
            <UnitTooltip interactive={!playing} value={thresholds.interstoryDrift * 100} unit="%" decimals={3} />
          </span>
          <input
            type="range"
            min="0"
            max="0.05"
            step="0.001"
            value={thresholds.interstoryDrift}
            onChange={(e) => setThreshold("interstoryDrift", parseFloat(e.target.value))}
          />
        </label>
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold">Floor Visibility</h3>
          <button
            onClick={visibleFloors.size === storyOrder.length ? hideAllFloors : showAllFloors}
            className="text-xs px-2 py-1 bg-neutral-200 hover:bg-neutral-300 rounded">
            {visibleFloors.size === storyOrder.length ? "Hide All" : "Show All"}
          </button>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {reversedStories.map(({ storyId }) => (
            <label key={storyId} className="flex items-center gap-2 cursor-pointer hover:bg-neutral-100 p-1 rounded">
              <input
                type="checkbox"
                checked={visibleFloors.has(storyId)}
                onChange={() => toggleFloor(storyId)}
                className="cursor-pointer"
              />
              <span className="font-mono text-sm">{storyId}</span>
            </label>
          ))}
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
