import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { BuildingAnimationData } from "../lib/parser";

export function SmallTimeline({ animationData, frameIndex, onFrameChange }: { animationData: BuildingAnimationData; frameIndex: number; onFrameChange: (index: number | ((prevState: number) => number)) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);

  /**
   * Displacement Data
   */

  const maxFrame = animationData.frames.length - 1;
  const avgDisplacements = animationData.frames.map((frame) => Math.hypot(...frame.averageDisplacement));

  const maxDisp = Math.max(...avgDisplacements);
  const minDisp = Math.min(...avgDisplacements);

  const displacementRange = maxDisp - minDisp;

  /**
   * Resize observer for the aspect ratio of the canvas
   */
  const [aspectRatio, setAspectRatio] = useState(0.3);

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!panelRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      setAspectRatio(entry.contentRect.height / entry.contentRect.width);
    });

    resizeObserver.observe(panelRef.current);

    const rect = panelRef.current.getBoundingClientRect();
    setAspectRatio(rect.height / rect.width);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  /**
   * Constants
   */

  const viewBoxHeight = aspectRatio * 100;
  const chartHeight = viewBoxHeight;
  const [scrubbing, setScrubbing] = useState(false);

  /**
   * Mouse input
   */

  function handleMouseDown() {
    setScrubbing(true);
  }
  function handleMouseUp() {
    setScrubbing(false);
  }

  function handleMouseMove(e: MouseEvent<SVGSVGElement>) {
    if (!scrubbing) return;

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relativeX = Math.max(0, Math.min(x, rect.width));
    const framePos = relativeX / rect.width;
    const newFrame = Math.round(framePos * (maxFrame + 1));

    onFrameChange(newFrame);
  }

  /**
   * Graph data
   */

  const playheadX = (frameIndex / maxFrame) * 100;
  const playheadY = (1 - (avgDisplacements[frameIndex] - minDisp) / displacementRange) * chartHeight;

  const playheadTransform = `translate(${playheadX}, ${playheadY})`;

  const linePoints = avgDisplacements.map((d, i) => `${(i / maxFrame) * 100},${(1 - (d - minDisp) / displacementRange) * chartHeight}`).join(" ");
  const strokeColor = "stroke-amber-400";

  return (
    <div ref={panelRef} className="h-full w-full">
      <svg ref={svgRef} className="select-none" width="100%" viewBox={`0 0 100 ${viewBoxHeight}`} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
        <line transform={playheadTransform} x1={0} y1="-100" x2={0} y2="100" className="stroke-neutral-300" strokeWidth="0.2" />
        <polyline points={linePoints} fill="none" className={strokeColor} strokeWidth="0.2" />
        <circle transform={playheadTransform} r=".5" className="fill-amber-500" />
      </svg>
    </div>
  );
}
