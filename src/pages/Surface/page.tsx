import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { converter, interpolate } from "culori";
import React, { useMemo, useState } from "react";
import { BufferAttribute, Color, PlaneGeometry } from "three";
import { useAnimationData } from "../../hooks/nodeDataHook";

const amber400 = "oklch(82.8% 0.189 84.429)";
const red700 = "oklch(50.5% 0.213 27.518)";
const colorMap = interpolate([amber400, red700], "oklab");
const rgbConverter = converter("rgb");

function SurfacePlot({ metric }: { metric: "displacement" | "drift" }) {
  const animationData = useAnimationData();
  const { invalidate } = useThree();

  const { geometry, maxMetricValue } = useMemo(() => {
    const { frames, timeSteps } = animationData;
    const numFrames = frames.length;
    if (numFrames === 0) return { geometry: new PlaneGeometry(), maxMetricValue: 1 };

    const firstFrameStories = Array.from(frames[0].stories.values()).sort((a, b) => {
      const yA = frames[0].nodePositions.get(a.nodeIds[0])![1];
      const yB = frames[0].nodePositions.get(b.nodeIds[0])![1];
      return yA - yB;
    });
    const numStories = firstFrameStories.length;
    const storyIds = firstFrameStories.map((s) => s.nodeIds[0].slice(0, -2)); // Assuming story ID is consistent

    const heightData = Array.from({ length: numStories }, () => new Float32Array(numFrames));
    let maxMetricValue = 0;

    for (let t = 0; t < numFrames; t++) {
      const frame = frames[t];
      const stories = Array.from(frame.stories.values()).sort((a, b) => {
        const yA = frame.nodePositions.get(a.nodeIds[0])![1];
        const yB = frame.nodePositions.get(b.nodeIds[0])![1];
        return yA - yB;
      });

      for (let s = 0; s < numStories; s++) {
        let value = 0;
        const story = stories[s];
        if (metric === "displacement") {
          value = Math.hypot(...story.averageDisplacement);
        } else {
          // drift
          const displacement = Math.hypot(...story.averageDisplacement);
          const storyHeight = frame.nodePositions.get(story.nodeIds[0])![1];
          if (s === 0) {
            const initialHeight = animationData.frames[0].nodePositions.get(story.nodeIds[0])![1];
            value = initialHeight > 0 ? displacement / initialHeight : 0;
          } else {
            const prevStory = stories[s - 1];
            const prevHeight = frame.nodePositions.get(prevStory.nodeIds[0])![1];
            const prevDisp = Math.hypot(...prevStory.averageDisplacement);
            const drift = Math.abs(displacement - prevDisp);
            const interStoryHeight = storyHeight - prevHeight;
            value = interStoryHeight > 0 ? drift / interStoryHeight : 0;
          }
        }
        heightData[s][t] = value;
        if (value > maxMetricValue) maxMetricValue = value;
      }
    }

    const geom = new PlaneGeometry(2000, 100, numFrames - 1, numStories - 1);
    const positions = geom.attributes.position;
    const colors = new Float32Array(positions.count * 3);

    for (let s = 0; s < numStories; s++) {
      for (let t = 0; t < numFrames; t++) {
        const i = s * numFrames + t;
        const height = heightData[s][t];
        positions.setY(i, (height / maxMetricValue) * 20); // Scale height for visualization
        positions.setZ(i, s * 5);

        const colorFactor = height / maxMetricValue;
        const rgbColor = rgbConverter(colorMap(colorFactor));
        new Color(rgbColor.r, rgbColor.g, rgbColor.b).toArray(colors, i * 3);
      }
    }

    geom.setAttribute("color", new BufferAttribute(colors, 3));
    geom.computeVertexNormals();
    positions.needsUpdate = true;

    // Must invalidate to force a re-render after memo finishes
    invalidate();

    return { geometry: geom, maxMetricValue };
  }, [animationData, metric, invalidate]);

  const yAxisLabel = metric === "displacement" ? "Avg. Displacement (m)" : "Inter-story Drift Ratio";

  return (
    <>
      <mesh geometry={geometry}>
        <meshStandardMaterial vertexColors side={2} />
      </mesh>
      <axesHelper args={[60]} />
      <gridHelper args={[100, 10]} />

      {/* <text position={[55, 0, 0]} fontSize={2} rotation={[0, Math.PI / 2, 0]}>
        Time (s)
      </text>
      <text position={[0, 0, 55]} fontSize={2}>
        Floor
      </text>
      <text position={[0, 22, 0]} fontSize={2}>
        {yAxisLabel}
      </text> */}
    </>
  );
}

export function ViewSurface() {
  const [metric, setMetric] = useState<"displacement" | "drift">("displacement");

  return (
    <div className="flex-grow flex flex-col relative min-h-0">
      <div className="absolute top-2 left-2 z-10 bg-white/80 p-2 rounded">
        <label className="flex items-center gap-2">
          <span className="font-bold">Metric:</span>
          <select value={metric} onChange={(e) => setMetric(e.target.value as "displacement" | "drift")} className="p-1 border rounded">
            <option value="displacement">Average Displacement</option>
            <option value="drift">Inter-story Drift</option>
          </select>
        </label>
      </div>
      <Canvas camera={{ position: [80, 80, 80], fov: 50 }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[100, 100, 50]} intensity={2} />
        <SurfacePlot metric={metric} />
        <OrbitControls />
      </Canvas>
    </div>
  );
}
