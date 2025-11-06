import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon } from "lucide-react";
import React, { useEffect, useRef, useState, type MouseEvent } from "react";
import type { BuildingAnimationData } from "../../utils/parser";
import { useAnimationData } from "../../hooks/nodeDataHook";

function BuildingScene({ animationData, frameIndex, scale, displacementScale }: { animationData: BuildingAnimationData; frameIndex: number; scale: number; displacementScale: number }) {
  const frame = animationData.frames[frameIndex];

  const initalPositions = animationData.frames[0].nodePositions;

  const offsetX = (animationData.maxCoord[0] + animationData.minCoord[0]) / -2;
  const offsetY = -animationData.minCoord[1];
  const offsetZ = (animationData.maxCoord[2] + animationData.minCoord[2]) / -2;

  return (
    <>
      <ambientLight intensity={2} />
      <hemisphereLight intensity={0.5} groundColor="#1a1a1a" position={[0, 0, 100]} />
      {Array.from(frame.nodePositions.entries()).map(([nodeId, position]) => {
        const initalPos = initalPositions.get(nodeId)!;

        const posX = initalPos[0] + (position[0] - initalPos[0]) * displacementScale + offsetX;
        const posY = position[1] + offsetY;
        const posZ = initalPos[2] + (position[2] - initalPos[2]) * displacementScale + offsetZ;

        const finalPosX = posX * scale;
        const finalPosY = posY * scale;
        const finalPosZ = posZ * scale;

        return (
          <mesh key={nodeId} position={[finalPosX, finalPosY, finalPosZ]} scale={[2, 1, 2]}>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial color="#FD9A00" />
          </mesh>
        );
      })}

      <OrbitControls />

      <gridHelper rotateY={Math.PI / 2} args={[100, 100]} />
    </>
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
      if (e.key === " ") setPlaying((prev) => !prev);
    }
    window.addEventListener("keydown", windowKeydown);

    return () => {
      window.removeEventListener("keydown", windowKeydown);
    };
  }, []);

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
      <Canvas className="flex-1" camera={{ position: [50, 50, 50], fov: 75 }}>
        <BuildingScene animationData={animationData} frameIndex={frameIndex} scale={scale} displacementScale={displacementScale} />
      </Canvas>

      <div className="flex justify-between bg-neutral-200 w-full border-t-2 border-neutral-300">
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

      <MyTimeline animationData={animationData} frameIndex={frameIndex} onFrameChange={timelineFrameChange} />
    </div>
  );
}

function MyTimeline({ animationData, frameIndex, onFrameChange }: { animationData: BuildingAnimationData; frameIndex: number; onFrameChange: (index: number | ((prevState: number) => number)) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);

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
    return 0;
  });
  // const avgXDisplacements = avgDisplacements.map((d) => d[0]);
  // const avgYDisplacements = avgDisplacements.map((d) => d[1]);
  // const avgZDisplacements = avgDisplacements.map((d) => d[2]);
  // const avgAllDisplacements = avgDisplacements.map((d) => d[3]);

  const maxDisp = Math.max(...avgDisplacements);
  const minDisp = Math.min(...avgDisplacements);
  const argMaxDisp = avgDisplacements.indexOf(maxDisp);
  const argMinDisp = avgDisplacements.indexOf(minDisp);

  const displacementRange = maxDisp - minDisp;
  const aspectRatio = 0.3;
  const verticalPadding = 3;
  const [scrubbing, setScrubbing] = useState(false);

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

  const playheadX = (frameIndex / maxFrame) * 100;
  const playheadY = (1 - (avgDisplacements[frameIndex] - minDisp) / displacementRange) * aspectRatio * 100 + verticalPadding;

  const playheadTransform = `translate(${playheadX}, ${playheadY})`;

  const linePoints = avgDisplacements.map((d, i) => `${(i / maxFrame) * 100},${(1 - (d - minDisp) / displacementRange) * aspectRatio * 100 + verticalPadding}`).join(" ");
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
    <div className="flex flex-col border-t-2 border-neutral-300 relative">
      <div className="absolute top-0 inset-x-0 flex justify-between">
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

      <svg ref={svgRef} className="select-none" width="100%" viewBox={`0 0 100 ${aspectRatio * 100 + verticalPadding + verticalPadding}`} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
        <line transform={playheadTransform} x1={0} y1="-100" x2={0} y2="100" className="stroke-neutral-300" strokeWidth="0.2" />
        <polyline points={linePoints} fill="none" className={strokeColor} strokeWidth="0.2" />
        <polygon points={linePoints + ` 100,${(1 - (0 - minDisp) / displacementRange) * aspectRatio * 100 + verticalPadding} 0,${(1 - (0 - minDisp) / displacementRange) * aspectRatio * 100 + verticalPadding}`} className={fillColor} opacity={0.2} />

        <g>
          {/* x labels */}
          {Array.from({ length: 16 }).map((_, i) => (
            <React.Fragment key={i}>
              <text x={(i / 15) * 100} y={aspectRatio * 100 + 1.5 + verticalPadding} textAnchor="middle" className="text-neutral-300" fontSize={1}>
                {(i * maxFrame) / 15}
              </text>
              <line x1={(i / 15) * 100} y1={aspectRatio * 100 + verticalPadding} x2={(i / 15) * 100} y2={0} className="stroke-neutral-300" strokeWidth="0.1" />
            </React.Fragment>
          ))}
        </g>

        {/* <circle transform={playheadTransform} r="0.3" className="fill-amber-500" /> */}
        <polygon transform={playheadTransform} points="-1,-1.4 1,-1.4 0,0" className="fill-amber-500" />
      </svg>
    </div>
  );
}
