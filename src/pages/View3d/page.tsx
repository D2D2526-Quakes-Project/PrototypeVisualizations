import { Canvas } from "@react-three/fiber";
import React, { useState } from "react";
import { PlaybackControls, usePlaybackControl } from "../../components/PlaybackControls";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../../components/resizable";
import { Timeline } from "../../components/Timeline";
import { BuildingScene } from "./BuildingScene";
import { InterstoryDriftChart } from "./InterstoryDriftChart";

export function View3d() {
  /**
   * Frame playback and animation controls
   */
  const playback = usePlaybackControl();

  /**
   * Displacement scales
   */
  const [scale, setScale] = useState(1);
  const [displacementScale, setDisplacementScale] = useState(1);

  function handleScaleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setScale(parseFloat(e.target.value));
  }
  function handleDisplacementScaleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDisplacementScale(parseFloat(e.target.value));
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ResizablePanelGroup direction="vertical">
        <ResizablePanel className="flex flex-col flex-1 min-h-0">
          <div className="relative w-full h-full">
            <Canvas camera={{ position: [50, 50, 50], fov: 75 }}>
              <BuildingScene frameIndex={playback.frameIndex} scale={scale} displacementScale={displacementScale} />
            </Canvas>

            <div className="absolute bottom-0 left-0 right-0 flex justify-between w-full border-t-2 border-neutral-300 bg-neutral-200/80 backdrop-blur-sm p-2">
              <PlaybackControls playback={playback} />
              <div className="flex items-center gap-2">
                <label className="flex gap-2 whitespace-nowrap">
                  <input type="range" min="0" max={1} step={0.1} value={scale} onChange={handleScaleChange} className="w-full" />
                  Scale: {scale.toFixed(2)}
                </label>
                <label className="flex gap-2 whitespace-nowrap">
                  <input type="range" min="0" max={20} step={0.1} value={displacementScale} onChange={handleDisplacementScaleChange} className="w-full" />
                  XZ: {displacementScale.toFixed(2)}
                </label>
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={30} minSize={20}>
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={50}>
              <Timeline frameIndex={playback.frameIndex} onFrameChange={playback.setFrameIndex} />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50}>
              <InterstoryDriftChart frameIndex={playback.frameIndex} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
