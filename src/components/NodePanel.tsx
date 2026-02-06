import { usePlayback } from "@/components/playback/PlaybackContext";
import { useAnimationData } from "@/hooks/nodeDataHook";
import { type IDockviewPanelHeaderProps, type IDockviewPanelProps } from "dockview";
import { XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Vector3 } from "three";
import { MiniRibbon } from "./MiniRibbon";

export function NodePanel(props: IDockviewPanelProps<{ nodeId: number }>) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();

  // Get node data via params passed from the Context
  const nodeId = props.params.nodeId;

  const initialPos = animationData.initialPositions.at(nodeId);
  const currentDisp = animationData.displacement.atFrame(frameIndex).at(nodeId);
  const currentPos = [initialPos[0] + currentDisp[0], initialPos[1] + currentDisp[1], initialPos[2] + currentDisp[2]];
  const displacementMag = Math.hypot(currentDisp[0], currentDisp[1], currentDisp[2]);

  const ribbonPath = useMemo(() => {
    const path = new Array(animationData.metadata.frameCount).fill(null).map(() => new Vector3(0, 0, 0));

    for (let i = 0; i < animationData.metadata.frameCount; i++) {
      const pos = animationData.displacement.atFrame(i).at(nodeId);
      path[i] = new Vector3(pos[0], pos[1], pos[2]);
    }

    return path;
  }, [animationData.metadata.frameCount, animationData.displacement, nodeId]);

  // Structural Helpers
  const storyInfo = useMemo(() => {
    for (const [storyName, nodeIds] of Object.entries(animationData.metadata.stories)) {
      if (nodeIds.includes(nodeId)) {
        return { story: storyName, height: animationData.metadata.storyHeights[storyName] };
      }
    }
    return { story: "Unknown", height: 0 };
  }, [nodeId, animationData]);

  const cornerInfo = useMemo(() => {
    for (const [cornerName, nodeIds] of Object.entries(animationData.metadata.corners)) {
      if (nodeIds.includes(nodeId)) return cornerName;
    }
    return "Interior";
  }, [nodeId, animationData]);

  return (
    <div className="h-full w-full flex flex-col bg-white/95 backdrop-blur-sm border border-neutral-200 shadow-xl overflow-hidden rounded-lg">
      <AnimatePresence>
        <motion.div
          className="p-3 space-y-2 text-xs flex-1 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium text-neutral-700">Corner:</span>
              <div className="text-neutral-600">{cornerInfo}</div>
            </div>
            <div>
              <span className="font-medium text-neutral-700">Height:</span>
              <div className="text-neutral-600">{storyInfo.height.toFixed(1)}"</div>
            </div>
          </div>

          <div className="border-t pt-2">
            <span className="font-medium text-neutral-700">Position (inches):</span>
            <div className="text-neutral-600 font-mono">
              X: {currentPos[0].toFixed(3)}
              <br />
              Y: {currentPos[1].toFixed(3)}
              <br />
              Z: {currentPos[2].toFixed(3)}
            </div>
          </div>

          <div className="border-t pt-2">
            <span className="font-medium text-neutral-700">Displacement:</span>
            <div className="text-neutral-600 font-mono">
              Total: {displacementMag.toFixed(3)}"<br />
              X: {currentDisp[0].toFixed(3)}"<br />
              Y: {currentDisp[1].toFixed(3)}"<br />
              Z: {currentDisp[2].toFixed(3)}"
            </div>
          </div>

          <div className="border-t pt-2">
            <span className="font-medium text-neutral-700">Ribbons:</span>
            <div className="text-neutral-600 font-mono">
              <MiniRibbon path={ribbonPath} />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function NodeTab(props: IDockviewPanelHeaderProps<{ nodeId: number }>) {
  const nodeId = props.params.nodeId;

  const handleClose = () => {
    props.api.close();
  };

  return (
    <div className="flex items-center justify-between bg-neutral-100/50 px-3 py-2 border-b border-neutral-200 cursor-grab active:cursor-grabbing">
      <div className="flex items-center gap-2 pointer-events-none">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <span className="text-sm font-medium text-neutral-800">Node {nodeId}</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={handleClose}
          className="p-1 hover:bg-red-100 rounded transition-colors text-neutral-600 hover:text-red-600">
          <XIcon className="size-3" />
        </button>
      </div>
    </div>
  );
}
