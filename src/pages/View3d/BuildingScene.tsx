import { Line, OrbitControls } from "@react-three/drei";
import { converter, formatHex, interpolate } from "culori";
import React from "react";
import { DoubleSide } from "three";
import { useAnimationData } from "../../hooks/nodeDataHook";

const amber400 = "oklch(82.8% 0.189 84.429)";
const red700 = "oklch(50.5% 0.213 27.518)";
const colorMap = interpolate([amber400, red700], "oklab");
const rgbConverter = converter("rgb");

export function BuildingScene({ frameIndex, scale, displacementScale }: { frameIndex: number; scale: number; displacementScale: number }) {
  const animationData = useAnimationData();
  const frame = animationData.frames[frameIndex];

  const initalPositions = animationData.frames[0].nodePositions;

  const offsetX = (animationData.maxInitialPos[0] + animationData.minInitialPos[0]) / -2;
  const offsetY = -animationData.minInitialPos[1];
  const offsetZ = (animationData.maxInitialPos[2] + animationData.minInitialPos[2]) / -2;

  const maxDisplacement = animationData.maxDisplacement;

  return (
    <>
      <ambientLight intensity={2} />
      <hemisphereLight intensity={0.5} groundColor="#1a1a1a" position={[0, 0, 100]} />
      {Array.from(frame.stories.entries()).map(([storyId, story]) => {
        const nodePositions = story.nodeIds.map((nodeId) => {
          const initalPos = initalPositions.get(nodeId)!;
          const position = frame.nodePositions.get(nodeId)!;

          const displacementX = position[0] - initalPos[0];
          const displacementY = position[1] - initalPos[1];
          const displacementZ = position[2] - initalPos[2];

          const posX = initalPos[0] + displacementX * displacementScale + offsetX;
          const posY = position[1] + offsetY;
          const posZ = initalPos[2] + displacementZ * displacementScale + offsetZ;

          const finalPosX = posX * scale;
          const finalPosY = posY * scale;
          const finalPosZ = posZ * scale;
          return { pos: [finalPosX, finalPosY, finalPosZ], disp: [displacementX, displacementY, displacementZ] };
        });

        const floorQuadPositions = new Float32Array([
          // Triangle 1
          ...nodePositions[1].pos,
          ...nodePositions[0].pos,
          ...nodePositions[2].pos,
          // Triangle 2
          ...nodePositions[1].pos,
          ...nodePositions[2].pos,
          ...nodePositions[3].pos,
        ]);

        const avgDisp = Math.hypot(...story.averageDisplacement);
        const floorColor = formatHex(colorMap(avgDisp / maxDisplacement));

        return (
          <React.Fragment key={storyId}>
            {nodePositions.map(({ pos, disp }, i) => {
              const displacement = Math.hypot(...disp);
              const color = formatHex(colorMap(displacement / maxDisplacement));
              return (
                <mesh key={i} position={[pos[0], pos[1], pos[2]]} scale={[2, 1, 2]}>
                  <boxGeometry args={[2, 2, 2]} />
                  <meshBasicMaterial color={color} fog={false} toneMapped={false} />
                </mesh>
              );
            })}
            <mesh>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[floorQuadPositions, 3]} />
              </bufferGeometry>
              <meshBasicMaterial color={floorColor} opacity={0.3} transparent side={DoubleSide} fog={false} toneMapped={false} />
            </mesh>
          </React.Fragment>
        );
      })}

      <InSceneGraph frameIndex={frameIndex} scale={scale} displacementScale={displacementScale} />

      <OrbitControls />
      <axesHelper args={[75]} />

      <gridHelper rotateY={Math.PI / 2} args={[200, 20]} />
    </>
  );
}

function InSceneGraph({ frameIndex }: { frameIndex: number; scale: number; displacementScale: number }) {
  const animationData = useAnimationData();
  const maxAvgDisp = animationData.maxAverageStoryDisplacement;

  const width = 20;
  const padding = 8;

  const offsetX = animationData.maxInitialPos[0] + (animationData.maxInitialPos[0] + animationData.minInitialPos[0]) / -2;
  const offsetY = animationData.minInitialPos[1] + -animationData.minInitialPos[1];
  const offsetZ = animationData.maxInitialPos[2] + (animationData.maxInitialPos[2] + animationData.minInitialPos[2]) / -2;

  const frame = animationData.frames[frameIndex];
  const stories = Array.from(animationData.frames[frameIndex].stories.values());
  const numStories = stories.length;

  const displacementPoints: [number, number, number][] = new Array(numStories);
  const displacementPointsColors: [number, number, number][] = new Array(numStories);
  const interStoryDriftPoints: [number, number, number][] = new Array(numStories);
  const interStoryDriftPointsColors: [number, number, number][] = new Array(numStories);

  const minY = animationData.minInitialPos[1];
  const getY = (nodeId: string) => frame.nodePositions.get(nodeId)![1];

  for (let i = 0; i < numStories; i++) {
    const story = stories[i];
    const nodeZero = story.nodeIds[0];
    const storyHeight = getY(nodeZero);

    // displacement point
    const displacement = Math.hypot(...story.averageDisplacement);
    const xDisp = (displacement / maxAvgDisp) * width;
    displacementPoints[i] = [xDisp, storyHeight - minY, 0];
    const c = rgbConverter(colorMap(displacement / maxAvgDisp));
    displacementPointsColors[i] = [c.r, c.g, c.b];

    // inter-story drift point
    if (i === 0) {
      interStoryDriftPoints[i] = [0, storyHeight - minY, 0];
      interStoryDriftPointsColors[i] = [0, 0, 0];
    } else {
      const prev = stories[i - 1];
      const prevHeight = getY(prev.nodeIds[0]);
      const prevDisp = Math.hypot(...prev.averageDisplacement);
      const drift = displacement - prevDisp;
      const ratio = drift / Math.abs(storyHeight - prevHeight);
      interStoryDriftPoints[i] = [ratio * width * width, storyHeight - minY, 0];
      interStoryDriftPointsColors[i] = [0, 0, 0];
    }
  }

  return (
    <mesh position={[offsetX + padding, offsetY, offsetZ]}>
      {/* <mesh position={[width / 2, height / 2, 0]}>
        <planeGeometry args={[width, height]} />
      </mesh> */}
      <Line points={displacementPoints} vertexColors={displacementPointsColors} lineWidth={2} fog={false} toneMapped={false} />
      <Line position={[0, 0, -1]} points={interStoryDriftPoints} vertexColors={interStoryDriftPointsColors} lineWidth={2} fog={false} toneMapped={false} />
    </mesh>
  );
}
