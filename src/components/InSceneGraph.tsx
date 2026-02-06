// import { useAnimationData } from "@/hooks/nodeDataHook";
// import { Line } from "@react-three/drei";
// import { converter, interpolate } from "culori";

// const rgbConverter = converter("rgb");

// function InSceneGraph({ frameIndex, xdata, ydata, colorMap }: { frameIndex: number; xdata: number[]; ydata: number[]; colorMap: ReturnType<typeof interpolate> }) {
//   const { animationData } = useAnimationData();
//   const maxAvgDisp = animationData.maxAverageStoryDisplacement;

//   const width = 20;
//   const padding = 8;

//   const offsetX = animationData.maxInitialPos[0] + (animationData.maxInitialPos[0] + animationData.minInitialPos[0]) / -2;
//   const offsetY = animationData.minInitialPos[1] + -animationData.minInitialPos[1];
//   const offsetZ = animationData.maxInitialPos[2] + (animationData.maxInitialPos[2] + animationData.minInitialPos[2]) / -2;

//   const frame = animationData.frames[frameIndex];
//   const stories = Array.from(animationData.frames[frameIndex].stories.values());
//   const numStories = stories.length;

//   const displacementPoints: [number, number, number][] = new Array(numStories);
//   const displacementPointsColors: [number, number, number][] = new Array(numStories);

//   const minY = animationData.minInitialPos[1];
//   const getY = (nodeId: string) => frame.nodePositions.get(nodeId)![1];

//   for (let i = 0; i < numStories; i++) {
//     const story = stories[i];
//     const nodeZero = story.nodeIds[0];
//     const storyHeight = getY(nodeZero);

//     // displacement point
//     const displacement = Math.hypot(...story.averageDisplacement);
//     const xDisp = (displacement / maxAvgDisp) * width;
//     displacementPoints[i] = [xDisp, storyHeight - minY, 0];
//     const c = rgbConverter(colorMap(displacement / maxAvgDisp));
//     displacementPointsColors[i] = [c.r, c.g, c.b];
//   }

//   return (
//     <mesh position={[offsetX + padding, offsetY, offsetZ]}>
//       <Line points={displacementPoints} vertexColors={displacementPointsColors} lineWidth={2} fog={false} toneMapped={false} />
//     </mesh>
//   );
// }
