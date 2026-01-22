import React, { useEffect, useRef, useState, type MouseEvent } from "react";
import { useAnimationData } from "../hooks/nodeDataHook";

export function Timeline({ frameIndex, onFrameChange }: { frameIndex: number; onFrameChange: (index: number | ((prevState: number) => number)) => void }) {
  const { animationData } = useAnimationData();

  const svgRef = useRef<SVGSVGElement>(null);

  /**
   * Displacement Data
   */

  const maxFrame = animationData.frames.length - 1;
  const [selectedDisplacementView, setSelectedDisplacementView] = useState("Ground Motion");
  const graphData = animationData.frames.map((frame) => {
    switch (selectedDisplacementView) {
      case "Avg. X Displacement":
        return frame.averageDisplacement[0];
      case "Avg. Y Displacement":
        return frame.averageDisplacement[1];
      case "Avg. Z Displacement":
        return frame.averageDisplacement[2];
      case "Avg. Displacement":
        return Math.hypot(...frame.averageDisplacement);
      case "X Ground Motion":
        return frame.groundMotion[0];
      case "Y Ground Motion":
        return frame.groundMotion[1];
      case "Z Ground Motion":
        return frame.groundMotion[2];
      case "Ground Motion":
      default:
        return Math.hypot(...frame.groundMotion);
    }
  });

  const maxGraphData = Math.max(...graphData);
  const minGraphData = Math.min(...graphData);

  const graphRange = maxGraphData - minGraphData;

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

  function handleMouseDown(e: MouseEvent<SVGSVGElement>) {
    setScrubbing(true);

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relativeX = Math.max(0, Math.min(x, rect.width));
    const framePos = relativeX / rect.width;
    const newFrame = Math.round(framePos * (maxFrame + 1));

    onFrameChange(newFrame);
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
  const playheadY = (1 - (graphData[frameIndex] - minGraphData) / graphRange) * chartHeight + verticalPadding;

  const playheadTransform = `translate(${playheadX}, ${playheadY})`;

  const linePoints = graphData.map((d, i) => `${(i / maxFrame) * 100},${(1 - (d - minGraphData) / graphRange) * chartHeight + verticalPadding}`).join(" ");
  // const linePoints = avgDisplacements.map((d, i) => `${(i / maxFrame) * 100},${(1 - (d - minDisp) / displacementRange) * chartHeight + verticalPadding}`).join(" ");
  let strokeColor;
  let fillColor;
  switch (selectedDisplacementView) {
    case "X Ground Motion":
    case "Avg. X Displacement":
      strokeColor = "stroke-red-400";
      fillColor = "fill-red-400";
      break;
    case "Y Ground Motion":
    case "Avg. Y Displacement":
      strokeColor = "stroke-green-400";
      fillColor = "fill-green-400";
      break;
    case "Z Ground Motion":
    case "Avg. Z Displacement":
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
          Frame: {frameIndex + 1} / {maxFrame + 1} | Time: {animationData.timeSteps[frameIndex]?.toFixed(3)}s | Value: {graphData[frameIndex]?.toFixed(2)}
        </div>
        <div>
          <select className="bg-neutral-200 rounded-md p-1" value={selectedDisplacementView} onChange={(e) => setSelectedDisplacementView(e.target.value)}>
            <optgroup label="Ground Motion">
              <option value="Ground Motion">Ground Motion</option>
              <option value="X Ground Motion">X Ground Motion</option>
              <option value="Y Ground Motion">Y Ground Motion</option>
              <option value="Z Ground Motion">Z Ground Motion</option>
            </optgroup>
            <optgroup label="Displacement">
              <option value="Avg. Displacement">Avg. Displacement</option>
              <option value="Avg. X Displacement">Avg. X Displacement</option>
              <option value="Avg. Y Displacement">Avg. Y Displacement</option>
              <option value="Avg. Z Displacement">Avg. Z Displacement</option>
            </optgroup>
          </select>
        </div>
      </div>

      <svg ref={svgRef} className="select-none" width="100%" viewBox={`0 0 100 ${viewBoxHeight}`} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
        <line transform={playheadTransform} x1={0} y1="-100" x2={0} y2="100" className="stroke-neutral-300" strokeWidth="0.2" />
        <polyline points={linePoints} fill="none" className={strokeColor} strokeWidth="0.2" />
        <polygon points={linePoints + ` 100,${(1 - (0 - minGraphData) / graphRange) * chartHeight + verticalPadding} 0,${(1 - (0 - minGraphData) / graphRange) * chartHeight + verticalPadding}`} className={fillColor} opacity={0.2} />

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
