import { Line, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { converter, interpolate } from "culori";
import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { DoubleSide } from "three";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../../components/resizable";
import { useAnimationData } from "../../hooks/nodeDataHook";
import type { BuildingAnimationData } from "../../lib/parser";

const amber400 = "oklch(82.8% 0.189 84.429)";
const red700 = "oklch(50.5% 0.213 27.518)";
const colorMap = interpolate([amber400, red700], "oklab");
const rgbConverter = converter("rgb");

function BuildingScene({ animationData, frameIndex, scale, displacementScale }: { animationData: BuildingAnimationData; frameIndex: number; scale: number; displacementScale: number }) {
  const frame = animationData.frames[frameIndex];

  const initalPositions = animationData.frames[0].nodePositions;

  const offsetX = (animationData.maxInitialPos[0] + animationData.minInitialPos[0]) / -2;
  const offsetY = -animationData.minInitialPos[1];
  const offsetZ = (animationData.maxInitialPos[2] + animationData.minInitialPos[2]) / -2;

  const maxDisplacement = Math.hypot(...animationData.maxDisplacement);

  return (
    <>
      <ambientLight intensity={2} />
      <hemisphereLight intensity={0.5} groundColor="#1a1a1a" position={[0, 0, 100]} />
      {Array.from(frame.stories.entries()).map(([storyId, story]) => {
        const nodePositions = story.nodeIds.map((nodeId) => {
          const initalPos = initalPositions.get(nodeId)!;
          const position = frame.nodePositions.get(nodeId)!;

          const displacementX = position[0] - initalPos[0];
          const displacementY = position[1] - initalPos[1];
          const displacementZ = position[2] - initalPos[2];

          const posX = initalPos[0] + displacementX * displacementScale + offsetX;
          const posY = position[1] + offsetY;
          const posZ = initalPos[2] + displacementZ * displacementScale + offsetZ;

          const finalPosX = posX * scale;
          const finalPosY = posY * scale;
          const finalPosZ = posZ * scale;
          return { pos: [finalPosX, finalPosY, finalPosZ], disp: [displacementX, displacementY, displacementZ] };
        });

        const floorQuadPositions = new Float32Array([
          // Triangle 1
          ...nodePositions[1].pos,
          ...nodePositions[0].pos,
          ...nodePositions[2].pos,
          // Triangle 2
          ...nodePositions[1].pos,
          ...nodePositions[2].pos,
          ...nodePositions[3].pos,
        ]);

        const avgDisp = Math.hypot(...story.averageDisplacement);
        const floorColor = rgbConverter(colorMap(avgDisp / maxDisplacement));

        return (
          <React.Fragment key={storyId}>
            {nodePositions.map(({ pos, disp }, i) => {
              const displacement = Math.hypot(...disp);
              const color = rgbConverter(colorMap(displacement / maxDisplacement));
              return (
                <mesh key={i} position={[pos[0], pos[1], pos[2]]} scale={[2, 1, 2]}>
                  <boxGeometry args={[2, 2, 2]} />
                  <meshStandardMaterial color={[color.r, color.g, color.b]} />
                </mesh>
              );
            })}
            <mesh>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[floorQuadPositions, 3]} />
              </bufferGeometry>
              <meshStandardMaterial color={[floorColor.r, floorColor.g, floorColor.b]} opacity={0.3} transparent side={DoubleSide} />
            </mesh>
          </React.Fragment>
        );
      })}

      <InSceneGraph frameIndex={frameIndex} scale={scale} displacementScale={displacementScale} />

      <OrbitControls />
      <axesHelper args={[75]} />

      <gridHelper rotateY={Math.PI / 2} args={[200, 20]} />
    </>
  );
}

function InSceneGraph({ frameIndex }: { frameIndex: number; scale: number; displacementScale: number }) {
  const animationData = useAnimationData();
  const maxAvgDisp = Math.hypot(...animationData.maxAverageStoryDisplacement);

  const width = 20;
  const padding = 8;

  const offsetX = animationData.maxInitialPos[0] + (animationData.maxInitialPos[0] + animationData.minInitialPos[0]) / -2;
  const offsetY = animationData.minInitialPos[1] + -animationData.minInitialPos[1];
  const offsetZ = animationData.maxInitialPos[2] + (animationData.maxInitialPos[2] + animationData.minInitialPos[2]) / -2;

  const frame = animationData.frames[frameIndex];
  const stories = Array.from(animationData.frames[frameIndex].stories.values());
  const numStories = stories.length;

  const displacementPoints: [number, number, number][] = new Array(numStories);
  const displacementPointsColors: [number, number, number][] = new Array(numStories);
  const interStoryDriftPoints: [number, number, number][] = new Array(numStories);
  const interStoryDriftPointsColors: [number, number, number][] = new Array(numStories);

  const minY = animationData.minInitialPos[1];
  const getY = (nodeId: string) => frame.nodePositions.get(nodeId)![1];

  for (let i = 0; i < numStories; i++) {
    const story = stories[i];
    const nodeZero = story.nodeIds[0];
    const storyHeight = getY(nodeZero);

    // displacement point
    const displacement = Math.hypot(...story.averageDisplacement);
    const xDisp = (displacement / maxAvgDisp) * width;
    displacementPoints[i] = [xDisp, storyHeight - minY, 0];
    const c = rgbConverter(colorMap(displacement / maxAvgDisp));
    displacementPointsColors[i] = [c.r, c.g, c.b];

    // inter-story drift point
    if (i === 0) {
      interStoryDriftPoints[i] = [0, storyHeight - minY, 0];
      interStoryDriftPointsColors[i] = [0, 0, 0];
    } else {
      const prev = stories[i - 1];
      const prevHeight = getY(prev.nodeIds[0]);
      const prevDisp = Math.hypot(...prev.averageDisplacement);
      const drift = displacement - prevDisp;
      const ratio = drift / Math.abs(storyHeight - prevHeight);
      interStoryDriftPoints[i] = [ratio * width * width, storyHeight - minY, 0];
      interStoryDriftPointsColors[i] = [0, 0, 0];
    }
  }

  return (
    <mesh position={[offsetX + padding, offsetY, offsetZ]}>
      {/* <mesh position={[width / 2, height / 2, 0]}>
        <planeGeometry args={[width, height]} />
      </mesh> */}
      <Line points={displacementPoints} vertexColors={displacementPointsColors} lineWidth={2} />
      <Line position={[0, 0, -1]} points={interStoryDriftPoints} vertexColors={interStoryDriftPointsColors} lineWidth={2} />
    </mesh>
  );
}

export function View3d() {
  const animationData = useAnimationData();

  /**
   * Frame playback and animation controls
   */
  const [frameIndex, setFrameIndex] = useState(0);

  const requestedAnimationFrameRef = useRef<number>(null);
  const lastDisplayedFrameTimeRef = useRef<number>(0);
  const playbackStartFrameRef = useRef<number>(0);
  const playbackStartTimeRef = useRef<number>(0);

  const [playing, setPlaying] = useState(false);

  function handlePlayPause() {
    setPlaying(!playing);
    lastDisplayedFrameTimeRef.current = 0;
    playbackStartFrameRef.current = frameIndex;
    playbackStartTimeRef.current = performance.now();
    if (frameIndex === animationData.frames.length - 1) {
      setFrameIndex(0);
      playbackStartFrameRef.current = 0;
    }
  }

  useEffect(() => {
    if (!playing) {
      if (requestedAnimationFrameRef.current) {
        cancelAnimationFrame(requestedAnimationFrameRef.current);
      }
      return;
    }

    const animate = (currentTime: number) => {
      if (lastDisplayedFrameTimeRef.current === 0) {
        lastDisplayedFrameTimeRef.current = currentTime;
      }

      const deltaTime = currentTime - lastDisplayedFrameTimeRef.current;

      if (deltaTime >= 1000 / 30) {
        const expectedFrame = playbackStartFrameRef.current + ((currentTime - playbackStartTimeRef.current) / 1000) * animationData.frameRate;
        const frameIndex = Math.round(expectedFrame);
        if (frameIndex >= 0 && frameIndex < animationData.frames.length) {
          setFrameIndex(frameIndex);
        } else {
          setFrameIndex(animationData.frames.length - 1);
          setPlaying(false);
        }
        lastDisplayedFrameTimeRef.current = currentTime;
      }

      requestedAnimationFrameRef.current = requestAnimationFrame(animate);
    };

    requestedAnimationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestedAnimationFrameRef.current) {
        cancelAnimationFrame(requestedAnimationFrameRef.current);
      }
    };
  }, [playing, animationData.frames.length, frameIndex]);

  useEffect(() => {
    function windowKeydown(e: KeyboardEvent) {
      if (e.key === " ") handlePlayPause();
    }
    window.addEventListener("keydown", windowKeydown);

    return () => {
      window.removeEventListener("keydown", windowKeydown);
    };
  }, [handlePlayPause]);

  function timelineFrameChange(frameIndex: number | ((prevState: number) => number)) {
    if (typeof frameIndex === "number") {
      setFrameIndex(frameIndex);

      lastDisplayedFrameTimeRef.current = 0;
      playbackStartFrameRef.current = frameIndex;
      playbackStartTimeRef.current = performance.now();
    } else {
      setFrameIndex((prev) => {
        const newFrame = frameIndex(prev);
        lastDisplayedFrameTimeRef.current = 0;
        playbackStartFrameRef.current = newFrame;
        playbackStartTimeRef.current = performance.now();
        return newFrame;
      });
    }
  }

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
              <BuildingScene animationData={animationData} frameIndex={frameIndex} scale={scale} displacementScale={displacementScale} />
            </Canvas>

            <div className="absolute bottom-0 left-0 right-0 flex justify-between w-full border-t-2 border-neutral-300 bg-neutral-200/80 backdrop-blur-sm p-2">
              <div className="flex items-center gap-2">
                <button className="p-2 hover:-translate-y-1 transition-transform cursor-pointer" onClick={() => setFrameIndex(0)}>
                  <SkipBackIcon />
                </button>
                <div className="w-px h-1/2 bg-neutral-300" />
                <button className="p-2 hover:-translate-y-1 transition-transform cursor-pointer" onClick={handlePlayPause}>
                  {playing ? <PauseIcon /> : <PlayIcon />}
                </button>
                <div className="w-px h-1/2 bg-neutral-300" />
                <button className="p-2 hover:-translate-y-1 transition-transform cursor-pointer" onClick={() => setFrameIndex(animationData.frames.length - 1)}>
                  <SkipForwardIcon />
                </button>
              </div>
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
              <Timeline animationData={animationData} frameIndex={frameIndex} onFrameChange={timelineFrameChange} />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50}>
              <InterstoryDriftChart animationData={animationData} frameIndex={frameIndex} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function Timeline({ animationData, frameIndex, onFrameChange }: { animationData: BuildingAnimationData; frameIndex: number; onFrameChange: (index: number | ((prevState: number) => number)) => void }) {
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
  const argMaxDisp = avgDisplacements.indexOf(maxDisp);
  const argMinDisp = avgDisplacements.indexOf(minDisp);

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

  /**
   * Keyboard input
   */

  useEffect(() => {
    function windowKeydown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" && e.shiftKey) {
        onFrameChange((prev) => {
          if (argMaxDisp > argMinDisp) {
            if (prev > argMaxDisp) return argMaxDisp;
            else if (prev > argMinDisp) return argMinDisp;
          } else {
            // argMaxDisp < argMinDisp
            if (prev > argMinDisp) return argMinDisp;
            else if (prev > argMaxDisp) return argMaxDisp;
          }
          return 0;
        });
      } else if (e.key === "ArrowLeft") onFrameChange((prev) => Math.max(0, prev - 1));
      else if (e.key === "ArrowRight" && e.shiftKey) {
        onFrameChange((prev) => {
          if (argMaxDisp > argMinDisp) {
            if (prev < argMinDisp) return argMinDisp;
            else if (prev < argMaxDisp) return argMaxDisp;
          } else {
            // argMaxDisp < argMinDisp
            if (prev < argMaxDisp) return argMaxDisp;
            else if (prev < argMinDisp) return argMinDisp;
          }
          return animationData.frames.length - 1;
        });
      } else if (e.key === "ArrowRight") onFrameChange((prev) => Math.min(animationData.frames.length - 1, prev + 1));
    }
    window.addEventListener("keydown", windowKeydown);

    return () => {
      window.removeEventListener("keydown", windowKeydown);
    };
  }, [argMinDisp, argMaxDisp]);

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

function InterstoryDriftChart({ animationData, frameIndex }: { animationData: BuildingAnimationData; frameIndex: number }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });
  useEffect(() => {
    if (!panelRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => setSize({ width: entries[0].contentRect.width, height: entries[0].contentRect.height }));
    resizeObserver.observe(panelRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const frame = animationData.frames[frameIndex];
  const stories = Array.from(frame.stories.values()).sort((a, b) => {
    const yA = frame.nodePositions.get(a.nodeIds[0])![1];
    const yB = frame.nodePositions.get(b.nodeIds[0])![1];
    return yA - yB;
  });
  const initialFrame = animationData.frames[0];

  const drifts = useMemo(() => {
    return stories.map((story, i) => {
      const storyHeight = frame.nodePositions.get(story.nodeIds[0])![1] - animationData.minPos[1];
      const displacement = Math.hypot(...story.averageDisplacement);

      if (i === 0) {
        return { ratio: 0, height: storyHeight };
      } else {
        const prevStory = stories[i - 1];
        const prevHeight = frame.nodePositions.get(prevStory.nodeIds[0])![1];
        const prevDisp = Math.hypot(...prevStory.averageDisplacement);
        const drift = Math.abs(displacement - prevDisp);
        const interStoryHeight = Math.abs(storyHeight - prevHeight);
        return { ratio: drift / interStoryHeight, height: storyHeight };
      }
    });
  }, [frame, stories, initialFrame]);

  const maxRatio = Math.max(...drifts.map((d) => d.ratio), 0.002);
  const maxHeight = Math.max(...drifts.map((d) => d.height));

  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = size.width - padding.left - padding.right;
  const chartHeight = size.height - padding.top - padding.bottom;

  return (
    <div ref={panelRef} className="h-full w-full relative">
      <div className="absolute top-0 inset-x-0">Inter-story Drift Ratio</div>
      <svg width="100%" height="100%">
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          <line x1="0" y1="0" x2="0" y2={chartHeight} stroke="black" />
          {Array.from({ length: 5 }).map((_, i) => {
            const y = chartHeight - (i / 4) * chartHeight;
            const height = (i / 4) * maxHeight;
            return (
              <g key={i}>
                <line x1="-5" y1={y} x2="0" y2={y} stroke="black" />
                <text x="-8" y={y + 3} textAnchor="end" fontSize="10">
                  {height.toFixed(1)}m
                </text>
              </g>
            );
          })}

          {/* X Axis (Drift Ratio) */}
          <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="black" />
          {Array.from({ length: 5 }).map((_, i) => {
            const x = (i / 4) * chartWidth;
            const ratio = (i / 4) * maxRatio;
            return (
              <g key={i}>
                <line x1={x} y1={chartHeight} x2={x} y2={chartHeight + 5} stroke="black" />
                <text x={x} y={chartHeight + 15} textAnchor="middle" fontSize="10">
                  {ratio.toFixed(3)}
                </text>
              </g>
            );
          })}
          <text x={chartWidth / 2} y={size.height - padding.top} textAnchor="middle" fontSize="12">
            Drift Ratio (m/m)
          </text>

          {drifts.map((drift, i) => {
            const barY = chartHeight - (drift.height / maxHeight) * chartHeight;
            const barWidth = (drift.ratio / maxRatio) * chartWidth;
            const color = rgbConverter(colorMap(drift.ratio / maxRatio));
            return <rect key={i} x="0" y={barY} width={barWidth} height={chartHeight / drifts.length - 2} fill={`rgb(${color.r * 255},${color.g * 255},${color.b * 255})`} />;
          })}
        </g>
      </svg>
    </div>
  );
}
