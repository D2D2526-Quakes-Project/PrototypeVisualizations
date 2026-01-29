import { converter, interpolate } from "culori";
import { useEffect, useRef, useState } from "react";
import { useAnimationData } from "../../hooks/nodeDataHook";
import { usePlayback } from "@/components/playback/PlaybackContext";

const amber400 = "oklch(82.8% 0.189 84.429)";
const red700 = "oklch(50.5% 0.213 27.518)";
const colorMap = interpolate([amber400, red700], "oklab");
const rgbConverter = converter("rgb");

export function InterstoryDriftChart() {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();

  const panelRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });

  useEffect(() => {
    if (!panelRef.current) return;
    const resizeObserver = new ResizeObserver((entries) =>
      setSize({ width: entries[0].contentRect.width, height: entries[0].contentRect.height }),
    );
    resizeObserver.observe(panelRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const { corners, stories, storyHeights, storyOrder } = animationData.metadata;

  const cornerSets = {
    NW: new Set(corners.NW),
    NE: new Set(corners.NE),
    SW: new Set(corners.SW),
    SE: new Set(corners.SE),
  };

  const cornerNodes = new Map<
    string,
    {
      NW: number;
      NE: number;
      SW: number;
      SE: number;
    }
  >();

  // story height, (story evelation - story below elevation)
  const storyElevations = new Map<string, number>();

  storyOrder.forEach((storyId, index) => {
    const nodeIndices = stories[storyId];

    const corners = {
      NW: nodeIndices.find((n) => cornerSets.NW.has(n))!,
      NE: nodeIndices.find((n) => cornerSets.NE.has(n))!,
      SW: nodeIndices.find((n) => cornerSets.SW.has(n))!,
      SE: nodeIndices.find((n) => cornerSets.SE.has(n))!,
    };
    cornerNodes.set(storyId, corners);

    if (index > 0) {
      let elevation = storyHeights[storyId];
      storyOrder.forEach((storyId2, index2) => {
        if (index2 < index) elevation += storyHeights[storyId2];
      });
      storyElevations.set(storyId, elevation);
    }
  });

  const storyDrift = new Map<
    string,
    {
      NW: (frame: number) => number;
      NE: (frame: number) => number;
      SW: (frame: number) => number;
      SE: (frame: number) => number;
    }
  >();

  for (let i = 1; i < storyOrder.length; i++) {
    const storyId = storyOrder[i];
    const belowId = storyOrder[i - 1];

    const height = storyElevations.get(storyId)!;
    const corners = cornerNodes.get(storyId)!;
    const belowCorners = cornerNodes.get(belowId)!;

    const makeStoryDriftAccessor = (height: number, nodeIdx: number, belowNodeIdx: number) => {
      return (frame: number) => {
        const frameData = animationData.displacement.at(frame);
        const current = frameData.at(nodeIdx);
        const below = frameData.at(belowNodeIdx);

        const driftMag = Math.hypot(current[0], current[1], current[2]);
        const belowDriftMag = Math.hypot(below[0], below[1], below[2]);

        return ((driftMag - belowDriftMag) / height) * 100;
      };
    };

    storyDrift.set(storyId, {
      NE: makeStoryDriftAccessor(height, corners.NE, belowCorners.NE),
      NW: makeStoryDriftAccessor(height, corners.NW, belowCorners.NW),
      SW: makeStoryDriftAccessor(height, corners.SW, belowCorners.SW),
      SE: makeStoryDriftAccessor(height, corners.SE, belowCorners.SE),
    });
  }

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

  const padding = { top: 20, right: 120, bottom: 30, left: 40 };
  const chartWidth = size.width - padding.left - padding.right;
  const chartHeight = size.height - padding.top - padding.bottom;

  const cornerColors = {
    NW: "#3b82f6", // blue
    NE: "#ef4444", // red
    SW: "#10b981", // green
    SE: "#f59e0b", // amber
  };

  return (
    <div ref={panelRef} className="h-full w-full relative">
      <div className="absolute top-0 inset-x-0">Story Drift Ratio</div>
      <svg width="100%" height="100%">
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Y Axis (Height) */}
          <line x1="0" y1="0" x2="0" y2={chartHeight} stroke="black" />
          {Array.from({ length: 5 }).map((_, i) => {
            const y = chartHeight - (i / 4) * chartHeight;
            const height = (i / 4) * maxHeight;
            return (
              <g key={i}>
                <line x1="-5" y1={y} x2="0" y2={y} stroke="black" />
                <text x="-8" y={y + 3} textAnchor="end" fontSize="10">
                  {height.toFixed(1)}in
                </text>
              </g>
            );
          })}

          {/* X Axis (Drift Ratio) */}
          <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="black" />
          {Array.from({ length: 5 }).map((_, i) => {
            const x = (i / 4) * chartWidth;
            const ratio = (i / 4) * maxRatio;
            return (
              <g key={i}>
                <line x1={x} y1={chartHeight} x2={x} y2={chartHeight + 5} stroke="black" />
                <text x={x} y={chartHeight + 15} textAnchor="middle" fontSize="10">
                  {ratio.toFixed(3)}
                </text>
              </g>
            );
          })}
          <text x={chartWidth / 2} y={size.height - padding.top} textAnchor="middle" fontSize="12">
            Drift Ratio (in/in)
          </text>

          {/* Bars for each story and corner */}
          {storyOrder.map((storyId, i) => {
            const drift = storyDrift.get(storyId);
            if (!drift) return null;

            const elevation = storyElevations.get(storyId) || 0;

            const barHeight = chartHeight / storyOrder.length - 2;
            const barY = chartHeight - (elevation / maxHeight) * chartHeight;
            const barSpacing = barHeight / 4;

            return (
              <g key={storyId}>
                {(["NW", "NE", "SW", "SE"] as const).map((corner, cornerIdx) => {
                  const ratio = drift[corner](frameIndex);
                  const barWidth = Math.max(0, (ratio / maxRatio) * chartWidth);
                  const color = cornerColors[corner];
                  const y = barY + cornerIdx * barSpacing;

                  return (
                    <rect
                      key={corner}
                      x="0"
                      y={y}
                      width={barWidth}
                      height={barSpacing - 1}
                      fill={color}
                      opacity={0.8}
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Legend */}
          <g transform={`translate(${chartWidth + 10}, 0)`}>
            <text x="0" y="0" fontSize="12" fontWeight="bold">
              Corners
            </text>
            {(["NW", "NE", "SW", "SE"] as const).map((corner, i) => (
              <g key={corner} transform={`translate(0, ${20 + i * 20})`}>
                <rect x="0" y="-8" width="12" height="12" fill={cornerColors[corner]} />
                <text x="18" y="3" fontSize="10">
                  {corner}
                </text>
              </g>
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
}
