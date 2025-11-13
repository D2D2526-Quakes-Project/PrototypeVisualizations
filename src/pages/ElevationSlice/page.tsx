import { OrthographicCamera, Sphere } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import { Vector3 } from "three";
import { PlaybackControls, usePlaybackControl } from "../../components/PlaybackControls";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../../components/resizable";
import { SmallTimeline } from "../../components/SmallTimeline";
import { useAnimationData } from "../../hooks/nodeDataHook";

function SliceView({ frameIndex }: { sliceAxis: "X" | "Z"; frameIndex: number }) {
  const animationData = useAnimationData();

  const offsetX = (animationData.maxInitialPos[0] + animationData.minInitialPos[0]) / -2;
  const offsetY = -animationData.minInitialPos[1];
  const offsetZ = (animationData.maxInitialPos[2] + animationData.minInitialPos[2]) / -2;

  const nodesInSlice = [...animationData.nodes];

  return (
    <>
      <group position={[offsetX, offsetY, offsetZ]}>
        {nodesInSlice.map(([nodeId, nodeData]) => {
          const initialPos = nodeData.initial_pos;
          const currentPos = animationData.frames[frameIndex].nodePositions.get(nodeId)!;

          const displacement = new Vector3(...currentPos).sub(new Vector3(...initialPos));
          const dispMag = displacement.length();

          return (
            <group key={nodeId}>
              <Sphere args={[0.2]} position={currentPos}>
                <meshBasicMaterial color="dodgerblue" fog={false} toneMapped={false} />
              </Sphere>
              <arrowHelper args={[displacement.normalize(), new Vector3(...initialPos), dispMag * 10, 0.5]} />
            </group>
          );
        })}
      </group>

      {/* Inter-story Drift Gauges */}
      {/* This is a simplified example; a real implementation would group nodes by vertical lines */}
    </>
  );
}

export function ElevationSlice() {
  const playback = usePlaybackControl();

  const [sliceAxis, setSliceAxis] = useState<"X" | "Z">("X");

  return (
    <div className="flex h-full min-h-0">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={30} minSize={5} maxSize={40} className="flex">
          <div className="w-full p-4 flex flex-col gap-4 overflow-y-auto border-r-2 border-neutral-300">
            <h2 className="text-xl font-bold">Elevation Slice Analyzer</h2>
            <p className="text-sm text-neutral-600">Make a vertical cut through the building to analyze a single structural plane. Arrows represent displacement, scaled 10x for visibility.</p>

            <div className="flex flex-col gap-2">
              <span className="font-semibold">Slice Axis</span>
              <div className="flex gap-2">
                <button onClick={() => setSliceAxis("X")} className={`flex-1 p-2 rounded ${sliceAxis === "X" ? "bg-blue-500 text-white" : "bg-neutral-200"}`}>
                  X
                </button>
                <button onClick={() => setSliceAxis("Z")} className={`flex-1 p-2 rounded ${sliceAxis === "Z" ? "bg-blue-500 text-white" : "bg-neutral-200"}`}>
                  Z
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 h-8">
              <PlaybackControls playback={playback} />
              <SmallTimeline frameIndex={playback.frameIndex} onFrameChange={playback.setFrameIndex} />
            </div>
            <div className="text-center text-sm">Frame: {playback.frameIndex}</div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={70} className="min-h-0 flex h-full">
          <div className="relative w-full">
            <Canvas>
              <OrthographicCamera makeDefault zoom={sliceAxis === "X" ? 5 : 10} position={sliceAxis === "X" ? [0, 25, 100] : [100, 25, 0]} rotation={sliceAxis === "X" ? [0, 0, 0] : [0, Math.PI / 2, 0]} />
              <SliceView sliceAxis={sliceAxis} frameIndex={playback.frameIndex} />
              <gridHelper args={[100, 10]} />
            </Canvas>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
