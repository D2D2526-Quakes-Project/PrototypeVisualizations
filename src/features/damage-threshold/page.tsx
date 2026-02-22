import { CanvasWithControls } from "@/features/view-3d/components/CanvasWithControls";
import { usePlayback } from "@/features/playback/PlaybackContext";
import { PlaybackControls } from "@/features/playback/PlaybackControls";
import { SmallTimeline } from "@/features/playback/SmallTimeline";
import { UnitTooltip } from "@/components/ui/unit-tooltip";
import { useAnimationData } from "@/lib/useAnimationData";
import { formatHex, interpolate } from "culori";
import React, { useMemo, useState } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/resizable";
import { ThresholdBuilding } from "./ThresholdBuilding";

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

export function ViewDamageThreshold() {
  const { animationData } = useAnimationData();
  const { storyOrder } = animationData.metadata;

  const { frameIndex } = usePlayback();

  const [warningThreshold, setWarningThreshold] = useState(0.01);
  const [visibleFloors, setVisibleFloors] = useState<Set<string>>(() => new Set(storyOrder));

  const { storyDrift, peakStoryDrift } = animationData.precomputed;

  const toggleFloor = (storyId: string) => {
    setVisibleFloors((prev) => {
      const next = new Set(prev);
      if (next.has(storyId)) {
        next.delete(storyId);
      } else {
        next.add(storyId);
      }
      return next;
    });
  };

  const toggleAllFloors = () => {
    if (visibleFloors.size === storyOrder.length) {
      setVisibleFloors(new Set());
    } else {
      setVisibleFloors(new Set(storyOrder));
    }
  };

  const storyThresholdFrame = useMemo(() => {
    const thresholds = new Map();

    for (let i = 0; i < storyDrift.storyCount; i++) {
      const storyId = storyOrder[i];
      const time = {
        NW: 0,
        NE: 0,
        SW: 0,
        SE: 0,
      };

      for (let f = 0; f < storyDrift.frameCount; f++) {
        const story = storyDrift.getStoryDrift(i, f);
        const nw = story[0];
        const ne = story[1];
        const sw = story[2];
        const se = story[3];

        if (nw > warningThreshold && !time.NW) {
          time.NW = i;
        }
        if (ne > warningThreshold && !time.NE) {
          time.NE = i;
        }
        if (sw > warningThreshold && !time.SW) {
          time.SW = i;
        }
        if (se > warningThreshold && !time.SE) {
          time.SE = i;
        }
        if (time.NW !== 0 && time.NE !== 0 && time.SW !== 0 && time.SE !== 0) {
          break;
        }
      }

      thresholds.set(storyId, time);
    }

    return thresholds;
  }, [storyDrift, warningThreshold, storyOrder]);

  // This is the max for the current frame.
  // const maxRatioPerFrame = useMemo(() => {
  //   const frameCount = animationData.metadata.frameCount;
  //   const maxRatios = new Float32Array(frameCount);

  //   for (let frame = 0; frame < frameCount; frame++) {
  //     let max = 0.000001;
  //     for (let s = 0; s < storyDrift.storyCount; s++) {
  //       const corners = storyDrift.getStoryDrift(s, frame);
  //       max = Math.max(max, corners[0], corners[1], corners[2], corners[3]);
  //     }
  //     maxRatios[frame] = max;
  //   }

  //   return maxRatios;
  // }, [storyDrift, animationData.metadata.frameCount]);

  // const maxRatio = maxRatioPerFrame[frameIndex];
  // const maxHeight = storyElevations[storyOrder.at(-1) ?? "0"] || 0;

  return (
    <div className="flex h-full min-h-0">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={30} minSize={5} maxSize={40} className="flex">
          <div className="w-full p-4 flex flex-col gap-4 overflow-y-auto skinny-scrollbar border-r-2 border-neutral-300">
            <div>
              <h2 className="text-xl font-bold">Damage Thresholds</h2>
              <p className="text-sm text-neutral-600">Set Story drift ratio limits to see potential damage states.</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex flex-col">
                <span className="font-semibold">
                  Warning Threshold: <UnitTooltip value={warningThreshold * 100} unit="%" decimals={3} />
                </span>
                <input
                  type="range"
                  min="0"
                  max="0.05"
                  step="0.001"
                  value={warningThreshold}
                  onChange={(e) => setWarningThreshold(parseFloat(e.target.value))}
                />
              </label>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold">Floor Visibility</h3>
                <button
                  onClick={toggleAllFloors}
                  className="text-xs px-2 py-1 bg-neutral-200 hover:bg-neutral-300 rounded">
                  {visibleFloors.size === storyOrder.length ? "Hide All" : "Show All"}
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {storyOrder.toReversed().map((storyId) => (
                  <label
                    key={storyId}
                    className="flex items-center gap-2 cursor-pointer hover:bg-neutral-100 p-1 rounded">
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
                <span
                  className="whitespace-nowrap text-center"
                  title="Time in seconds the corner crossed warning threshold">
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
                                background: formatHex(colorMap(current / peak)),
                              }}
                            />
                            <div className="font-mono">{corner}</div>
                            <span className="w-12 font-mono text-right shrink-0">
                              <UnitTooltip value={current} unit="%" decimals={4} />
                            </span>
                            <span className="w-12 font-mono text-right shrink-0">
                              <UnitTooltip value={peak} unit="%" decimals={4} />
                            </span>
                            <div
                              className={`w-14 font-mono text-center p-1 rounded ${thresholdFrame !== null ? "bg-yellow-200" : ""}`}>
                              {thresholdFrame !== null ? (
                                <UnitTooltip
                                  value={thresholdFrame * animationData.metadata.dt}
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
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={70} className="min-h-0 flex h-full">
          <div className="relative w-full">
            <CanvasWithControls>
              <ThresholdBuilding
                warningThreshold={warningThreshold}
                visibleFloors={visibleFloors}
                onToggleFloor={toggleFloor}
              />
            </CanvasWithControls>

            <div className="absolute bottom-2 inset-x-2 bg-white/80 backdrop-blur-sm rounded p-2 flex items-center gap-4 h-16">
              <PlaybackControls />
              <SmallTimeline />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
