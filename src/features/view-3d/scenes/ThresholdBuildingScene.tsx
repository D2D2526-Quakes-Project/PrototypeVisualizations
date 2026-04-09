import { usePlayback } from "@/features/playback/PlaybackContext";
import { useAnimationData } from "@/lib/useAnimationData";
import { converter, formatHex, interpolate } from "culori";
import { DoubleSide } from "three";

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
  "oklab"
);
const rgbConverter = converter("rgb");

export function ThresholdBuildingScene() {
  const { animationData } = useAnimationData();
  const { storyOrder, cornerNodes } = animationData.metadata;
  const { storyDrift, peakStoryDrift } = animationData.precomputed;
  const { frameIndex } = usePlayback();

  const getNodePosition = (nodeIdx: number) => {
    const pos = animationData.initialPositions.at(nodeIdx);
    const displacement = animationData.displacementLin.atFrame(frameIndex).at(nodeIdx);

    return [pos[0] + displacement[0], pos[1] + displacement[1], pos[2] + displacement[2]];
  };

  return (
    <>
      {storyOrder.map((storyId, storyIndex) => {
        const corners = cornerNodes[storyId];
        if (!corners) return null;

        const drifts = storyDrift.getStoryDrift(storyIndex, frameIndex);
        const peaks = peakStoryDrift[storyId] ?? { NW: 0, NE: 0, SW: 0, SE: 0 };

        const cornerOrder = ["NW", "NE", "SW", "SE"] as const;
        const nodePositions = cornerOrder.map((corner) => {
          const nodeId = corners[corner];
          return {
            pos: getNodePosition(nodeId),
            drift: drifts[cornerOrder.indexOf(corner)],
            peak: peaks[corner],
          };
        });

        const positions = new Float32Array([
          ...nodePositions[0].pos,
          ...nodePositions[1].pos,
          ...nodePositions[2].pos,
          ...nodePositions[1].pos,
          ...nodePositions[3].pos,
          ...nodePositions[2].pos,
        ]);

        const colors = new Float32Array(18);
        const vertexOrder = [0, 1, 2, 1, 3, 2];

        vertexOrder.forEach((cornerIdx, i) => {
          const ratio = nodePositions[cornerIdx].drift / (nodePositions[cornerIdx].peak || 0.0001);
          const colorHex = formatHex(colorMap(ratio));
          const rgb = rgbConverter(colorHex);

          if (rgb) {
            colors[i * 3] = rgb.r;
            colors[i * 3 + 1] = rgb.g;
            colors[i * 3 + 2] = rgb.b;
          }
        });

        return (
          <mesh key={storyId}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[positions, 3]} />
              <bufferAttribute attach="attributes-color" args={[colors, 3]} />
            </bufferGeometry>
            <meshBasicMaterial
              vertexColors
              opacity={0.6}
              transparent
              side={DoubleSide}
              fog={false}
              toneMapped={false}
            />
          </mesh>
        );
      })}
    </>
  );
}
