/**
 * PeakResponseTimePanel Component
 * =============================================================================
 * 
 * PURPOSE:
 * Shows when each story and corner reaches its peak interstory drift,
 * helping engineers understand the timing and location of maximum response.
 * 
 * WHAT IT SHOWS:
 * - Story ID and elevation
 * - Peak drift value for each corner (NW, NE, SW, SE)
 * - Frame and time when peak occurred
 * - Color-coded corner indicators matching the building visualization
 * 
 * DATA SOURCES:
 * - Story drift: animationData.precomputed.storyDrift
 * - Peak drift: animationData.precomputed.peakStoryDrift
 * - Story heights: animationData.metadata.storyHeights
 * 
 * UNITS:
 * - Drift: percentage
 * - Elevation: feet
 * - Time: seconds
 * 
 * IMPORTANCE:
 * Identifies critical moments in the earthquake response when different
 * parts of the building experience their maximum drift. This helps
 * engineers understand the propagation of damage through the structure.
 * =============================================================================
 */

import { useAnimationData } from "@/hooks/nodeDataHook";
import { useMemo } from "react";
import { formatHex, interpolate } from "culori";

const blue900 = formatHex("oklch(37.9% 0.146 265.522)")!;
const blue400 = formatHex("oklch(70.7% 0.165 254.624)")!;
const white = formatHex("#fff")!;
const red400 = formatHex("oklch(70.4% 0.191 22.216)")!;
const red900 = formatHex("oklch(39.6% 0.141 25.723)")!;
const colorMap = interpolate(
  [
    [blue900, -1],
    [blue400, -0.5],
    [white, 0],
    [red400, 0.5],
    [red900, 1],
  ],
  "oklab",
);

const cornerColors = {
  NW: { bg: "#dbeafe", text: "#1e40af" },
  NE: { bg: "#fee2e2", text: "#991b1b" },
  SW: { bg: "#dcfce7", text: "#166534" },
  SE: { bg: "#fef3c7", text: "#92400e" },
};

export function PeakResponseTimePanel() {
  const { animationData } = useAnimationData();

  const peakData = useMemo(() => {
    const { storyOrder, storyHeights, frameCount, dt } = animationData.metadata;
    const { storyDrift } = animationData.precomputed;
    const storyOrderWithoutGround = storyOrder.slice(1);

    const data: Array<{
      story: string;
      elevation: number;
      corners: {
        NW: { drift: number; frame: number; time: number };
        NE: { drift: number; frame: number; time: number };
        SW: { drift: number; frame: number; time: number };
        SE: { drift: number; frame: number; time: number };
      };
    }> = [];

    storyOrderWithoutGround.forEach((storyId, storyIdx) => {
      const corners = { NW: { drift: 0, frame: 0, time: 0 }, NE: { drift: 0, frame: 0, time: 0 }, SW: { drift: 0, frame: 0, time: 0 }, SE: { drift: 0, frame: 0, time: 0 } };
      const cornerNames = ["NW", "NE", "SW", "SE"] as const;

      for (let frame = 0; frame < frameCount; frame++) {
        const drifts = storyDrift.getStoryDrift(storyIdx + 1, frame);
        drifts.forEach((d, i) => {
          const corner = cornerNames[i];
          if (d > corners[corner].drift) {
            corners[corner] = {
              drift: d,
              frame,
              time: frame * dt,
            };
          }
        });
      }

      const heightIn = storyHeights[storyId] || 0;
      data.push({
        story: storyId,
        elevation: heightIn / 12,
        corners,
      });
    });

    return data;
  }, [animationData]);

  const maxDriftOverall = useMemo(() => {
    return Math.max(...Object.values(animationData.precomputed.peakStoryDrift).flatMap((s) => Object.values(s)));
  }, [animationData.precomputed.peakStoryDrift]);

  return (
    <div className="h-full w-full flex flex-col bg-white">
      <div className="px-3 py-1.5 border-b border-neutral-100 bg-white z-20 shrink-0">
        <div className="text-sm text-neutral-700">
          <span className="font-medium">Peak Response Time</span>
          <span className="text-neutral-400 ml-2">- When each corner reaches max drift</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="text-xs text-neutral-500 grid grid-cols-[auto_1fr] gap-x-2 p-2 border-b border-neutral-200 bg-neutral-50 sticky top-0">
          <span>Story</span>
          <div className="grid grid-cols-4 gap-1 text-center">
            <span className="text-blue-600">NW</span>
            <span className="text-red-600">NE</span>
            <span className="text-green-600">SW</span>
            <span className="text-amber-600">SE</span>
          </div>
        </div>
        {peakData.map((row) => (
          <div key={row.story} className="grid grid-cols-[auto_1fr] gap-x-2 p-2 border-b border-neutral-100 hover:bg-neutral-50">
            <div className="flex flex-col">
              <span className="font-medium text-sm">{row.story}</span>
              <span className="text-xs text-neutral-400">{row.elevation.toFixed(0)} ft</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {(["NW", "NE", "SW", "SE"] as const).map((corner) => {
                const data = row.corners[corner];
                const ratio = data.drift / maxDriftOverall;
                return (
                  <div
                    key={corner}
                    className="flex flex-col items-center p-1 rounded text-[10px]"
                    style={{ background: cornerColors[corner].bg }}>
                    <div
                      className="w-4 h-4 rounded-full border border-black/10"
                      style={{ background: formatHex(colorMap(ratio)) }}
                      title={`Drift: ${data.drift.toFixed(4)}%`}
                    />
                    <span className="font-mono font-medium" style={{ color: cornerColors[corner].text }}>
                      {data.drift.toFixed(3)}%
                    </span>
                    <span className="text-neutral-500">
                      {data.time.toFixed(2)}s
                    </span>
                    <span className="text-neutral-400">
                      F{data.frame + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
