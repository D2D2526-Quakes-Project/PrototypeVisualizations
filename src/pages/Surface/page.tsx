import { Line } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { CanvasWithControls } from "@/components/CanvasWithControls";
import { converter, interpolate } from "culori";
import { useMemo, useState } from "react";
import { Color, Vector3 } from "three";
import { usePlayback } from "@/components/playback/PlaybackContext";
import { useAnimationData } from "@/hooks/nodeDataHook";
import { SmallTimeline } from "@/components/SmallTimeline";

const amber400 = "oklch(82.8% 0.189 84.429)";
const red700 = "oklch(50.5% 0.213 27.518)";
const colorMap = interpolate([amber400, red700], "oklab");
const rgbConverter = converter("rgb");

function SurfacePlot({ metric }: { metric: "displacement" | "drift" }) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { invalidate } = useThree();
  const meshLength = 2000;

  const { stories, storyOrder } = animationData.metadata;
  const frameCount = animationData.metadata.frameCount;

  const { positions, colors } = useMemo((): {
    positions: Vector3[][];
    colors: Color[][];
    maxMetricValue: number;
  } => {
    const numFrames = frameCount;
    if (numFrames === 0) return { positions: [], colors: [], maxMetricValue: 1 };

    const numStories = storyOrder.length;

    const heightData: Float32Array[] = Array.from({ length: numStories }, () => new Float32Array(numFrames));
    let maxMetricValue = 0;

    for (let t = 0; t < numFrames; t++) {
      for (let s = 0; s < numStories; s++) {
        const storyId = storyOrder[s];
        const nodeIndices = stories[storyId];
        
        // Calculate average displacement for this story at this frame
        let totalDx = 0, totalDy = 0, totalDz = 0;
        for (const nodeIdx of nodeIndices) {
          const disp = animationData.displacementLin.atFrame(t).at(nodeIdx);
          totalDx += disp[0];
          totalDy += disp[1];
          totalDz += disp[2];
        }
        const avgDisp = [totalDx / nodeIndices.length, totalDy / nodeIndices.length, totalDz / nodeIndices.length];
        const displacement = Math.hypot(...avgDisp);

        let value = 0;
        if (metric === "displacement") {
          value = displacement;
        } else {
          // drift
          const storyElevation = animationData.precomputed.storyElevations[storyId] || 0;
          
          if (s === 0) {
            value = storyElevation > 0 ? displacement / storyElevation : 0;
          } else {
            const prevStoryId = storyOrder[s - 1];
            const prevNodeIndices = stories[prevStoryId];
            let prevTotalDx = 0, prevTotalDy = 0, prevTotalDz = 0;
            for (const nodeIdx of prevNodeIndices) {
              const disp = animationData.displacementLin.atFrame(t).at(nodeIdx);
              prevTotalDx += disp[0];
              prevTotalDy += disp[1];
              prevTotalDz += disp[2];
            }
            const prevAvgDisp = [prevTotalDx / prevNodeIndices.length, prevTotalDy / prevNodeIndices.length, prevTotalDz / prevNodeIndices.length];
            const prevDisp = Math.hypot(...prevAvgDisp);
            
            const prevElevation = animationData.precomputed.storyElevations[prevStoryId] || 0;
            const interStoryHeight = storyElevation - prevElevation;
            const drift = Math.abs(displacement - prevDisp);
            value = interStoryHeight > 0 ? drift / interStoryHeight : 0;
          }
        }
        heightData[s][t] = value;
        if (value > maxMetricValue) maxMetricValue = value;
      }
    }

    const positions: Vector3[][] = [];
    const colors: Color[][] = [];

    for (let s = 0; s < numStories; s++) {
      const storyData: Vector3[] = [];
      const storyColor: Color[] = [];
      for (let t = 0; t < numFrames; t++) {
        const height = heightData[s][t];
        storyData.push(new Vector3((t / numFrames) * meshLength, s * 5, (height / maxMetricValue) * 20));

        const colorFactor = height / maxMetricValue;
        const rgbColor = rgbConverter(colorMap(colorFactor));
        storyColor.push(new Color(rgbColor.r, rgbColor.g, rgbColor.b));
      }
      positions.push(storyData);
      colors.push(storyColor);
    }

    invalidate();

    return { positions, colors, maxMetricValue };
  }, [animationData, metric, stories, storyOrder, frameCount, invalidate]);

  return (
    <>
      <group position={[(frameIndex / frameCount) * meshLength, 0, 0]} scale={[-1, 1, -2]}>
        {positions.map((pos, i) => {
          return <Line key={i} points={pos} vertexColors={colors[i]} lineWidth={10} fog={false} toneMapped={false} />;
        })}
      </group>
      <axesHelper args={[60]} />
      <gridHelper args={[100, 10]} />
    </>
  );
}

export function ViewSurface() {
  const [metric, setMetric] = useState<"displacement" | "drift">("displacement");

  return (
    <div className="grow flex flex-col relative min-h-0">
      <div className="absolute top-2 left-2 z-10 bg-white/80 p-2 rounded">
        <label className="flex items-center gap-2">
          <span className="font-bold">Metric:</span>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as "displacement" | "drift")}
            className="p-1 border rounded">
            <option value="displacement">Average Displacement</option>
            <option value="drift">Story Drift Ratio</option>
          </select>
        </label>
      </div>

      <div className="absolute bottom-2 left-2 right-2 h-8 z-10">
        <SmallTimeline />
      </div>

      <CanvasWithControls>
        <ambientLight intensity={1.5} />
        <directionalLight position={[100, 100, 50]} intensity={2} />
        <SurfacePlot metric={metric} />
      </CanvasWithControls>
    </div>
  );
}
