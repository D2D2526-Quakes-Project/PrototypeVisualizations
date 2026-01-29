import { Line, PointMaterial, Points } from "@react-three/drei";
import { converter, formatHex, interpolate } from "culori";
import React, { useMemo } from "react";
import { DoubleSide, Vector3 } from "three";
import { useAnimationData } from "../../hooks/nodeDataHook";
import { UNIT_SCALE } from "@/lib/utils";
import { usePlayback } from "@/components/playback/PlaybackContext";

const amber400 = "oklch(82.8% 0.189 84.429)";
const red700 = "oklch(50.5% 0.213 27.518)";
const colorMap = interpolate([amber400, red700], "oklab");
const rgbConverter = converter("rgb");

export function BuildingScene() {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();

  const initalPositions = animationData.initialPositions;

  const offsetX = -animationData.precomputed.boundingBox.center[0];
  const offsetY = -animationData.precomputed.boundingBox.center[1];
  const offsetZ = -animationData.precomputed.boundingBox.min[2];

  const maxDisplacement = animationData.precomputed.maxDisplacement;

  // const nodes = useMemo(() => {
  //   const nodes = [];

  //   for (let i = 0; i < animationData.metadata.nodeCount; i++) {
  //     const pos = initalPositions.at(i);
  //     nodes.push(
  //       <mesh position={[pos[0], pos[1], pos[2]]} key={i}>
  //         <boxGeometry args={[2, 2, 2]} />
  //         <meshBasicMaterial color="red" fog={false} toneMapped={false} />
  //       </mesh>,
  //     );
  //   }
  //   return nodes;
  // }, [initalPositions, animationData.metadata.nodeCount]);

  const nodeCount = animationData.metadata.nodeCount;

  const positions = new Float32Array(nodeCount * 3);

  for (let i = 0; i < nodeCount; i++) {
    const pos = animationData.initialPositions.at(i);
    const displacement = animationData.displacement.at(frameIndex).at(i);
    positions[i * 3 + 0] = pos[0] + displacement[0];
    positions[i * 3 + 1] = pos[1] + displacement[1];
    positions[i * 3 + 2] = pos[2] + displacement[2];
  }

  return (
    <>
      <ambientLight intensity={2} />
      <hemisphereLight intensity={0.5} groundColor="#1a1a1a" position={[0, 0, 100]} />
      {/* {Array.from(Object.entries(animationData.metadata.stories)).map(([storyId, indices]) => {
        // const avgDisp = Math.hypot(...story.averageDisplacement);
        const floorColor = formatHex(colorMap(0));
        // const floorColor = formatHex(colorMap(avgDisp / maxDisplacement));

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
              <meshBasicMaterial
                color={floorColor}
                opacity={0.3}
                transparent
                side={DoubleSide}
                fog={false}
                toneMapped={false}
              />
            </mesh>
          </React.Fragment>
        );
      })} */}

      <group scale={UNIT_SCALE}>
        <group position={[offsetX, offsetY, offsetZ]}>
          <Points positions={positions} stride={3} frustumCulled={false}>
            <PointMaterial transparent color="#ff0a5e" size={5} sizeAttenuation={false} depthWrite={false} />
          </Points>
        </group>
      </group>

      {/* <InSceneGraph frameIndex={frameIndex} scale={scale} displacementScale={displacementScale} /> */}

      {/* <arrowHelper
        args={[
          new Vector3(...animationData.groundMotion.at(frameIndex)),
          new Vector3(0, 0, 0),
          Math.hypot(...animationData.groundMotion.at(frameIndex)) * 10000,
          0xffff00,
        ]}
      /> */}

      {/* <axesHelper args={[75]} /> */}

      <gridHelper rotation={[Math.PI / 2, 0, 0]} args={[200, 20]} />
    </>
  );
}

function InSceneGraph({ frameIndex }: { frameIndex: number; scale: number; displacementScale: number }) {
  // const { animationData } = useAnimationData();
  // const maxAvgDisp = animationData.maxAverageStoryDisplacement;
  // const width = 20;
  // const padding = 8;
  // const offsetX =
  //   animationData.maxInitialPos[0] + (animationData.maxInitialPos[0] + animationData.minInitialPos[0]) / -2;
  // const offsetY = animationData.minInitialPos[1] + -animationData.minInitialPos[1];
  // const offsetZ =
  //   animationData.maxInitialPos[2] + (animationData.maxInitialPos[2] + animationData.minInitialPos[2]) / -2;
  // const frame = animationData.frames[frameIndex];
  // const stories = Array.from(animationData.frames[frameIndex].stories.values());
  // const numStories = stories.length;
  // const displacementPoints: [number, number, number][] = new Array(numStories);
  // const displacementPointsColors: [number, number, number][] = new Array(numStories);
  // const interStoryDriftPoints: [number, number, number][] = new Array(numStories);
  // const interStoryDriftPointsColors: [number, number, number][] = new Array(numStories);
  // const minY = animationData.minInitialPos[1];
  // const getY = (nodeId: string) => frame.nodePositions.get(nodeId)![1];
  // for (let i = 0; i < numStories; i++) {
  //   const story = stories[i];
  //   const nodeZero = story.nodeIds[0];
  //   const storyHeight = getY(nodeZero);
  //   // displacement point
  //   const displacement = Math.hypot(...story.averageDisplacement);
  //   const xDisp = (displacement / maxAvgDisp) * width;
  //   displacementPoints[i] = [xDisp, storyHeight - minY, 0];
  //   const c = rgbConverter(colorMap(displacement / maxAvgDisp));
  //   displacementPointsColors[i] = [c.r, c.g, c.b];
  //   // inter-story drift point
  //   if (i === 0) {
  //     interStoryDriftPoints[i] = [0, storyHeight - minY, 0];
  //     interStoryDriftPointsColors[i] = [0, 0, 0];
  //   } else {
  //     const prev = stories[i - 1];
  //     const prevHeight = getY(prev.nodeIds[0]);
  //     const prevDisp = Math.hypot(...prev.averageDisplacement);
  //     const drift = displacement - prevDisp;
  //     const ratio = drift / Math.abs(storyHeight - prevHeight);
  //     interStoryDriftPoints[i] = [ratio * width * width, storyHeight - minY, 0];
  //     interStoryDriftPointsColors[i] = [0, 0, 0];
  //   }
  // }
  // return (
  //   <mesh position={[offsetX + padding, offsetY, offsetZ]}>
  //     {/* <mesh position={[width / 2, height / 2, 0]}>
  //       <planeGeometry args={[width, height]} />
  //     </mesh> */}
  //     <Line
  //       points={displacementPoints}
  //       vertexColors={displacementPointsColors}
  //       lineWidth={2}
  //       fog={false}
  //       toneMapped={false}
  //     />
  //     <Line
  //       position={[0, 0, -1]}
  //       points={interStoryDriftPoints}
  //       vertexColors={interStoryDriftPointsColors}
  //       lineWidth={2}
  //       fog={false}
  //       toneMapped={false}
  //     />
  //   </mesh>
  // );
}
