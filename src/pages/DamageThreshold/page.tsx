import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import React, { useMemo, useState } from "react";
import { DoubleSide } from "three";
import { PlaybackControls, usePlaybackControl } from "../../components/PlaybackControls";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../../components/resizable";
import { SmallTimeline } from "../../components/SmallTimeline";
import { useAnimationData } from "../../hooks/nodeDataHook";
import type { BuildingAnimationData } from "../../lib/parser";
import { formatHex } from "culori";

const red500 = formatHex("oklch(63.7% 0.237 25.331)")!;
const amber400 = formatHex("oklch(82.8% 0.189 84.429)")!;
const green500 = formatHex("oklch(72.3% 0.219 149.579)")!;

function ThresholdBuilding({ frameIndex, warningThreshold, criticalThreshold, animationData }: { frameIndex: number; warningThreshold: number; criticalThreshold: number; animationData: BuildingAnimationData }) {
  const frame = animationData.frames[frameIndex];
  const initialFrame = animationData.frames[0];

  const offsetX = (animationData.maxInitialPos[0] + animationData.minInitialPos[0]) / -2;
  const offsetY = -animationData.minInitialPos[1];
  const offsetZ = (animationData.maxInitialPos[2] + animationData.minInitialPos[2]) / -2;
  const scale = 1;

  const stories = Array.from(frame.stories.entries()).sort(([, a], [, b]) => {
    const yA = frame.nodePositions.get(a.nodeIds[0])![1];
    const yB = frame.nodePositions.get(b.nodeIds[0])![1];
    return yA - yB;
  });

  const driftColors = useMemo(() => {
    const colors = new Map<string, string>();
    for (let i = 0; i < stories.length; i++) {
      const [storyId, story] = stories[i];
      const displacement = Math.hypot(...story.averageDisplacement);
      const storyHeight = frame.nodePositions.get(story.nodeIds[0])![1];
      let ratio = 0;

      if (i === 0) {
        const initialHeight = initialFrame.nodePositions.get(story.nodeIds[0])![1];
        ratio = initialHeight > 0 ? displacement / initialHeight : 0;
      } else {
        const [, prevStory] = stories[i - 1];
        const prevHeight = frame.nodePositions.get(prevStory.nodeIds[0])![1];
        const prevDisp = Math.hypot(...prevStory.averageDisplacement);
        const drift = Math.abs(displacement - prevDisp);
        const interStoryHeight = storyHeight - prevHeight;
        ratio = interStoryHeight > 0 ? drift / interStoryHeight : 0;
      }

      if (ratio >= criticalThreshold) colors.set(storyId, red500);
      else if (ratio >= warningThreshold) colors.set(storyId, amber400);
      else colors.set(storyId, green500);
    }
    return colors;
  }, [frame, initialFrame, warningThreshold, criticalThreshold, stories]);

  return (
    <>
      {stories.map(([storyId, story]) => {
        const nodePositions = story.nodeIds.map((nodeId) => {
          const pos = frame.nodePositions.get(nodeId)!;
          return { pos: [(pos[0] + offsetX) * scale, (pos[1] + offsetY) * scale, (pos[2] + offsetZ) * scale] };
        });

        const floorQuadPositions = new Float32Array([...nodePositions[1].pos, ...nodePositions[0].pos, ...nodePositions[2].pos, ...nodePositions[1].pos, ...nodePositions[2].pos, ...nodePositions[3].pos]);
        const floorColor = driftColors.get(storyId) || green500;

        return (
          <mesh key={storyId}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[floorQuadPositions, 3]} />
            </bufferGeometry>
            <meshBasicMaterial color={floorColor} opacity={0.6} transparent side={DoubleSide} fog={false} toneMapped={false} />
          </mesh>
        );
      })}
      <OrbitControls />
      <axesHelper args={[75]} />
    </>
  );
}

export function ViewDamageThreshold() {
  const animationData = useAnimationData();

  const playback = usePlaybackControl();

  const [warningThreshold, setWarningThreshold] = useState(0.01);
  const [criticalThreshold, setCriticalThreshold] = useState(0.02);

  const { storyData } = useMemo(() => {
    const storyData = new Map<string, { peakDrift: number; warningTime?: number; criticalTime?: number }>();
    const initialFrame = animationData.frames[0];

    // Initialize map with all stories
    for (const storyId of initialFrame.stories.keys()) {
      storyData.set(storyId, { peakDrift: 0 });
    }

    // Single pass to calculate peak drifts and first exceedance times
    for (let t = 0; t < animationData.frames.length; t++) {
      const frame = animationData.frames[t];
      const time = animationData.timeSteps[t];
      const stories = Array.from(frame.stories.entries()).sort(([, a], [, b]) => {
        const yA = frame.nodePositions.get(a.nodeIds[0])![1];
        const yB = frame.nodePositions.get(b.nodeIds[0])![1];
        return yA - yB;
      });

      for (let i = 0; i < stories.length; i++) {
        const [storyId, story] = stories[i];
        const displacement = Math.hypot(...story.averageDisplacement);
        const storyHeight = frame.nodePositions.get(story.nodeIds[0])![1];
        let ratio = 0;

        if (i === 0) {
          const initialHeight = initialFrame.nodePositions.get(story.nodeIds[0])![1];
          ratio = initialHeight > 0 ? displacement / initialHeight : 0;
        } else {
          const [, prevStory] = stories[i - 1];
          const prevHeight = frame.nodePositions.get(prevStory.nodeIds[0])![1];
          const prevDisp = Math.hypot(...prevStory.averageDisplacement);
          const drift = Math.abs(displacement - prevDisp);
          const interStoryHeight = storyHeight - prevHeight;
          ratio = interStoryHeight > 0 ? drift / interStoryHeight : 0;
        }

        const currentStoryData = storyData.get(storyId)!;

        // Update peak drift
        if (ratio > currentStoryData.peakDrift) {
          currentStoryData.peakDrift = ratio;
        }

        // Log first time warning threshold is exceeded
        if (ratio >= warningThreshold && currentStoryData.warningTime === undefined) {
          currentStoryData.warningTime = time;
        }

        // Log first time critical threshold is exceeded
        if (ratio >= criticalThreshold && currentStoryData.criticalTime === undefined) {
          currentStoryData.criticalTime = time;
        }
      }
    }

    return { storyData };
  }, [animationData, warningThreshold, criticalThreshold]);

  const sortedStories = useMemo(() => Array.from(storyData.entries()).sort((a, b) => parseInt(a[0].replace("S", "")) - parseInt(b[0].replace("S", ""))), [storyData]);
  const maxPeakDrift = useMemo(() => Math.max(...Array.from(storyData.values()).map((d) => d.peakDrift), 0.01), [storyData]);

  return (
    <div className="flex h-full min-h-0">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={30} minSize={5} maxSize={40} className="flex">
          <div className="w-full p-4 flex flex-col gap-4 overflow-y-auto skinny-scrollbar border-r-2 border-neutral-300">
            <div>
              <h2 className="text-xl font-bold">Damage Thresholds</h2>
              <p className="text-sm text-neutral-600">Set inter-story drift ratio limits to see potential damage states.</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex flex-col">
                <span className="font-semibold">Warning Threshold ({warningThreshold.toFixed(3)})</span>
                <input type="range" min="0" max="0.05" step="0.001" value={warningThreshold} onChange={(e) => setWarningThreshold(parseFloat(e.target.value))} />
              </label>
              <label className="flex flex-col">
                <span className="font-semibold">Critical Threshold ({criticalThreshold.toFixed(3)})</span>
                <input type="range" min="0" max="0.05" step="0.001" value={criticalThreshold} onChange={(e) => setCriticalThreshold(parseFloat(e.target.value))} />
              </label>
            </div>

            <div>
              <h3 className="text-lg font-bold mt-4">Story Damage Summary</h3>
              <div className="w-full text-xs text-neutral-600 grid grid-cols-[auto_1fr_auto_auto] p-2 gap-1">
                <span className="whitespace-nowrap">Floor</span>
                <span className="whitespace-nowrap text-center">Peak Drift</span>
                <span className="whitespace-nowrap text-center">Warning (s)</span>
                <span className="whitespace-nowrap text-center">Critical (s)</span>

                {/* Rows */}
                {sortedStories.map(([storyId, data]) => (
                  <React.Fragment key={storyId}>
                    <div className="font-mono">{storyId}</div>
                    <div className="w-full flex items-center">
                      <div className="grow bg-neutral-200 h-4 rounded">
                        <div
                          className={`h-full rounded ${data.peakDrift > criticalThreshold ? "bg-red-500" : data.peakDrift > warningThreshold ? "bg-amber-400" : "bg-green-500"}`}
                          style={{
                            width: `${(data.peakDrift / maxPeakDrift) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-12 font-mono text-right shrink-0">{data.peakDrift.toFixed(4)}</span>
                    </div>
                    <div className={`w-14 font-mono text-center p-1 rounded ${data.warningTime ? "bg-yellow-200" : ""}`}>{data.warningTime?.toFixed(2) ?? "-"}</div>
                    <div className={`w-14 font-mono text-center p-1 rounded ${data.criticalTime ? "bg-red-200" : ""}`}>{data.criticalTime?.toFixed(2) ?? "-"}</div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={70} className="min-h-0 flex h-full">
          <div className="relative w-full">
            <Canvas camera={{ position: [80, 80, 80], fov: 50 }}>
              <ThresholdBuilding frameIndex={playback.frameIndex} warningThreshold={warningThreshold} criticalThreshold={criticalThreshold} animationData={animationData} />
            </Canvas>
            <div className="absolute bottom-2 inset-x-2 bg-white/80 backdrop-blur-sm rounded p-2 flex items-center gap-4 h-16">
              <PlaybackControls playback={playback} />
              <SmallTimeline frameIndex={playback.frameIndex} onFrameChange={playback.setFrameIndex} />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
