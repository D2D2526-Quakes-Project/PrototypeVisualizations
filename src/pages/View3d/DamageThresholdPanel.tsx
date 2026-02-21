import { formatHex, interpolate } from "culori";
import React, { useMemo } from "react";
import { usePlayback } from "@/components/playback/PlaybackContext";
import { useAnimationData } from "@/hooks/nodeDataHook";
import { useFloorVisibility, useThresholds } from "@/contexts/visualization";
import { METRIC_CONFIGS } from "@/lib/metrics";

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

export function DamageThresholdPanel() {
  const { animationData } = useAnimationData();
  const { storyOrder } = animationData.metadata;
  const { frameIndex } = usePlayback();
  const { visibleFloors, toggleFloor, showAllFloors, hideAllFloors } = useFloorVisibility();
  const { thresholds, setThreshold } = useThresholds();

  const { storyDrift, peakStoryDrift } = animationData.precomputed;

  const storyThresholdFrame = useMemo(() => {
    const storyThresholds = new Map();

    for (let i = 0; i < storyDrift.storyCount; i++) {
      const storyId = storyOrder[i];
      const time = {
        NW: null as number | null,
        NE: null as number | null,
        SW: null as number | null,
        SE: null as number | null,
      };

      for (let f = 0; f < storyDrift.frameCount; f++) {
        const story = storyDrift.getStoryDrift(i, f);
        const nw = story[0];
        const ne = story[1];
        const sw = story[2];
        const se = story[3];

        if (nw > thresholds.interstoryDrift && time.NW === null) {
          time.NW = f;
        }
        if (ne > thresholds.interstoryDrift && time.NE === null) {
          time.NE = f;
        }
        if (sw > thresholds.interstoryDrift && time.SW === null) {
          time.SW = f;
        }
        if (se > thresholds.interstoryDrift && time.SE === null) {
          time.SE = f;
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
            Warning Threshold ({thresholds.interstoryDrift.toFixed(3)} {METRIC_CONFIGS.interstoryDrift.unit})
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
          {storyOrder.toReversed().map((storyId) => (
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

        {storyOrder.toReversed().map((storyId, i) => {
          if (!visibleFloors.has(storyId)) return null;
          const corners = storyDrift.getStoryDrift(storyOrder.length - i - 1, frameIndex);
          const peaks = peakStoryDrift[storyId];
          const thresholds = storyThresholdFrame.get(storyId);

          if (!corners || !peaks || !thresholds) return null;

          return (
            <React.Fragment key={storyId}>
              <div className="font-mono text-sm">{storyId}</div>
              <div className="w-full text-xs text-neutral-600 grid grid-cols-[auto_1fr_auto_auto_auto] items-center p-2 gap-2">
                {(["NE", "NW", "SW", "SE"] as const).map((corner, ci) => {
                  const thresholdFrame = thresholds[corner];
                  const peak = peaks[corner];
                  const current = corners[ci];

                  return (
                    <React.Fragment key={corner}>
                      <div
                        className="h-4 aspect-square rotate-45"
                        style={{
                          background: formatHex(colorMap(current / (peak || 0.0001))),
                        }}
                      />
                      <div className="font-mono">{corner}</div>
                      <span className="w-12 font-mono text-right shrink-0">{current.toFixed(4)}</span>
                      <span className="w-12 font-mono text-right shrink-0">{(peak || 0).toFixed(4)}</span>
                      <div
                        className={`w-14 font-mono text-center p-1 rounded ${thresholdFrame !== null ? "bg-yellow-200" : ""}`}>
                        {thresholdFrame !== null ? (thresholdFrame * animationData.metadata.dt).toFixed(2) : "-"}
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
