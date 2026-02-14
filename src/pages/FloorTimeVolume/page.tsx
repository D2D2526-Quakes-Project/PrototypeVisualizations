import { useState, useMemo, useRef } from "react";
import { CanvasWithControls } from "@/components/CanvasWithControls";
import { useAnimationData } from "@/hooks/nodeDataHook";
import * as THREE from "three";
import { converter, interpolate } from "culori";
import { DoubleSide } from "three";
import { SmallTimeline } from "@/components/SmallTimeline";

const amber400 = "oklch(82.8% 0.189 84.429)";
const red700 = "oklch(50.5% 0.213 27.518)";
const colorMap = interpolate([amber400, red700], "oklab");
const rgbConverter = converter("rgb");

interface FloorVolumeData {
  frameIndex: number;
  time: number;
  cornerNodes: Array<{
    nodeIdx: number;
    position: [number, number, number];
    displacement: [number, number, number];
    corner: string;
  }>;
  averageDisplacement: [number, number, number];
}

function TimeFloorPlane({
  floorData,
  yPosition,
  maxDisplacement,
  offsetX,
  offsetZ,
}: {
  floorData: FloorVolumeData;
  yPosition: number;
  maxDisplacement: number;
  offsetX: number;
  offsetZ: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  if (!floorData.cornerNodes || floorData.cornerNodes.length !== 4) {
    return null;
  }

  // Apply centering to positions
  const positions = useMemo(() => {
    if (floorData.cornerNodes.length !== 4) return new Float32Array();

    const nodePositions = floorData.cornerNodes;

    const nw = nodePositions.find((n) => n.corner === "NW");
    const ne = nodePositions.find((n) => n.corner === "NE");
    const se = nodePositions.find((n) => n.corner === "SE");
    const sw = nodePositions.find((n) => n.corner === "SW");

    if (!nw || !ne || !se || !sw) return new Float32Array();

    const nwPos = [
      nw.position[0] + offsetX,
      yPosition,
      nw.position[2] + offsetZ,
    ];
    const nePos = [
      ne.position[0] + offsetX,
      yPosition,
      ne.position[2] + offsetZ,
    ];
    const sePos = [
      se.position[0] + offsetX,
      yPosition,
      se.position[2] + offsetZ,
    ];
    const swPos = [
      sw.position[0] + offsetX,
      yPosition,
      sw.position[2] + offsetZ,
    ];

    return new Float32Array([
      // Triangle 1: NE, NW, SE
      ...nePos,
      ...nwPos,
      ...sePos,
      // Triangle 2: NE, SE, SW
      ...nePos,
      ...sePos,
      ...swPos,
    ]);
  }, [floorData, offsetX, offsetZ, yPosition]);

  // Calculate colors based on displacement
  const colors = useMemo(() => {
    const colorArray = new Float32Array(18); // 6 vertices * 3 colors

    if (floorData.cornerNodes.length !== 4) return colorArray;

    const nodePositions = floorData.cornerNodes;

    const neNode = nodePositions.find((n) => n.corner === "NE");
    const nwNode = nodePositions.find((n) => n.corner === "NW");
    const seNode = nodePositions.find((n) => n.corner === "SE");
    const swNode = nodePositions.find((n) => n.corner === "SW");

    if (!neNode || !nwNode || !seNode || !swNode) return colorArray;

    const nodes = [neNode, nwNode, seNode, neNode, seNode, swNode];

    nodes.forEach((node, i) => {
      const displacement = Math.hypot(...node.displacement);
      const color = rgbConverter(colorMap(displacement / maxDisplacement));
      colorArray[i * 3] = color.r;
      colorArray[i * 3 + 1] = color.g;
      colorArray[i * 3 + 2] = color.b;
    });

    return colorArray;
  }, [floorData, maxDisplacement]);

  const geometry = useMemo(() => {
    if (positions.length === 0) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, [positions, colors]);

  if (!geometry) return null;

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

  const { stories } = animationData.metadata;
  const frameCount = animationData.metadata.frameCount;
  const dt = animationData.metadata.dt;

  const offsetX = -animationData.precomputed.boundingBox.center[0];
  const offsetZ = -animationData.precomputed.boundingBox.min[2];
  const maxDisplacement = animationData.precomputed.maxDisplacement;

  const floorVolumeData = useMemo(() => {
    const data: FloorVolumeData[] = [];

    for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
      const storyId = selectedStory;
      const nodeIndices = stories[storyId];

      if (!nodeIndices) continue;

      // Get only corner nodes
      const { corners } = animationData.metadata;
      const cornerNodes = nodeIndices
        .filter((idx) => 
          corners.NW.includes(idx) || corners.NE.includes(idx) || 
          corners.SW.includes(idx) || corners.SE.includes(idx)
        )
        .map((nodeIdx) => {
          const initialPos = animationData.initialPositions.at(nodeIdx);
          const displacement = animationData.displacementLin.atFrame(frameIdx).at(nodeIdx);

          let corner = "";
          if (corners.NW.includes(nodeIdx)) corner = "NW";
          else if (corners.NE.includes(nodeIdx)) corner = "NE";
          else if (corners.SW.includes(nodeIdx)) corner = "SW";
          else if (corners.SE.includes(nodeIdx)) corner = "SE";

          return {
            nodeIdx,
            position: [
              initialPos[0] + displacement[0] * displacementScale,
              initialPos[1] + displacement[1],
              initialPos[2] + displacement[2] * displacementScale,
            ] as [number, number, number],
            displacement: [displacement[0], displacement[1], displacement[2]] as [number, number, number],
            corner,
          };
        });

      // Calculate average displacement
      let totalDx = 0, totalDy = 0, totalDz = 0;
      for (const nodeIdx of nodeIndices) {
        const disp = animationData.displacementLin.atFrame(frameIdx).at(nodeIdx);
        totalDx += disp[0];
        totalDy += disp[1];
        totalDz += disp[2];
      }

      data.push({
        frameIndex: frameIdx,
        time: frameIdx * dt,
        cornerNodes,
        averageDisplacement: [
          totalDx / nodeIndices.length,
          totalDy / nodeIndices.length,
          totalDz / nodeIndices.length,
        ],
      });
    }

    return data;
  }, [animationData, selectedStory, displacementScale, frameCount, dt, stories]);

  // Performance optimization: only render subset of frames
  const { renderData, timeScale } = useMemo(() => {
    if (floorVolumeData.length === 0) return { renderData: [], timeScale: 0.1 };

    const step = Math.max(1, Math.floor(floorVolumeData.length / maxFrames));
    const sampledData = floorVolumeData.filter((_, index) => index % step === 0);

    const originalLength = floorVolumeData.length;
    const scale = originalLength > 1 ? maxHeight / (originalLength - 1) : 0.1;

    return { renderData: sampledData, timeScale: scale };
  }, [floorVolumeData, maxFrames, maxHeight]);

  if (renderData.length === 0) {
    return null;
  }

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
        />
      ))}

      <gridHelper rotation={[0, Math.PI / 2, 0]} args={[200, 20]} />
      <axesHelper args={[75]} />
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
  const { animationData } = useAnimationData();
  const storyOrder = animationData.metadata.storyOrder;

  return (
    <div className="absolute top-4 left-4 z-10">
      <select
        value={selectedStory}
        onChange={(e) => onStoryChange(e.target.value)}
        className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        {storyOrder.map((story) => (
          <option key={story} value={story}>
            Floor {story}
          </option>
        ))}
      </select>
    </div>
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
    <div className="absolute top-16 left-4 z-10 bg-white bg-opacity-90 rounded-md p-3 text-sm space-y-3">
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
  const { animationData } = useAnimationData();
  const storyOrder = animationData.metadata.storyOrder;
  const defaultStory = storyOrder[Math.floor(storyOrder.length / 2)] || "8";
  
  const [selectedStory, setSelectedStory] = useState(defaultStory);
  const [maxFrames, setMaxFrames] = useState(100);
  const [displacementScale, setDisplacementScale] = useState(1);
  const [maxHeight, setMaxHeight] = useState(100);

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

      <div className="absolute bottom-4 right-4 left-4 h-8 z-10">
        <SmallTimeline />
      </div>

      <CanvasWithControls>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />

        <FloorVolumeScene
          selectedStory={selectedStory}
          maxFrames={maxFrames}
          displacementScale={displacementScale}
          maxHeight={maxHeight}
        />
      </CanvasWithControls>

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
