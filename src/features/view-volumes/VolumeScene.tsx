import { formatHex, interpolate } from "culori";
import { Vector3 } from "three";
import { useAnimationData } from "@/lib/useAnimationData";
import { usePlayback } from "@/features/playback/PlaybackContext";

const amber400 = "oklch(82.8% 0.189 84.429)";
const red700 = "oklch(50.5% 0.213 27.518)";
const colorMap = interpolate([amber400, red700], "oklab");

interface VolumeData {
  bottomCorners: Vector3[];
  topCorners: Vector3[];
  averageDisplacement: [number, number, number];
}

export function VolumeScene({ scale, displacementScale }: { scale: number; displacementScale: number }) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();

  const { stories, storyOrder, corners } = animationData.metadata;

  const offsetX = -animationData.precomputed.boundingBox.center[0];
  const offsetY = -animationData.precomputed.boundingBox.center[1];
  const offsetZ = -animationData.precomputed.boundingBox.min[2];

  const maxDisplacement = animationData.precomputed.maxDisplacement;

  // Create corner sets for quick lookup
  const cornerSets = {
    NW: new Set(corners.NW),
    NE: new Set(corners.NE),
    SW: new Set(corners.SW),
    SE: new Set(corners.SE),
  };

  // Create volumes between consecutive floors
  const volumes: VolumeData[] = [];

  for (let i = 0; i < storyOrder.length - 1; i++) {
    const currentStoryId = storyOrder[i];
    const nextStoryId = storyOrder[i + 1];

    const currentNodeIndices = stories[currentStoryId];
    const nextNodeIndices = stories[nextStoryId];

    // Get corner node indices for each story
    const currentCornerIndices = currentNodeIndices.filter(
      (idx) => cornerSets.NW.has(idx) || cornerSets.NE.has(idx) || cornerSets.SW.has(idx) || cornerSets.SE.has(idx),
    );

    const nextCornerIndices = nextNodeIndices.filter(
      (idx) => cornerSets.NW.has(idx) || cornerSets.NE.has(idx) || cornerSets.SW.has(idx) || cornerSets.SE.has(idx),
    );

    // Get node positions for current floor (bottom corners)
    const bottomNodePositions = currentCornerIndices.map((nodeIdx) => {
      const initialPos = animationData.initialPositions.at(nodeIdx);
      const displacement = animationData.displacementLin.atFrame(frameIndex).at(nodeIdx);

      const posX = initialPos[0] + displacement[0] * displacementScale + offsetX;
      const posY = initialPos[1] + displacement[1] + offsetY;
      const posZ = initialPos[2] + displacement[2] * displacementScale + offsetZ;

      return new Vector3(posX * scale, posY * scale, posZ * scale);
    });

    // Get node positions for next floor (top corners)
    const topNodePositions = nextCornerIndices.map((nodeIdx) => {
      const initialPos = animationData.initialPositions.at(nodeIdx);
      const displacement = animationData.displacementLin.atFrame(frameIndex).at(nodeIdx);

      const posX = initialPos[0] + displacement[0] * displacementScale + offsetX;
      const posY = initialPos[1] + displacement[1] + offsetY;
      const posZ = initialPos[2] + displacement[2] * displacementScale + offsetZ;

      return new Vector3(posX * scale, posY * scale, posZ * scale);
    });

    // Calculate average displacement for this volume
    let currentTotalDx = 0,
      currentTotalDy = 0,
      currentTotalDz = 0;
    let nextTotalDx = 0,
      nextTotalDy = 0,
      nextTotalDz = 0;

    for (const nodeIdx of currentNodeIndices) {
      const disp = animationData.displacementLin.atFrame(frameIndex).at(nodeIdx);
      currentTotalDx += disp[0];
      currentTotalDy += disp[1];
      currentTotalDz += disp[2];
    }

    for (const nodeIdx of nextNodeIndices) {
      const disp = animationData.displacementLin.atFrame(frameIndex).at(nodeIdx);
      nextTotalDx += disp[0];
      nextTotalDy += disp[1];
      nextTotalDz += disp[2];
    }

    const avgDisp: [number, number, number] = [
      (currentTotalDx / currentNodeIndices.length + nextTotalDx / nextNodeIndices.length) / 2,
      (currentTotalDy / currentNodeIndices.length + nextTotalDy / nextNodeIndices.length) / 2,
      (currentTotalDz / currentNodeIndices.length + nextTotalDz / nextNodeIndices.length) / 2,
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
      <gridHelper rotation={[Math.PI / 2, 0, 0]} args={[200, 20]} />
    </>
  );
}
