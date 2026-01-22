import { useState, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import { useAnimationData } from "@/hooks/nodeDataHook";
import * as THREE from "three";
import { converter, interpolate } from "culori";
import { DoubleSide } from "three";

const amber400 = "oklch(82.8% 0.189 84.429)";
const red700 = "oklch(50.5% 0.213 27.518)";
const colorMap = interpolate([amber400, red700], "oklab");
const rgbConverter = converter("rgb");

interface FloorVolumeData {
  frameIndex: number;
  time: number;
  cornerNodes: Array<{
    nodeId: string;
    position: [number, number, number];
    displacement: [number, number, number];
  }>;
  averageDisplacement: [number, number, number];
}

function TimeFloorPlane({
  floorData,
  yPosition,
  maxDisplacement,
  offsetX,
  offsetZ,
  scale = 1,
  initialCornerPositions,
}: {
  floorData: FloorVolumeData;
  yPosition: number;
  maxDisplacement: number;
  offsetX: number;
  offsetZ: number;
  scale?: number;
  initialCornerPositions: Map<string, [number, number, number]>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  if (!floorData.cornerNodes || floorData.cornerNodes.length !== 4) {
    return null;
  }

  // Map corner nodes to correct positions (NW, NE, SE, SW)
  const cornerMap = useMemo(() => {
    const corners: { [key: string]: number } = {};
    floorData.cornerNodes.forEach((node, index) => {
      // The node mapping CSV gives us NW, SW, NE, SE ordering
      // We need to map to NW, NE, SE, SW for proper triangle winding
      if (node.nodeId.includes("NW")) corners.NW = index;
      else if (node.nodeId.includes("NE")) corners.NE = index;
      else if (node.nodeId.includes("SE")) corners.SE = index;
      else if (node.nodeId.includes("SW")) corners.SW = index;
    });
    return corners;
  }, [floorData.cornerNodes]);

  if (!cornerMap.NW || !cornerMap.NE || !cornerMap.SE || !cornerMap.SW) {
    // Fallback to index ordering if corner mapping fails
    cornerMap.NW = 0;
    cornerMap.NE = 1;
    cornerMap.SE = 2;
    cornerMap.SW = 3;
  }

  // Apply centering and scale to positions using BuildingScene logic
  const positions = useMemo(() => {
    const nw = floorData.cornerNodes[cornerMap.NW];
    const ne = floorData.cornerNodes[cornerMap.NE];
    const se = floorData.cornerNodes[cornerMap.SE];
    const sw = floorData.cornerNodes[cornerMap.SW];

    // Get initial positions from frame 0
    const nwInitial = initialCornerPositions.get(nw.nodeId) || [0, 0, 0];
    const neInitial = initialCornerPositions.get(ne.nodeId) || [0, 0, 0];
    const seInitial = initialCornerPositions.get(se.nodeId) || [0, 0, 0];
    const swInitial = initialCornerPositions.get(sw.nodeId) || [0, 0, 0];

    // Calculate displacement from initial position and apply scale like BuildingScene
    const nwPos = [
      nwInitial[0] + nw.displacement[0] * scale + offsetX,
      yPosition,
      nwInitial[2] + nw.displacement[2] * scale + offsetZ,
    ];
    const nePos = [
      neInitial[0] + ne.displacement[0] * scale + offsetX,
      yPosition,
      neInitial[2] + ne.displacement[2] * scale + offsetZ,
    ];
    const sePos = [
      seInitial[0] + se.displacement[0] * scale + offsetX,
      yPosition,
      seInitial[2] + se.displacement[2] * scale + offsetZ,
    ];
    const swPos = [
      swInitial[0] + sw.displacement[0] * scale + offsetX,
      yPosition,
      swInitial[2] + sw.displacement[2] * scale + offsetZ,
    ];

    return new Float32Array([
      // Triangle 1: NE, NW, SE (following BuildingScene pattern)
      ...nePos,
      ...nwPos,
      ...sePos,
      // Triangle 2: NE, SE, SW
      ...nePos,
      ...sePos,
      ...swPos,
    ]);
  }, [floorData.cornerNodes, cornerMap, offsetX, offsetZ, scale, yPosition, initialCornerPositions]);

  // Calculate colors based on displacement using same method as BuildingScene
  const colors = useMemo(() => {
    const colorArray = new Float32Array(18); // 6 vertices * 3 colors

    // Triangle 1: NE, NW, SE
    const neNode = floorData.cornerNodes[cornerMap.NE];
    const nwNode = floorData.cornerNodes[cornerMap.NW];
    const seNode = floorData.cornerNodes[cornerMap.SE];
    const swNode = floorData.cornerNodes[cornerMap.SW];

    const nodes = [neNode, nwNode, seNode, neNode, seNode, swNode];

    nodes.forEach((node, i) => {
      const displacement = Math.hypot(...node.displacement);
      const color = rgbConverter(colorMap(displacement / maxDisplacement));
      colorArray[i * 3] = color.r;
      colorArray[i * 3 + 1] = color.g;
      colorArray[i * 3 + 2] = color.b;
    });

    return colorArray;
  }, [floorData.cornerNodes, cornerMap, maxDisplacement]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, [positions, colors]);

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshBasicMaterial vertexColors transparent opacity={0.8} side={DoubleSide} fog={false} toneMapped={false} />
    </mesh>
  );
}

function FloorVolumeScene({
  selectedStory,
  maxFrames,
  displacementScale = 1,
  maxHeight = 50,
}: {
  selectedStory: string;
  maxFrames: number;
  displacementScale?: number;
  maxHeight?: number;
}) {
  const { animationData } = useAnimationData();

  const floorVolumeData = useMemo(() => {
    if (!animationData) return [];

    return animationData.frames
      .map((frame, frameIndex) => {
        const storyData = frame.stories.get(selectedStory);
        if (!storyData) return null;

        const cornerNodes = storyData.nodeIds.map((nodeId) => ({
          nodeId,
          position: frame.nodePositions.get(nodeId) || [0, 0, 0],
          displacement: frame.nodeDisplacements.get(nodeId) || [0, 0, 0],
        }));

        return {
          frameIndex,
          time: frame.time,
          cornerNodes,
          averageDisplacement: storyData.averageDisplacement,
        };
      })
      .filter(Boolean) as FloorVolumeData[];
  }, [animationData, selectedStory]);

  // Performance optimization: only render subset of frames for better performance
  const { renderData, timeScale } = useMemo(() => {
    if (!floorVolumeData.length) return { renderData: [], timeScale: 0.1 };

    // Adaptive sampling based on total frames
    const step = Math.max(1, Math.floor(floorVolumeData.length / maxFrames));
    const sampledData = floorVolumeData.filter((_, index) => index % step === 0);

    // Adjust time scale based on max height and ORIGINAL data length (not sampled length)
    const originalLength = floorVolumeData.length;
    const scale = originalLength > 1 ? maxHeight / (originalLength - 1) : 0.1;

    return { renderData: sampledData, timeScale: scale };
  }, [floorVolumeData, maxFrames, maxHeight]);

  if (!animationData || renderData.length === 0) {
    return null;
  }

  const maxDisplacement = animationData.maxDisplacement;

  // Calculate centering offsets using same logic as BuildingScene
  const offsetX = (animationData.maxInitialPos[0] + animationData.minInitialPos[0]) / -2;
  const offsetZ = (animationData.maxInitialPos[2] + animationData.minInitialPos[2]) / -2;

  // Get initial positions from frame 0 for displacement calculation
  const initialCornerPositions = useMemo(() => {
    const initialFrame = animationData.frames[0];
    const storyData = initialFrame.stories.get(selectedStory);
    if (!storyData) return new Map();

    const positions = new Map<string, [number, number, number]>();
    storyData.nodeIds.forEach((nodeId) => {
      const pos = initialFrame.nodePositions.get(nodeId);
      if (pos) {
        positions.set(nodeId, pos);
      }
    });
    return positions;
  }, [animationData.frames, selectedStory]);

  return (
    <>
      {renderData.map((floorData) => (
        <TimeFloorPlane
          key={floorData.frameIndex}
          floorData={floorData}
          yPosition={floorData.frameIndex * timeScale}
          maxDisplacement={maxDisplacement}
          offsetX={offsetX}
          offsetZ={offsetZ}
          scale={displacementScale}
          initialCornerPositions={initialCornerPositions}
        />
      ))}

      {/* Ground plane reference */}
      {/* <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial color="#333333" transparent opacity={0.3} />
      </mesh> */}

      {/* Grid helper - same as BuildingScene */}
      <gridHelper rotation={[0, Math.PI / 2, 0]} args={[200, 20]} />

      {/* Axes helper for orientation */}
      <axesHelper args={[75]} />

      {/* Ground motion graph */}
      <GroundMotionGraph selectedStory={selectedStory} maxHeight={maxHeight} />

      <OrbitControls />
    </>
  );
}

function FloorSelector({
  selectedStory,
  onStoryChange,
}: {
  selectedStory: string;
  onStoryChange: (story: string) => void;
}) {
  const stories = useMemo(() => {
    return ["Roof", "15", "14", "13", "12", "11", "10", "9", "8", "7", "6", "5", "4", "3", "2", "Ground"];
  }, []);

  return (
    <div className="absolute top-4 left-4 z-10">
      <select
        value={selectedStory}
        onChange={(e) => onStoryChange(e.target.value)}
        className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        {stories.map((story) => (
          <option key={story} value={story}>
            Floor {story}
          </option>
        ))}
      </select>
    </div>
  );
}

function GroundMotionGraph({ selectedStory, maxHeight }: { selectedStory: string; maxHeight: number }) {
  const { animationData } = useAnimationData();

  const { graphPoints, graphColors } = useMemo(() => {
    if (!animationData) return { graphPoints: [], graphColors: [] };

    const frames = animationData.frames;
    const maxGroundMotion = Math.max(...frames.map((frame) => Math.hypot(...frame.groundMotion)));

    const points: [number, number, number][] = [];
    const colors: [number, number, number][] = [];

    // Use the same time scaling as the volume
    const totalFrames = frames.length;
    const timeScale = totalFrames > 1 ? maxHeight / (totalFrames - 1) : 0.1;

    frames.forEach((frame, index) => {
      const groundMotionMag = Math.hypot(...frame.groundMotion);
      const normalizedMotion = groundMotionMag / maxGroundMotion;

      // Position: X for magnitude, Y for time (scaled to match volume), Z for depth
      const x = normalizedMotion * 10; // Scale for visibility
      const y = index * timeScale; // Match volume's time progression
      const z = -20; // Position to the side of volume

      points.push([x, y, z]);

      // Color based on magnitude
      const color = rgbConverter(colorMap(normalizedMotion));
      colors.push([color.r, color.g, color.b]);
    });

    return { graphPoints: points, graphColors: colors };
  }, [animationData, selectedStory, maxHeight]);

  if (!animationData || graphPoints.length === 0) {
    return null;
  }

  // Calculate offsets to position the graph
  const offsetX = (animationData.maxInitialPos[0] + animationData.minInitialPos[0]) / 4;
  // const offsetY = -animationData.minInitialPos[1];
  const offsetY = 0;
  const offsetZ = 0;

  return (
    <mesh position={[offsetX, offsetY, offsetZ]}>
      <Line points={graphPoints} vertexColors={graphColors} lineWidth={2} fog={false} toneMapped={false} />
    </mesh>
  );
}

function VolumeControls({
  maxFrames,
  onMaxFramesChange,
  displacementScale,
  onDisplacementScaleChange,
  maxHeight,
  onMaxHeightChange,
}: {
  maxFrames: number;
  onMaxFramesChange: (value: number) => void;
  displacementScale: number;
  onDisplacementScaleChange: (value: number) => void;
  maxHeight: number;
  onMaxHeightChange: (value: number) => void;
}) {
  return (
    <div className="absolute top-4 right-4 z-10 bg-white bg-opacity-90 rounded-md p-3 text-sm space-y-3">
      <div>
        <label className="block font-medium mb-2">Time Resolution</label>
        <input
          type="range"
          min="10"
          max="500"
          step="10"
          value={maxFrames}
          onChange={(e) => onMaxFramesChange(Number(e.target.value))}
          className="w-32"
        />
        <div className="text-xs text-gray-600 mt-1">{maxFrames} frames</div>
      </div>

      <div>
        <label className="block font-medium mb-2">Max Height</label>
        <input
          type="range"
          min="50"
          max="500"
          step="0.5"
          value={maxHeight}
          onChange={(e) => onMaxHeightChange(Number(e.target.value))}
          className="w-32"
        />
        <div className="text-xs text-gray-600 mt-1">{maxHeight.toFixed(1)} units</div>
      </div>

      <div>
        <label className="block font-medium mb-2">Displacement Scale</label>
        <input
          type="range"
          min="0.1"
          max="25"
          step="0.1"
          value={displacementScale}
          onChange={(e) => onDisplacementScaleChange(Number(e.target.value))}
          className="w-32"
        />
        <div className="text-xs text-gray-600 mt-1">{displacementScale.toFixed(1)}x</div>
      </div>
    </div>
  );
}

export default function FloorTimeVolumePage() {
  const [selectedStory, setSelectedStory] = useState("8"); // Default to middle floor
  const [maxFrames, setMaxFrames] = useState(100); // Default performance setting
  const [displacementScale, setDisplacementScale] = useState(1); // Displacement scaling
  const [maxHeight, setMaxHeight] = useState(100); // Max height of volume

  return (
    <div className="w-full h-screen relative">
      <FloorSelector selectedStory={selectedStory} onStoryChange={setSelectedStory} />

      <VolumeControls
        maxFrames={maxFrames}
        onMaxFramesChange={setMaxFrames}
        displacementScale={displacementScale}
        onDisplacementScaleChange={setDisplacementScale}
        maxHeight={maxHeight}
        onMaxHeightChange={setMaxHeight}
      />

      <Canvas
        camera={{
          position: [50, 25, 50],
          fov: 60,
          near: 0.1,
          far: 1000,
        }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />

        <FloorVolumeScene
          selectedStory={selectedStory}
          maxFrames={maxFrames}
          displacementScale={displacementScale}
          maxHeight={maxHeight}
        />
      </Canvas>

      <div className="absolute bottom-4 left-4 text-white text-sm bg-black bg-opacity-50 p-2 rounded">
        <div>Floor: {selectedStory}</div>
        <div>Y-axis represents time progression</div>
        <div>Rendering: {maxFrames} time samples</div>
        <div>Max height: {maxHeight} units</div>
        <div>Displacement scale: {displacementScale.toFixed(1)}x</div>
      </div>
    </div>
  );
}
