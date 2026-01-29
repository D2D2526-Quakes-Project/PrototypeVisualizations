import { XIcon, MinusIcon, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useNodeSelection, type FloatingPanel } from "@/contexts/NodeSelectionContext";
import { useAnimationData } from "@/hooks/nodeDataHook";
import { usePlayback } from "@/components/playback/PlaybackContext";
import { UNIT_SCALE } from "@/lib/utils";

interface FloatingNodePanelProps {
  panel: FloatingPanel;
}

export function FloatingNodePanel({ panel }: FloatingNodePanelProps) {
  const { removeFloatingPanel, togglePanelMinimized, updatePanelPosition, bringToFront } = useNodeSelection();
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panelStart, setPanelStart] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Get node data
  const nodeId = panel.nodeId;
  const initialPos = animationData.initialPositions.at(nodeId);
  const currentDisp = animationData.displacement.at(frameIndex).at(nodeId);
  const currentPos = [
    initialPos[0] + currentDisp[0],
    initialPos[1] + currentDisp[1],
    initialPos[2] + currentDisp[2],
  ];
  const displacementMag = Math.hypot(currentDisp[0], currentDisp[1], currentDisp[2]);

  // Find which story this node belongs to
  const getStoryInfo = () => {
    for (const [storyName, nodeIds] of Object.entries(animationData.metadata.stories)) {
      if (nodeIds.includes(nodeId)) {
        const storyHeight = animationData.metadata.storyHeights[storyName];
        return { story: storyName, height: storyHeight };
      }
    }
    return { story: "Unknown", height: 0 };
  };

  // Find which corner this node belongs to
  const getCornerInfo = () => {
    for (const [cornerName, nodeIds] of Object.entries(animationData.metadata.corners)) {
      if (nodeIds.includes(nodeId)) {
        return cornerName;
      }
    }
    return "Interior";
  };

  const storyInfo = getStoryInfo();
  const cornerInfo = getCornerInfo();

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === panelRef.current || (e.target as HTMLElement).closest('.panel-header')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setPanelStart({ x: panel.position.x, y: panel.position.y });
      bringToFront(panel.id);
      e.preventDefault();
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      const newX = Math.max(0, Math.min(panelStart.x + deltaX, window.innerWidth - panel.size.width));
      const newY = Math.max(0, Math.min(panelStart.y + deltaY, window.innerHeight - (panel.isMinimized ? 40 : panel.size.height)));
      
      updatePanelPosition(panel.id, { x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, panelStart, panel.id, panel.size, updatePanelPosition]);

  return (
    <AnimatePresence>
      <motion.div
        ref={panelRef}
        className="absolute bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-neutral-200 overflow-hidden"
        style={{
          left: panel.position.x,
          top: panel.position.y,
          width: panel.size.width,
          height: panel.isMinimized ? 40 : panel.size.height,
          zIndex: panel.zIndex,
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.2 }}
        onMouseDown={handleMouseDown}
      >
        {/* Header */}
        <div className="panel-header flex items-center justify-between bg-neutral-100 px-3 py-2 border-b border-neutral-200 cursor-move">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-neutral-800">
              Node {nodeId}
            </span>
            <span className="text-xs text-neutral-500">
              Story {storyInfo.story}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePanelMinimized(panel.id);
              }}
              className="p-1 hover:bg-neutral-200 rounded transition-colors"
              title={panel.isMinimized ? "Maximize" : "Minimize"}
            >
              {panel.isMinimized ? (
                <Maximize2 className="size-3" />
              ) : (
                <MinusIcon className="size-3" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeFloatingPanel(panel.id);
              }}
              className="p-1 hover:bg-red-100 rounded transition-colors text-neutral-600 hover:text-red-600"
              title="Close"
            >
              <XIcon className="size-3" />
            </button>
          </div>
        </div>

        {/* Content */}
        <AnimatePresence>
          {!panel.isMinimized && (
            <motion.div
              className="p-3 space-y-2 text-xs"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium text-neutral-700">Corner:</span>
                  <div className="text-neutral-600">{cornerInfo}</div>
                </div>
                <div>
                  <span className="font-medium text-neutral-700">Height:</span>
                  <div className="text-neutral-600">{(storyInfo.height * UNIT_SCALE).toFixed(1)}"</div>
                </div>
              </div>

              <div className="border-t pt-2">
                <span className="font-medium text-neutral-700">Position (inches):</span>
                <div className="text-neutral-600 font-mono">
                  X: {currentPos[0].toFixed(3)}<br />
                  Y: {currentPos[1].toFixed(3)}<br />
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
                <div className="flex items-center justify-between">
                  <span className="font-medium text-neutral-700">Frame:</span>
                  <span className="text-neutral-600">{frameIndex} / {animationData.metadata.frameCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-neutral-700">Time:</span>
                  <span className="text-neutral-600">{(frameIndex * animationData.metadata.dt).toFixed(2)}s</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}