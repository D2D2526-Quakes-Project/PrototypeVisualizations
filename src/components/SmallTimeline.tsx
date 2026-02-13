import { useEffect, useRef, useState, useCallback, type MouseEvent } from "react";
import { useAnimationData } from "../hooks/nodeDataHook";
import { usePlayback } from "./playback/PlaybackContext";

export function SmallTimeline() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { animationData } = useAnimationData();

  const { frameIndex, setFrameIndex } = usePlayback();

  /**
   * Displacement Data
   */

  const maxFrame = animationData.metadata.frameCount - 1;
  const graphData = animationData.precomputed.groundMotion.magnitude;

  const maxGraphData = animationData.precomputed.groundMotion.maxMagnitude;
  const minGraphData = 0;

  const displacementRange = maxGraphData - minGraphData;

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

  const updateFrameFromEvent = useCallback((clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = clientX - rect.left;
    const relativeX = Math.max(0, Math.min(x, rect.width));
    const framePos = relativeX / rect.width;
    const newFrame = Math.round(framePos * (maxFrame + 1));

    setFrameIndex(Math.max(0, Math.min(newFrame, maxFrame)));
  }, [maxFrame, setFrameIndex]);

  /**
   * Mouse input
   */

  function handleMouseDown(e: MouseEvent<SVGSVGElement>) {
    setScrubbing(true);
    updateFrameFromEvent(e.clientX);
  }

  function handleMouseUp() {
    setScrubbing(false);
  }

  function handleMouseMove(e: MouseEvent<SVGSVGElement>) {
    if (!scrubbing) return;
    updateFrameFromEvent(e.clientX);
  }

  function handleMouseLeave() {
    setScrubbing(false);
  }

  // Global mouse event listeners for dragging outside the component
  useEffect(() => {
    if (!scrubbing) return;

    const handleGlobalMouseMove = (e: globalThis.MouseEvent) => {
      updateFrameFromEvent(e.clientX);
    };

    const handleGlobalMouseUp = () => {
      setScrubbing(false);
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("mousemove", handleGlobalMouseMove);

    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("mousemove", handleGlobalMouseMove);
    };
  }, [scrubbing, updateFrameFromEvent]);

  /**
   * Graph data
   */

  const current = graphData.at(frameIndex) ?? 0;
  const playheadX = maxFrame > 0 ? (frameIndex / maxFrame) * 100 : 0;
  const playheadY = displacementRange > 0 ? (1 - (current - minGraphData) / displacementRange) * chartHeight : chartHeight / 2;

  const playheadTransform = `translate(${playheadX}, ${playheadY})`;

  let linePoints = "";
  if (maxFrame > 0) {
    for (let i = 0; i <= maxFrame; i++) {
      const d = graphData.at(i) ?? 0;
      const x = i / maxFrame;
      const y = displacementRange > 0 ? 1 - (d - minGraphData) / displacementRange : 0.5;
      linePoints += `${x * 100},${y * chartHeight} `;
    }
  }
  const strokeColor = "stroke-amber-400";

  return (
    <div ref={panelRef} className="h-full w-full">
      <svg
        ref={svgRef}
        className="select-none cursor-crosshair"
        width="100%"
        viewBox={`0 0 100 ${viewBoxHeight}`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}>
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
        <circle transform={playheadTransform} r=".5" className="fill-amber-500" />
      </svg>
    </div>
  );
}
