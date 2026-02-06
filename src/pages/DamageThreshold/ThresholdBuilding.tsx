import { CanvasWithControls } from "@/components/CanvasWithControls";
import React, { useMemo, useState } from "react";
import { DoubleSide } from "three";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../../components/resizable";
import { SmallTimeline } from "../../components/SmallTimeline";
import { useAnimationData } from "../../hooks/nodeDataHook";
import type { BuildingAnimationData } from "../../lib/parser";
import { formatHex, interpolate } from "culori";
import { usePlayback } from "@/components/playback/PlaybackContext";
import { PlaybackControls } from "@/components/playback/PlaybackControls";
import { useStoryDriftData } from "./useStoryDriftData";

const blue900 = formatHex("oklch(37.9% 0.146 265.522)")!;
const blue600 = formatHex("oklch(54.6% 0.245 262.881)")!;
const blue400 = formatHex("oklch(70.7% 0.165 254.624)")!;
const white = formatHex("#fff")!;
const red400 = formatHex("oklch(70.4% 0.191 22.216)")!;
const red600 = formatHex("oklch(57.7% 0.245 27.325)")!;
const red900 = formatHex("oklch(39.6% 0.141 25.723)")!;
const colorMap = interpolate(
  [
    [blue900, -1],
    [blue600, -0.51],
    [blue400, -0.5],
    [white, 0],
    [red400, 0.5],
    [red600, 0.51],
    [red900, 1],
  ],
  "oklab",
);

export function ThresholdBuilding({ warningThreshold }: { warningThreshold: number }) {
  return null;
  const { animationData } = useAnimationData();
  const { storyOrder } = animationData.metadata;
  const { storyDrift, peakStoryDrift, storyElevations, cornerNodes } = useStoryDriftData();

  // const frame = animationData.frames[frameIndex];
  // const initialFrame = animationData.frames[0];

  const offsetX = -animationData.precomputed.boundingBox.center[0];
  const offsetY = -animationData.precomputed.boundingBox.center[1];
  const offsetZ = -animationData.precomputed.boundingBox.min[2];

  // const stories = Array.from(frame.stories.entries()).sort(([, a], [, b]) => {
  //   const yA = frame.nodePositions.get(a.nodeIds[0])![1];
  //   const yB = frame.nodePositions.get(b.nodeIds[0])![1];
  //   return yA - yB;
  // });

  // const driftColors = useMemo(() => {
  //   const colors = new Map<string, string>();
  //   for (let i = 0; i < stories.length; i++) {
  //     const [storyId, story] = stories[i];
  //     const displacement = Math.hypot(...story.averageDisplacement);
  //     const storyHeight = frame.nodePositions.get(story.nodeIds[0])![1];
  //     let ratio = 0;

  //     if (i === 0) {
  //       const initialHeight = initialFrame.nodePositions.get(story.nodeIds[0])![1];
  //       ratio = initialHeight > 0 ? displacement / initialHeight : 0;
  //     } else {
  //       const [, prevStory] = stories[i - 1];
  //       const prevHeight = frame.nodePositions.get(prevStory.nodeIds[0])![1];
  //       const prevDisp = Math.hypot(...prevStory.averageDisplacement);
  //       const drift = Math.abs(displacement - prevDisp);
  //       const interStoryHeight = storyHeight - prevHeight;
  //       ratio = interStoryHeight > 0 ? drift / interStoryHeight : 0;
  //     }

  //     if (ratio >= criticalThreshold) colors.set(storyId, red500);
  //     else if (ratio >= warningThreshold) colors.set(storyId, amber400);
  //     else colors.set(storyId, green500);
  //   }
  //   return colors;
  // }, [frame, initialFrame, warningThreshold, criticalThreshold, stories]);

  return (
    <>
      {storyOrder.flatMap((storyId) => {
        const corners = cornerNodes.get(storyId);
        if (!corners) return;

        return (["NE", "NW", "SW", "SE"] as const).map(() => {
          // const cornerNode = story;

          return (
            <mesh key={storyId}>
              {/* <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[floorQuadPositions, 3]} />
            </bufferGeometry>
            <meshBasicMaterial
              color={floorColor}
              opacity={0.6}
              transparent
              side={DoubleSide}
              fog={false}
              toneMapped={false}
            /> */}
            </mesh>
          );
        });

        // const corners = animationData.metadata.corners.

        // const nodePositions = story.map((nodeIdx) => {
        //   const pos = frame.nodePositions.get(nodeId)!;
        //   return { pos: [(pos[0] + offsetX) * scale, (pos[1] + offsetY) * scale, (pos[2] + offsetZ) * scale] };
        // });

        // const floorQuadPositions = new Float32Array([
        //   ...nodePositions[1].pos,
        //   ...nodePositions[0].pos,
        //   ...nodePositions[2].pos,
        //   ...nodePositions[1].pos,
        //   ...nodePositions[2].pos,
        //   ...nodePositions[3].pos,
        // ]);
        // const floorColor = driftColors.get(storyId) || green500;
      })}
      <axesHelper args={[75]} />
    </>
  );
}
