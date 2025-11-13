import { converter, interpolate } from "culori";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAnimationData } from "../../hooks/nodeDataHook";

const amber400 = "oklch(82.8% 0.189 84.429)";
const red700 = "oklch(50.5% 0.213 27.518)";
const colorMap = interpolate([amber400, red700], "oklab");
const rgbConverter = converter("rgb");

export function InterstoryDriftChart({ frameIndex }: { frameIndex: number }) {
  const animationData = useAnimationData();
  const panelRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });
  useEffect(() => {
    if (!panelRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => setSize({ width: entries[0].contentRect.width, height: entries[0].contentRect.height }));
    resizeObserver.observe(panelRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const frame = animationData.frames[frameIndex];
  const stories = Array.from(frame.stories.values()).sort((a, b) => {
    const yA = frame.nodePositions.get(a.nodeIds[0])![1];
    const yB = frame.nodePositions.get(b.nodeIds[0])![1];
    return yA - yB;
  });
  const initialFrame = animationData.frames[0];

  const drifts = useMemo(() => {
    return stories.map((story, i) => {
      const storyHeight = frame.nodePositions.get(story.nodeIds[0])![1] - animationData.minPos[1];
      const displacement = Math.hypot(...story.averageDisplacement);

      if (i === 0) {
        return { ratio: 0, height: storyHeight };
      } else {
        const prevStory = stories[i - 1];
        const prevHeight = frame.nodePositions.get(prevStory.nodeIds[0])![1];
        const prevDisp = Math.hypot(...prevStory.averageDisplacement);
        const drift = Math.abs(displacement - prevDisp);
        const interStoryHeight = Math.abs(storyHeight - prevHeight);
        return { ratio: drift / interStoryHeight, height: storyHeight };
      }
    });
  }, [frame, stories, initialFrame]);

  const maxRatio = Math.max(...drifts.map((d) => d.ratio), 0.002);
  const maxHeight = Math.max(...drifts.map((d) => d.height));

  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = size.width - padding.left - padding.right;
  const chartHeight = size.height - padding.top - padding.bottom;

  return (
    <div ref={panelRef} className="h-full w-full relative">
      <div className="absolute top-0 inset-x-0">Inter-story Drift Ratio</div>
      <svg width="100%" height="100%">
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          <line x1="0" y1="0" x2="0" y2={chartHeight} stroke="black" />
          {Array.from({ length: 5 }).map((_, i) => {
            const y = chartHeight - (i / 4) * chartHeight;
            const height = (i / 4) * maxHeight;
            return (
              <g key={i}>
                <line x1="-5" y1={y} x2="0" y2={y} stroke="black" />
                <text x="-8" y={y + 3} textAnchor="end" fontSize="10">
                  {height.toFixed(1)}m
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
            Drift Ratio (m/m)
          </text>

          {drifts.map((drift, i) => {
            const barY = chartHeight - (drift.height / maxHeight) * chartHeight;
            const barWidth = (drift.ratio / maxRatio) * chartWidth;
            const color = rgbConverter(colorMap(drift.ratio / maxRatio));
            return <rect key={i} x="0" y={barY} width={barWidth} height={chartHeight / drifts.length - 2} fill={`rgb(${color.r * 255},${color.g * 255},${color.b * 255})`} />;
          })}
        </g>
      </svg>
    </div>
  );
}
