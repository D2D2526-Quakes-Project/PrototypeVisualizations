import React, { useEffect, useRef, useState, type MouseEvent } from "react";
import { useAnimationData } from "../hooks/nodeDataHook";

const DisplacentViews = ["X Ground Motion", "Y Ground Motion", "Z Ground Motion", "Ground Motion"] as const;

export function Timeline({
  frameIndex,
  onFrameChange,
}: {
  frameIndex: number;
  onFrameChange: (index: number | ((prevState: number) => number)) => void;
}) {
  const { animationData } = useAnimationData();

  const svgRef = useRef<SVGSVGElement>(null);

  /**
   * Displacement Data
   */

  const maxFrame = animationData.metadata.frameCount - 1;
  const [selectedDisplacementView, setSelectedDisplacementView] =
    useState<(typeof DisplacentViews)[number]>("Ground Motion");

  const getDataAccessor = () => {
    switch (selectedDisplacementView) {
      case "X Ground Motion":
        return {
          accessor: animationData.groundMotion.xAt,
          min: animationData.precomputed.groundMotion.min[0],
          max: animationData.precomputed.groundMotion.max[0],
          strokeColor: "stroke-red-400",
          fillColor: "fill-red-400",
        };
      case "Y Ground Motion":
        return {
          accessor: animationData.groundMotion.yAt,
          min: animationData.precomputed.groundMotion.min[1],
          max: animationData.precomputed.groundMotion.max[1],
          strokeColor: "stroke-green-400",
          fillColor: "fill-green-400",
        };
      case "Z Ground Motion":
        return {
          accessor: animationData.groundMotion.zAt,
          min: animationData.precomputed.groundMotion.min[2],
          max: animationData.precomputed.groundMotion.max[2],
          strokeColor: "stroke-blue-400",
          fillColor: "fill-blue-400",
        };
      case "Ground Motion":
      default:
        return {
          accessor: (idx: number) => animationData.precomputed.groundMotion.magnitude.at(idx)!,
          min: animationData.precomputed.groundMotion.minMagnitude,
          max: animationData.precomputed.groundMotion.maxMagnitude,
          strokeColor: "stroke-amber-400",
          fillColor: "fill-amber-400",
        };
    }
  };

  const { accessor, min, max, strokeColor, fillColor } = getDataAccessor();
  const range = max - min;

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
  const playheadY = (1 - (accessor(frameIndex) - min) / range) * chartHeight + verticalPadding;

  const playheadTransform = `translate(${playheadX}, ${playheadY})`;

  console.log(max, min, range, chartHeight, verticalPadding, 1 - (accessor(frameIndex) - min) / range);

  let linePoints = "";
  for (let i = 0; i < maxFrame; i++) {
    const d = accessor(i);
    const x = i / maxFrame;
    const y = 1 - (d - min) / range;
    linePoints += `${x * 100},${y * chartHeight + verticalPadding} `;
  }

  return (
    <div ref={panelRef} className="flex flex-col border-t-2 border-neutral-300 relative h-full w-full">
      <div className="absolute top-0 inset-x-0 flex justify-between p-1">
        <div>
          Frame: {frameIndex + 1} / {maxFrame + 1} | Time: {(frameIndex * animationData.metadata.dt).toFixed(3)}s |
          Value: {accessor(frameIndex).toFixed(2)}
        </div>
        <div>
          <select
            className="bg-neutral-200 rounded-md p-1"
            value={selectedDisplacementView}
            onChange={(e) => setSelectedDisplacementView(e.target.value as (typeof DisplacentViews)[number])}>
            <optgroup label="Ground Motion">
              {DisplacentViews.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      <svg
        ref={svgRef}
        className="select-none"
        width="100%"
        viewBox={`0 0 100 ${viewBoxHeight}`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}>
        <line
          transform={playheadTransform}
          x1={0}
          y1="-100"
          x2={0}
          y2="100"
          className="stroke-neutral-300"
          strokeWidth="0.2"
        />
        <polyline points={linePoints} fill="none" className={strokeColor} strokeWidth="0.2" />
        <polygon
          points={
            linePoints +
            ` 100,${(1 - (0 - min) / range) * chartHeight + verticalPadding} 0,${(1 - (0 - min) / range) * chartHeight + verticalPadding}`
          }
          className={fillColor}
          opacity={0.2}
        />

        <g>
          {/* x labels */}
          {Array.from({ length: 16 }).map((_, i) => (
            <React.Fragment key={i}>
              <text
                x={(i / 15) * 100}
                y={chartHeight + 1.5 + verticalPadding}
                textAnchor="middle"
                className="text-neutral-300"
                fontSize={1}>
                {(i * maxFrame) / 15}
              </text>
              <line
                x1={(i / 15) * 100}
                y1={chartHeight + verticalPadding}
                x2={(i / 15) * 100}
                y2={0}
                className="stroke-neutral-300"
                strokeWidth="0.1"
              />
            </React.Fragment>
          ))}
        </g>

        {/* <circle transform={playheadTransform} r="0.3" className="fill-amber-500" /> */}
        <polygon transform={playheadTransform} points="-1,-1.4 1,-1.4 0,0" className="fill-amber-500" />
      </svg>
    </div>
  );
}
