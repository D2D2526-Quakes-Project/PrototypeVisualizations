import { formatHex, interpolate } from "culori";
import { Vector3 } from "three";
import { useAnimationData } from "../../hooks/nodeDataHook";

const amber400 = "oklch(82.8% 0.189 84.429)";
const red700 = "oklch(50.5% 0.213 27.518)";
const colorMap = interpolate([amber400, red700], "oklab");

interface VolumeData {
  bottomCorners: Vector3[];
  topCorners: Vector3[];
  averageDisplacement: [number, number, number];
}

export function VolumeScene({
  frameIndex,
  scale,
  displacementScale,
}: {
  frameIndex: number;
  scale: number;
  displacementScale: number;
}) {
  const { animationData } = useAnimationData();
  const frame = animationData.frames[frameIndex];

  const initalPositions = animationData.frames[0].nodePositions;

  const offsetX = (animationData.maxInitialPos[0] + animationData.minInitialPos[0]) / -2;
  const offsetY = -animationData.minInitialPos[1];
  const offsetZ = (animationData.maxInitialPos[2] + animationData.minInitialPos[2]) / -2;

  const maxDisplacement = animationData.maxDisplacement;

  // Create volumes between consecutive floors
  const volumes: VolumeData[] = [];
  const stories = Array.from(frame.stories.entries()).sort((a, b) => {
    const aHeight = initalPositions.get(a[1].nodeIds[0])?.[1] || 0;
    const bHeight = initalPositions.get(b[1].nodeIds[0])?.[1] || 0;
    return aHeight - bHeight;
  });

  for (let i = 0; i < stories.length - 1; i++) {
    const [, currentStory] = stories[i];
    const [, nextStory] = stories[i + 1];

    // Get node positions for current floor (bottom corners)
    const bottomNodePositions = currentStory.nodeIds.map((nodeId) => {
      const initalPos = initalPositions.get(nodeId)!;
      const position = frame.nodePositions.get(nodeId)!;

      const displacementX = position[0] - initalPos[0];
      const displacementZ = position[2] - initalPos[2];

      const posX = initalPos[0] + displacementX * displacementScale + offsetX;
      const posY = position[1] + offsetY;
      const posZ = initalPos[2] + displacementZ * displacementScale + offsetZ;

      const finalPosX = posX * scale;
      const finalPosY = posY * scale;
      const finalPosZ = posZ * scale;

      return new Vector3(finalPosX, finalPosY, finalPosZ);
    });

    // Get node positions for next floor (top corners)
    const topNodePositions = nextStory.nodeIds.map((nodeId) => {
      const initalPos = initalPositions.get(nodeId)!;
      const position = frame.nodePositions.get(nodeId)!;

      const displacementX = position[0] - initalPos[0];
      const displacementZ = position[2] - initalPos[2];

      const posX = initalPos[0] + displacementX * displacementScale + offsetX;
      const posY = position[1] + offsetY;
      const posZ = initalPos[2] + displacementZ * displacementScale + offsetZ;

      const finalPosX = posX * scale;
      const finalPosY = posY * scale;
      const finalPosZ = posZ * scale;

      return new Vector3(finalPosX, finalPosY, finalPosZ);
    });

    // Calculate average displacement for this volume
    const avgDisp: [number, number, number] = [
      (currentStory.averageDisplacement[0] + nextStory.averageDisplacement[0]) / 2,
      (currentStory.averageDisplacement[1] + nextStory.averageDisplacement[1]) / 2,
      (currentStory.averageDisplacement[2] + nextStory.averageDisplacement[2]) / 2,
    ];

    volumes.push({
      bottomCorners: bottomNodePositions,
      topCorners: topNodePositions,
      averageDisplacement: avgDisp,
    });
  }

  return (
    <>
      <ambientLight intensity={2} />
      <hemisphereLight intensity={0.5} groundColor="#1a1a1a" position={[0, 0, 100]} />

      {volumes.map((volume, index) => {
        const avgDispMagnitude = Math.hypot(...volume.averageDisplacement);
        const color = formatHex(colorMap(avgDispMagnitude / maxDisplacement));

        // Create vertices for the box geometry
        const vertices = new Float32Array([
          // Bottom face
          volume.bottomCorners[0].x,
          volume.bottomCorners[0].y,
          volume.bottomCorners[0].z,
          volume.bottomCorners[1].x,
          volume.bottomCorners[1].y,
          volume.bottomCorners[1].z,
          volume.bottomCorners[2].x,
          volume.bottomCorners[2].y,
          volume.bottomCorners[2].z,
          volume.bottomCorners[3].x,
          volume.bottomCorners[3].y,
          volume.bottomCorners[3].z,
          // Top face
          volume.topCorners[0].x,
          volume.topCorners[0].y,
          volume.topCorners[0].z,
          volume.topCorners[1].x,
          volume.topCorners[1].y,
          volume.topCorners[1].z,
          volume.topCorners[2].x,
          volume.topCorners[2].y,
          volume.topCorners[2].z,
          volume.topCorners[3].x,
          volume.topCorners[3].y,
          volume.topCorners[3].z,
        ]);

        // Define faces for the box geometry
        const indices = new Uint16Array([
          // Top face
          0, 1, 2, 2, 1, 3,
          // Bottom face
          4, 6, 5, 6, 7, 5,
          // Front face (assuming corners are ordered properly)
          5, 4, 0, 1, 5, 0,
          // Back face
          2, 6, 7, 2, 7, 3,
          // Left face
          1, 3, 7, 1, 7, 5,
          // Right face
          0, 4, 6, 0, 6, 2,
        ]);

        return (
          <mesh key={index}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[vertices, 3]} />
              <bufferAttribute attach="index" args={[indices, 1]} />
            </bufferGeometry>
            <meshBasicMaterial color={color} opacity={0.6} transparent />
          </mesh>
        );
      })}

      <axesHelper args={[75]} />
      <gridHelper rotateY={Math.PI / 2} args={[200, 20]} />
    </>
  );
}
