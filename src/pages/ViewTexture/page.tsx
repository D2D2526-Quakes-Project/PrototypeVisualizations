import { formatHex, interpolate } from "culori";
import { useMemo, useState } from "react";
import { usePlayback } from "@/components/playback/PlaybackContext";
import { useAnimationData } from "@/hooks/nodeDataHook";

const amber400 = "oklch(82.8% 0.189 84.429)";
const red700 = "oklch(50.5% 0.213 27.518)";
const colorMap = interpolate([amber400, red700], "oklab");

export function ViewTexture() {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  
  const [curveResolution, setCurveResolution] = useState(100);
  
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
    <div className="h-full flex flex-col min-h-0 gap-2">
      <div>
        <span>
          Frame: {frameIndex + 1} / {frameCount} | Time: {(frameIndex * dt).toFixed(3)}s | Avg Displacement: {Math.hypot(...avgBuildingDisplacement)?.toFixed(2)}in
        </span>
        <br />
        <span>Color is the average displacement of the story scaled by maximum displacement. The size is a percentage of the total displacement for the frame.</span>
      </div>
      <div className="flex gap-2 items-center">
        <label className="flex gap-2 whitespace-nowrap">
          <input type="range" min="20" max="500" step={1} value={curveResolution} onChange={(e) => setCurveResolution(parseInt(e.target.value))} className="w-full" />
          Curve Resolution: {curveResolution}
        </label>
      </div>
      <div className="flex flex-col items-center h-full gap-1">
        {storyData.map((story, i) => {
          const color = formatHex(colorMap(story.avgDispMag / maxDisplacement));

          const points = new Array(curveResolution)
            .fill(0)
            .map((_, i) => i / curveResolution)
            .map((p) => {
              const disp = story.avgDispMag / maxDisplacement;
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
