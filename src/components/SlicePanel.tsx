import { usePlayback } from "@/components/playback/PlaybackContext";
import { useAnimationData } from "@/hooks/nodeDataHook";
import type { IDockviewPanelProps } from "dockview";
import { useMemo } from "react";

export function SlicePanel(props: IDockviewPanelProps<{ sliceId: string }>) {
  const { sliceId } = props.params;
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  
  const sliceData = useMemo(() => {
    const parts = sliceId.split('-');
    const storyId = parts[1];
    const nodeIds = animationData.metadata.stories[storyId] || [];
    
    let totalDisplacement = 0;
    let maxDisplacement = 0;
    let nodeCount = 0;
    
    for (const nodeId of nodeIds) {
      const disp = animationData.displacementLin.atFrame(frameIndex).at(nodeId);
      const mag = Math.hypot(disp[0], disp[1], disp[2]);
      totalDisplacement += mag;
      maxDisplacement = Math.max(maxDisplacement, mag);
      nodeCount++;
    }
    
    const avgDisplacement = nodeCount > 0 ? totalDisplacement / nodeCount : 0;
    const storyHeight = animationData.metadata.storyHeights[storyId] || 0;
    const elevation = animationData.precomputed.storyElevations[storyId] || 0;
    
    return {
      storyId,
      nodeCount,
      avgDisplacement,
      maxDisplacement,
      storyHeight,
      elevation,
    };
  }, [sliceId, animationData, frameIndex]);

  return (
    <div className="h-full w-full flex flex-col bg-white/95 backdrop-blur-sm border border-neutral-200 shadow-xl overflow-hidden p-3">
      <h3 className="font-bold text-sm mb-2">Floor {sliceData.storyId}</h3>
      
      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-medium text-neutral-700">Nodes:</span>
            <div className="text-neutral-600">{sliceData.nodeCount}</div>
          </div>
          <div>
            <span className="font-medium text-neutral-700">Story Height:</span>
            <div className="text-neutral-600">{(sliceData.storyHeight / 12).toFixed(1)} ft</div>
          </div>
          <div>
            <span className="font-medium text-neutral-700">Elevation:</span>
            <div className="text-neutral-600">{(sliceData.elevation / 12).toFixed(1)} ft</div>
          </div>
          <div>
            <span className="font-medium text-neutral-700">Avg Disp:</span>
            <div className="text-neutral-600">{sliceData.avgDisplacement.toFixed(3)}"</div>
          </div>
          <div>
            <span className="font-medium text-neutral-700">Max Disp:</span>
            <div className="text-neutral-600">{sliceData.maxDisplacement.toFixed(3)}"</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SliceTab(props: { sliceId: string; storyId: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b cursor-grab active:cursor-grabbing bg-neutral-100 border-neutral-300">
      <span className="text-sm font-semibold text-neutral-700">
        Floor {props.storyId}
      </span>
    </div>
  );
}
