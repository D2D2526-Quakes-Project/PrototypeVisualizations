import { useEffect, useRef, useState } from "react";
import { useAnimationData } from "@/lib/useAnimationData";
import { usePlayback } from "@/features/playback/PlaybackContext";
import { useViewStore } from "@/state";
import { isHingeMetric } from "@/lib/metrics";

export function SmallTimeline() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { animationData } = useAnimationData();

  const { frameIndex, setFrameIndex } = usePlayback();
  const currentMetric = useViewStore((s) => s.currentMetric);
  const hingeStaticMode = isHingeMetric(currentMetric);

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
  const scrubbingRef = useRef(false);

  useEffect(() => {
    if (hingeStaticMode) return;

    const svg = svgRef.current;
    if (!svg) return;

    const updateFrame = (clientX: number) => {
      const rect = svg.getBoundingClientRect();
      const x = clientX - rect.left;
      const relativeX = Math.max(0, Math.min(x, rect.width));
      const framePos = relativeX / rect.width;
      const newFrame = Math.round(framePos * (maxFrame + 1));
      setFrameIndex(Math.max(0, Math.min(newFrame, maxFrame)));
    };

    const handleMouseDown = (e: MouseEvent) => {
      scrubbingRef.current = true;
      updateFrame(e.clientX);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!scrubbingRef.current) return;
      updateFrame(e.clientX);
    };

    const handleMouseUp = () => {
      scrubbingRef.current = false;
    };

    svg.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      svg.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [hingeStaticMode, maxFrame, setFrameIndex]);

  /**
   * Graph data
   */

  const current = graphData.at(frameIndex) ?? 0;
  const playheadX = (frameIndex / maxFrame) * 100;
  const playheadY = (1 - (current - minGraphData) / displacementRange) * chartHeight;

  const playheadTransform = `translate(${playheadX}, ${playheadY})`;

  let linePoints = "";
  for (let i = 0; i < maxFrame; i++) {
    const d = graphData.at(i) ?? 0;
    const x = i / maxFrame;
    const y = 1 - (d - minGraphData) / displacementRange;
    linePoints += `${x * 100},${y * chartHeight} `;
  }
  const strokeColor = "stroke-amber-400";

  return (
    <div ref={panelRef} className="h-full w-full">
      <svg
        ref={svgRef}
        className={`select-none ${hingeStaticMode ? "cursor-not-allowed opacity-60" : "cursor-crosshair"}`}
        width="100%"
        viewBox={`0 0 100 ${viewBoxHeight}`}>
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
        {hingeStaticMode && (
          <text x="50" y="10" textAnchor="middle" className="fill-neutral-600 text-[4px]">
            Satic Hinges
          </text>
        )}
      </svg>
    </div>
  );
}
