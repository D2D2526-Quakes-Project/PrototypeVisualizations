import { OrthographicCamera, Sphere } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import { Vector3 } from "three";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/resizable";
import { usePlayback } from "@/components/playback/PlaybackContext";
import { useAnimationData } from "@/hooks/nodeDataHook";
import { SmallTimeline } from "@/components/SmallTimeline";

// { _sliceAxis }: { _sliceAxis: "X" | "Z" }
function SliceView() {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();

  const offsetX = -animationData.precomputed.boundingBox.center[0];
  const offsetY = -animationData.precomputed.boundingBox.min[1];
  const offsetZ = -animationData.precomputed.boundingBox.center[2];

  const nodeCount = animationData.metadata.nodeCount;

  return (
    <>
      <group position={[offsetX, offsetY, offsetZ]}>
        {Array.from({ length: nodeCount }).map((_, nodeIdx) => {
          const initialPos = animationData.initialPositions.at(nodeIdx);
          const displacement = animationData.displacement.atFrame(frameIndex).at(nodeIdx);

          const currentPos: [number, number, number] = [
            initialPos[0] + displacement[0],
            initialPos[1] + displacement[1],
            initialPos[2] + displacement[2],
          ];

          const displacementVec = new Vector3(displacement[0], displacement[1], displacement[2]);
          const dispMag = displacementVec.length();

          return (
            <group key={nodeIdx}>
              <Sphere args={[1]} position={currentPos}>
                <meshBasicMaterial color="dodgerblue" fog={false} toneMapped={false} />
              </Sphere>
              <arrowHelper args={[displacementVec.normalize(), new Vector3(...initialPos), dispMag * 10, 0.5]} />
            </group>
          );
        })}
      </group>
    </>
  );
}

export function ElevationSlice() {
  const { frameIndex } = usePlayback();
  const [sliceAxis, setSliceAxis] = useState<"X" | "Z">("X");

  return (
    <div className="flex h-full min-h-0">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={30} minSize={5} maxSize={40} className="flex">
          <div className="w-full p-4 flex flex-col gap-4 overflow-y-auto border-r-2 border-neutral-300">
            <h2 className="text-xl font-bold">Elevation Slice Analyzer</h2>
            <p className="text-sm text-neutral-600">
              Make a vertical cut through the building to analyze a single structural plane. Arrows represent
              displacement, scaled 10x for visibility.
            </p>

            <div className="flex flex-col gap-2">
              <span className="font-semibold">Slice Axis</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSliceAxis("X")}
                  className={`flex-1 p-2 rounded ${sliceAxis === "X" ? "bg-blue-500 text-white" : "bg-neutral-200"}`}>
                  X
                </button>
                <button
                  onClick={() => setSliceAxis("Z")}
                  className={`flex-1 p-2 rounded ${sliceAxis === "Z" ? "bg-blue-500 text-white" : "bg-neutral-200"}`}>
                  Z
                </button>
              </div>
            </div>
            <div className="h-8 shrink-0">
              <SmallTimeline />
            </div>
            <div className="text-center text-sm">Frame: {frameIndex}</div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={70} className="min-h-0 flex h-full">
          <div className="relative w-full">
            <Canvas>
              <OrthographicCamera
                makeDefault
                zoom={sliceAxis === "X" ? 5 : 10}
                position={sliceAxis === "X" ? [0, 25, 100] : [100, 25, 0]}
                rotation={sliceAxis === "X" ? [0, 0, 0] : [0, Math.PI / 2, 0]}
              />
              {/* _sliceAxis={sliceAxis} */}
              <SliceView />
              <gridHelper args={[100, 10]} />
            </Canvas>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
