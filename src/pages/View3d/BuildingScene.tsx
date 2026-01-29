import { usePlayback } from "@/components/playback/PlaybackContext";
import { UNIT_SCALE } from "@/lib/utils";
import { useFrame } from "@react-three/fiber";
import { converter, interpolate } from "culori";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useAnimationData } from "../../hooks/nodeDataHook";

const amber400 = "oklch(82.8% 0.189 84.429)";
const red700 = "oklch(50.5% 0.213 27.518)";
const colorMap = interpolate([amber400, red700], "oklab");
const rgbConverter = converter("rgb");

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

export function BuildingScene() {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();

  const offsetX = -animationData.precomputed.boundingBox.center[0];
  const offsetY = -animationData.precomputed.boundingBox.center[1];
  const offsetZ = -animationData.precomputed.boundingBox.min[2];

  const maxDisplacement = animationData.precomputed.maxDisplacement;

  const nodeCount = animationData.metadata.nodeCount;

  const [hovered, setHovered] = useState<number | undefined>(undefined);

  const positions = useMemo(() => {
    const positions = new Float32Array(nodeCount * 3);

    for (let i = 0; i < nodeCount; i++) {
      const pos = animationData.initialPositions.at(i);
      const displacement = animationData.displacement.at(frameIndex).at(i);
      positions[i * 3 + 0] = pos[0] + displacement[0];
      positions[i * 3 + 1] = pos[1] + displacement[1];
      positions[i * 3 + 2] = pos[2] + displacement[2];
    }
    return positions;
  }, [frameIndex, animationData, nodeCount]);

  const colors = useMemo(() => {
    const colors = new Float32Array(nodeCount * 3);
    for (let i = 0; i < nodeCount; i++) {
      const displacement = animationData.displacement.at(frameIndex).at(i);
      const mag = Math.hypot(displacement[0], displacement[1], displacement[2]);
      const displacementScale = mag / maxDisplacement;
      const color = rgbConverter(colorMap(displacementScale));

      colors[i * 3 + 0] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    return colors;
  }, [frameIndex, animationData, nodeCount, maxDisplacement]);

  const meshRef = useRef<THREE.InstancedMesh>(null);

  useFrame(() => {
    if (!meshRef.current || nodeCount === 0) return;

    const colorAttr = meshRef.current.geometry.attributes.color;
    if (!colorAttr) return;

    for (let i = 0; i < nodeCount; i++) {
      tempObject.position.set(positions[i * 3 + 0], positions[i * 3 + 1], positions[i * 3 + 2]);

      const scale = hovered === i ? 50 : 1 / UNIT_SCALE;
      tempObject.scale.set(scale, scale, scale);

      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);

      ///

      if (i === hovered) tempColor.setRGB(2 / 255, 140 / 255, 180 / 255);
      // else tempColor.set(colors[i * 3 + 0], colors[i * 3 + 1], colors[i * 3 + 2]);
      else tempColor.fromArray(colors, i * 3);

      tempColor.toArray(colorAttr.array, i * 3);

      // meshRef.current.setColorAt(i, tempColor);
      // meshRef.current.geometry.attributes.color.needsUpdate = true;
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    colorAttr.needsUpdate = true;
  });

  return (
    <>
      <ambientLight intensity={2} />
      <hemisphereLight intensity={0.5} groundColor="#1a1a1a" position={[0, 0, 100]} />

      <group scale={UNIT_SCALE}>
        <group position={[offsetX, offsetY, offsetZ]}>
          <instancedMesh
            ref={meshRef}
            onPointerMove={(e) => (e.stopPropagation(), setHovered(e.instanceId))}
            onPointerOut={(e) => (e.stopPropagation(), setHovered(undefined))}
            args={[undefined, undefined, nodeCount]}
            frustumCulled={false}>
            <sphereGeometry args={[1, 4, 2]}>
              <instancedBufferAttribute
                attach="attributes-color"
                args={[colors.slice(), 3]}
                usage={THREE.DynamicDrawUsage}
              />
            </sphereGeometry>
            <meshBasicMaterial fog={false} toneMapped={false} vertexColors />
          </instancedMesh>
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
