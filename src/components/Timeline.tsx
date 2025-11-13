import React, { useEffect, useRef, useState, type MouseEvent } from "react";
import type { BuildingAnimationData } from "../lib/parser";
import { useAnimationData } from "../hooks/nodeDataHook";

export function Timeline({ frameIndex, onFrameChange }: { frameIndex: number; onFrameChange: (index: number | ((prevState: number) => number)) => void }) {
  const animationData = useAnimationData();

  const svgRef = useRef<SVGSVGElement>(null);

  /**
   * Displacement Data
   */

  const maxFrame = animationData.frames.length - 1;
  const [selectedDisplacementView, setSelectedDisplacementView] = useState("all");
  const avgDisplacements = animationData.frames.map((frame) => {
    switch (selectedDisplacementView) {
      case "x":
        return frame.averageDisplacement[0];
      case "y":
        return frame.averageDisplacement[1];
      case "z":
        return frame.averageDisplacement[2];
      default:
        return Math.hypot(...frame.averageDisplacement);
    }
  });

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

  const verticalPadding = 3;
  const viewBoxHeight = aspectRatio * 100;
  const chartHeight = viewBoxHeight - verticalPadding * 2;
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
  const playheadY = (1 - (avgDisplacements[frameIndex] - minDisp) / displacementRange) * chartHeight + verticalPadding;

  const playheadTransform = `translate(${playheadX}, ${playheadY})`;

  const linePoints = avgDisplacements.map((d, i) => `${(i / maxFrame) * 100},${(1 - (d - minDisp) / displacementRange) * chartHeight + verticalPadding}`).join(" ");
  let strokeColor;
  let fillColor;
  switch (selectedDisplacementView) {
    case "x":
      strokeColor = "stroke-red-400";
      fillColor = "fill-red-400";
      break;
    case "y":
      strokeColor = "stroke-green-400";
      fillColor = "fill-green-400";
      break;
    case "z":
      strokeColor = "stroke-blue-400";
      fillColor = "fill-blue-400";
      break;
    default:
      strokeColor = "stroke-amber-400";
      fillColor = "fill-amber-400";
      break;
  }

  return (
    <div ref={panelRef} className="flex flex-col border-t-2 border-neutral-300 relative h-full w-full">
      <div className="absolute top-0 inset-x-0 flex justify-between p-1">
        <div>
          Frame: {frameIndex + 1} / {maxFrame + 1} | Time: {animationData.timeSteps[frameIndex]?.toFixed(3)}s | Avg Displacement: {avgDisplacements[frameIndex]?.toFixed(2)}m
        </div>
        <div>
          <select className="bg-neutral-200 rounded-md p-1" value={selectedDisplacementView} onChange={(e) => setSelectedDisplacementView(e.target.value)}>
            <option value="all">All</option>
            <option value="x">X</option>
            <option value="y">Y</option>
            <option value="z">Z</option>
          </select>
        </div>
      </div>

      <svg ref={svgRef} className="select-none" width="100%" viewBox={`0 0 100 ${viewBoxHeight}`} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
        <line transform={playheadTransform} x1={0} y1="-100" x2={0} y2="100" className="stroke-neutral-300" strokeWidth="0.2" />
        <polyline points={linePoints} fill="none" className={strokeColor} strokeWidth="0.2" />
        <polygon points={linePoints + ` 100,${(1 - (0 - minDisp) / displacementRange) * chartHeight + verticalPadding} 0,${(1 - (0 - minDisp) / displacementRange) * chartHeight + verticalPadding}`} className={fillColor} opacity={0.2} />

        <g>
          {/* x labels */}
          {Array.from({ length: 16 }).map((_, i) => (
            <React.Fragment key={i}>
              <text x={(i / 15) * 100} y={chartHeight + 1.5 + verticalPadding} textAnchor="middle" className="text-neutral-300" fontSize={1}>
                {(i * maxFrame) / 15 / animationData.frameRate}
              </text>
              <line x1={(i / 15) * 100} y1={chartHeight + verticalPadding} x2={(i / 15) * 100} y2={0} className="stroke-neutral-300" strokeWidth="0.1" />
            </React.Fragment>
          ))}
        </g>

        {/* <circle transform={playheadTransform} r="0.3" className="fill-amber-500" /> */}
        <polygon transform={playheadTransform} points="-1,-1.4 1,-1.4 0,0" className="fill-amber-500" />
      </svg>
    </div>
  );
}
