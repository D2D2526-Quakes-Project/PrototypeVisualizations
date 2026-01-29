import { usePlayback } from "@/components/playback/PlaybackContext";
import { useNodeSelection } from "@/contexts/NodeSelectionContext";
import { UNIT_SCALE } from "@/lib/utils";
import { useFrame, useThree } from "@react-three/fiber";
import { converter, interpolate } from "culori";
import { useMemo, useRef, useState, useCallback } from "react";
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
  const { selectNode } = useNodeSelection();
  const { camera, gl: renderer } = useThree();

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

  const handleNodeClick = useCallback((event: { instanceId?: number; stopPropagation: () => void }) => {
    if (event.instanceId === undefined) return;
    
    const nodeId = event.instanceId;
    
    // Get the world position of the clicked node
    const worldPos = new THREE.Vector3(
      positions[nodeId * 3 + 0],
      positions[nodeId * 3 + 1], 
      positions[nodeId * 3 + 2]
    );
    
    // Convert world coordinates to screen coordinates
    const vector = worldPos.clone();
    vector.project(camera);
    const x = (vector.x * 0.5 + 0.5) * renderer.domElement.width;
    const y = (vector.y * -0.5 + 0.5) * renderer.domElement.height;
    
    selectNode(nodeId, { x, y });
  }, [camera, renderer, selectNode, positions]);

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
            onClick={(e) => (e.stopPropagation(), handleNodeClick(e))}
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


