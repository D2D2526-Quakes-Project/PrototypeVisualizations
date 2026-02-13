import { formatHex, interpolate } from "culori";
import { useMemo, useState } from "react";
import { usePlayback } from "@/components/playback/PlaybackContext";
import { useAnimationData } from "@/hooks/nodeDataHook";
import { SmallTimeline } from "@/components/SmallTimeline";

const amber400 = "oklch(82.8% 0.189 84.429)";
const red700 = "oklch(50.5% 0.213 27.518)";
const colorMap = interpolate([amber400, red700], "oklab");

export function ViewHamburger() {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();

  const [displacementScale, setDisplacementScale] = useState(1);
  
  const { stories, storyOrder } = animationData.metadata;
  const frameCount = animationData.metadata.frameCount;
  const dt = animationData.metadata.dt;
  const maxDisplacement = animationData.precomputed.maxDisplacement;

  // Calculate story data for current frame
  const storyData = useMemo(() => {
    return storyOrder.map((storyId) => {
      const nodeIndices = stories[storyId];
      let totalDx = 0;
      let totalDy = 0;
      let totalDz = 0;

      for (const nodeIdx of nodeIndices) {
        const displacement = animationData.displacement.atFrame(frameIndex).at(nodeIdx);
        totalDx += displacement[0];
        totalDy += displacement[1];
        totalDz += displacement[2];
      }

      const count = nodeIndices.length;
      const avgDisp = [totalDx / count, totalDy / count, totalDz / count];
      const avgDispMag = Math.hypot(...avgDisp);

      return {
        storyId,
        avgDisp,
        avgDispMag,
      };
    });
  }, [stories, storyOrder, animationData, frameIndex]);

  // Calculate total displacement for frame
  const totalDisplacementForFrame = storyData.reduce(
    (acc, story) => acc + story.avgDispMag,
    0
  );

  // Calculate building average displacement
  const avgBuildingDisplacement = useMemo(() => {
    let totalDx = 0;
    let totalDy = 0;
    let totalDz = 0;
    const nodeCount = animationData.metadata.nodeCount;
    
    for (let i = 0; i < nodeCount; i++) {
      const displacement = animationData.displacement.atFrame(frameIndex).at(i);
      totalDx += displacement[0];
      totalDy += displacement[1];
      totalDz += displacement[2];
    }
    
    return [
      totalDx / nodeCount,
      totalDy / nodeCount,
      totalDz / nodeCount,
    ];
  }, [animationData, frameIndex]);

  return (
    <div className="h-full flex flex-col gap-2">
      <div>
        <span>
          Frame: {frameIndex + 1} / {frameCount} | Time: {(frameIndex * dt).toFixed(1)}s | Avg Displacement: {Math.hypot(...avgBuildingDisplacement)?.toFixed(2)}in
        </span>
        <br />
        <span>Color is the average displacement of the story scaled by maximum displacement. The size is a percentage of the total displacement for the frame.</span>
      </div>
      <div className="flex gap-2">
        <label className="flex gap-2 whitespace-nowrap">
          <input type="range" min="20" max="2000" step={1} value={displacementScale} onChange={(e) => setDisplacementScale(parseFloat(e.target.value))} className="w-full" />
          Scale: {displacementScale.toFixed(0)}
        </label>
      </div>
      <div className="h-8 shrink-0">
        <SmallTimeline />
      </div>
      <div className="flex gap-1">
        {storyData.map((story, i) => {
          const color = formatHex(colorMap(story.avgDispMag / maxDisplacement));
          const widthPercent = totalDisplacementForFrame > 0 
            ? (story.avgDispMag / totalDisplacementForFrame) * 100 
            : 0;
          return <div key={i} className="h-96 rounded" style={{ backgroundColor: color, width: `${widthPercent}%` }} />;
        })}
      </div>
      <div className="flex flex-col h-full gap-1">
        {storyData.map((story, i) => {
          const color = formatHex(colorMap(story.avgDispMag / maxDisplacement));
          const heightPercent = totalDisplacementForFrame > 0 
            ? (story.avgDispMag / totalDisplacementForFrame) * 100 
            : 0;
          return <div key={i} className="w-full rounded" style={{ backgroundColor: color, height: `${heightPercent}%` }} />;
        })}
      </div>
    </div>
  );
}
