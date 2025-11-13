import { formatHex, interpolate } from "culori";
import { useState } from "react";
import { PlaybackControls, usePlaybackControl } from "../../components/PlaybackControls";
import { SmallTimeline } from "../../components/SmallTimeline";
import { useAnimationData } from "../../hooks/nodeDataHook";

const amber400 = "oklch(82.8% 0.189 84.429)";
const red700 = "oklch(50.5% 0.213 27.518)";
const colorMap = interpolate([amber400, red700], "oklab");

export function ViewHamburger() {
  const animationData = useAnimationData();

  const playback = usePlaybackControl();

  const [displacementScale, setDisplacementScale] = useState(1);
  const maxDisp = animationData.maxAverageStoryDisplacement;
  const frame = animationData.frames[playback.frameIndex];
  const stories = Array.from(animationData.frames[playback.frameIndex].stories.values());

  const totalDisplacementForFrame = stories.reduce((acc, story) => acc + Math.hypot(...story.averageDisplacement), 0);

  return (
    <div className="h-full flex flex-col gap-2">
      <div>
        <span>
          Frame: {playback.frameIndex + 1} / {animationData.frames.length} | Time: {animationData.timeSteps[playback.frameIndex]?.toFixed(1)}s | Avg Displacement: {Math.hypot(...frame.averageDisplacement)?.toFixed(2)}m
        </span>
        <br />
        <span>Color is the average displacement of the story scaled by maximum displacement. The size is a percentage of the total displacement for the frame.</span>
      </div>
      <div className="flex gap-2">
        <PlaybackControls playback={playback} />
        <div className="h-8 grow">
          <SmallTimeline frameIndex={playback.frameIndex} onFrameChange={playback.setFrameIndex} />
        </div>
        <label className="flex gap-2 whitespace-nowrap">
          <input type="range" min="20" max="2000" step={1} value={displacementScale} onChange={(e) => setDisplacementScale(parseFloat(e.target.value))} className="w-full" />
          Scale: {displacementScale.toFixed(0)}
        </label>
      </div>
      <div className="flex gap-1">
        {stories.map((story, i) => {
          const avgDisp = Math.hypot(...story.averageDisplacement);
          const color = formatHex(colorMap(avgDisp / maxDisp));
          return <div key={i} className="h-96 rounded" style={{ backgroundColor: color, width: `${(avgDisp / totalDisplacementForFrame) * 100}%` }} />;
        })}
      </div>
      <div className="flex flex-col h-full gap-1">
        {stories.map((story, i) => {
          const avgDisp = Math.hypot(...story.averageDisplacement);
          const color = formatHex(colorMap(avgDisp / maxDisp));
          return <div key={i} className="w-full rounded" style={{ backgroundColor: color, height: `${(avgDisp / totalDisplacementForFrame) * 100}%` }} />;
        })}
      </div>
    </div>
  );
}
