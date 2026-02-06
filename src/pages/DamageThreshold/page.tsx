import { CanvasWithControls } from "@/components/CanvasWithControls";
import { usePlayback } from "@/components/playback/PlaybackContext";
import { PlaybackControls } from "@/components/playback/PlaybackControls";
import { converter, formatHex, interpolate } from "culori";
import React, { useMemo, useState } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../../components/resizable";
import { SmallTimeline } from "../../components/SmallTimeline";
import { useAnimationData } from "../../hooks/nodeDataHook";
import { ThresholdBuilding } from "./ThresholdBuilding";
import { useStoryDriftData } from "./useStoryDriftData";

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
const rgbConverter = converter("rgb");

export function ViewDamageThreshold() {
  const { animationData } = useAnimationData();
  const { storyOrder } = animationData.metadata;

  const { frameIndex } = usePlayback();

  const [warningThreshold, setWarningThreshold] = useState(0.01);

  const { storyDrift, peakStoryDrift, storyElevations } = useStoryDriftData();

  const storyThresholdFrame = useMemo(() => {
    const storyThresholdTime = new Map<
      string,
      {
        NW: number | null;
        NE: number | null;
        SW: number | null;
        SE: number | null;
      }
    >(storyOrder.map((id) => [id, { NW: null, NE: null, SW: null, SE: null }]));

    for (const [storyId, corners] of storyDrift) {
      const time = storyThresholdTime.get(storyId)!;

      for (let i = 0; i < animationData.metadata.frameCount; i++) {
        const cornerNE = corners.NE(i);
        const cornerNW = corners.NW(i);
        const cornerSW = corners.SW(i);
        const cornerSE = corners.SE(i);

        if (cornerNE > warningThreshold && !time.NE) time.NE = i;
        if (cornerNW > warningThreshold && !time.NW) time.NW = i;
        if (cornerSW > warningThreshold && !time.SW) time.SW = i;
        if (cornerSE > warningThreshold && !time.SE) time.SE = i;

        if (time.NE && time.NW && time.SW && time.SE) break;
      }
      storyThresholdTime.set(storyId, time);
    }
    return storyThresholdTime;
  }, [animationData, storyDrift, warningThreshold]);

  // This is the max for the current frame.
  const maxRatio = Math.max(
    ...Array.from(storyDrift.values()).flatMap((d) => [
      d.NW(frameIndex),
      d.NE(frameIndex),
      d.SW(frameIndex),
      d.SE(frameIndex),
    ]),
    0.000001,
  );

  const maxHeight = storyElevations.get(storyOrder.at(-1) ?? "0") || 0;

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
                <span className="font-semibold">Warning Threshold ({warningThreshold.toFixed(3)})</span>
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

              {/* Rows */}
              {storyOrder.toReversed().map((storyId) => (
                <React.Fragment key={storyId}>
                  <div className="font-mono text-sm">{storyId}</div>
                  <div className="w-full text-xs text-neutral-600 grid grid-cols-[auto_1fr_auto_auto_auto] items-center p-2 gap-2">
                    {(["NE", "NW", "SW", "SW"] as const).map((corner) => {
                      if (!peakStoryDrift.has(storyId)) return;
                      if (!storyThresholdFrame.has(storyId)) return;
                      if (!storyDrift.has(storyId)) return;
                      const thresholdFrame = storyThresholdFrame.get(storyId)![corner];
                      const peak = peakStoryDrift.get(storyId)![corner];
                      const current = storyDrift.get(storyId)![corner](frameIndex);
                      return (
                        <>
                          <div
                            className={`h-4 aspect-square rotate-45 ${
                              current > warningThreshold ? "bg-amber-400" : "bg-green-500"
                            }`}
                            style={{
                              background: formatHex(colorMap(current / peak)),
                            }}
                          />
                          <div className="font-mono">{corner}</div>

                          <span className="w-12 font-mono text-right shrink-0">{current.toFixed(4)}</span>
                          <span className="w-12 font-mono text-right shrink-0">{peak.toFixed(4)}</span>
                          <div
                            className={`w-14 font-mono text-center p-1 rounded ${thresholdFrame ? "bg-yellow-200" : ""}`}>
                            {thresholdFrame ? (thresholdFrame * animationData.metadata.dt).toFixed(2) : "-"}
                          </div>
                        </>
                      );
                    })}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={70} className="min-h-0 flex h-full">
          <div className="relative w-full">
            <CanvasWithControls>
              <ThresholdBuilding warningThreshold={warningThreshold} />
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
