import { formatHex, interpolate } from "culori";
import { useState } from "react";
import { PlaybackControls, usePlaybackControl } from "../../components/PlaybackControls";
import { SmallTimeline } from "../../components/SmallTimeline";
import { useAnimationData } from "../../hooks/nodeDataHook";

const amber400 = "oklch(82.8% 0.189 84.429)";
const red700 = "oklch(50.5% 0.213 27.518)";
const colorMap = interpolate([amber400, red700], "oklab");

export function ViewTexture() {
  const animationData = useAnimationData();
  const playback = usePlaybackControl();
  const [curveResolution, setCurveResolution] = useState(100);

  const maxDisp = animationData.maxAverageStoryDisplacement;
  const frame = animationData.frames[playback.frameIndex];
  const stories = Array.from(animationData.frames[playback.frameIndex].stories.values());

  return (
    <div className="h-full flex flex-col min-h-0 gap-2">
      <div>
        <span>
          Frame: {playback.frameIndex + 1} / {animationData.frames.length} | Time: {animationData.timeSteps[playback.frameIndex]?.toFixed(3)}s | Avg Displacement: {Math.hypot(...frame.averageDisplacement)?.toFixed(2)}m
        </span>
        <br />
        <span>Color is the average displacement of the story scaled by maximum displacement. The size is a percentage of the total displacement for the frame.</span>
      </div>
      <div className="flex gap-2 items-center">
        <PlaybackControls playback={playback} />
        <div className="h-8 grow">
          <SmallTimeline frameIndex={playback.frameIndex} onFrameChange={playback.setFrameIndex} />
        </div>
        <label className="flex gap-2 whitespace-nowrap">
          <input type="range" min="20" max="500" step={1} value={curveResolution} onChange={(e) => setCurveResolution(parseInt(e.target.value))} className="w-full" />
          Curve Resolution: {curveResolution}
        </label>
      </div>
      <div className="flex flex-col items-center h-full gap-1">
        {stories.map((story, i) => {
          const avgDisp = Math.hypot(...story.averageDisplacement);
          const color = formatHex(colorMap(avgDisp / maxDisp));

          const points = new Array(curveResolution)
            .fill(0)
            .map((_, i) => i / curveResolution)
            .map((p) => {
              const disp = avgDisp / maxDisp;
              const y = Math.sin((p - 50) * Math.PI * 2 * disp * 200);
              return `${p * 200},${y * 20}`;
            })
            .join(" ");

          return (
            <div key={i} className="w-xl h-full">
              <svg width="100%" height="100%" viewBox="0 -20 200 40" preserveAspectRatio="none" color={color}>
                <polyline points={points} strokeWidth="1" stroke="currentColor" fill="none" />
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
}
