import { Switch } from "@/components/ui/switch";
import { useCamera } from "@/contexts/CameraContext";
import { useAnimationData } from "@/hooks/nodeDataHook";
import { UNIT_SCALE } from "@/lib/utils";
import { OrbitControls, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { BoxSelect, ChevronDown, ScanEye } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type RefObject } from "react";
import {
  OrthographicCamera as OrthographicCameraImpl,
  PerspectiveCamera as PerspectiveCameraImpl,
  Vector3,
} from "three";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { SmallPlaybackControls } from "./playback/PlaybackControls";

function CameraManager({ isOrthographic, enableSmoothing }: { isOrthographic: boolean; enableSmoothing: boolean }) {
  const { orbitControlsRef } = useCamera();
  const perspectiveCamRef = useRef<PerspectiveCameraImpl>(null);
  const orthoCamRef = useRef<OrthographicCameraImpl>(null);
  const { animationData } = useAnimationData();

  const buildingVerticalCenter =
    (animationData.precomputed.boundingBox.center[2] - animationData.precomputed.boundingBox.min[2]) * UNIT_SCALE;
  const cameraDistance = animationData.precomputed.boundingBox.radius * UNIT_SCALE;

  const targetRef = useRef(new Vector3(0, 0, buildingVerticalCenter));

  useEffect(() => {
    targetRef.current.set(0, 0, buildingVerticalCenter);
  }, [buildingVerticalCenter]);

  useEffect(() => {
    const perspective = perspectiveCamRef.current;
    const ortho = orthoCamRef.current;
    const controls = orbitControlsRef.current;

    if (!perspective || !ortho || !controls) return;

    const savedTarget = controls.target.clone();
    targetRef.current.copy(savedTarget);

    if (isOrthographic) {
      ortho.position.copy(perspective.position);
      ortho.zoom = (cameraDistance / perspective.position.length()) * 8;
      ortho.updateProjectionMatrix();
    } else {
      perspective.position.copy(ortho.position);
    }

    controls.target.copy(targetRef.current);
    controls.update();
  }, [isOrthographic, cameraDistance]);

  useFrame(() => {
    const controls = orbitControlsRef.current;
    if (controls) {
      targetRef.current.copy(controls.target);
    }
  });

  return (
    <>
      <PerspectiveCamera
        ref={perspectiveCamRef}
        makeDefault={!isOrthographic}
        position={[cameraDistance, cameraDistance, buildingVerticalCenter + cameraDistance]}
        fov={75}
        up={[0, 0, 1]}
      />
      <OrthographicCamera
        ref={orthoCamRef}
        makeDefault={isOrthographic}
        position={[cameraDistance, cameraDistance, buildingVerticalCenter + cameraDistance]}
        zoom={50}
        up={[0, 0, 1]}
      />
      <OrbitControls ref={orbitControlsRef} enableDamping={enableSmoothing} target={targetRef.current} />
    </>
  );
}

export function CanvasWithControls({
  children,
  showPlaybackControls,
}: {
  children: React.ReactNode;
  showPlaybackControls?: boolean;
}) {
  const [isOrthographic, setIsOrthographic] = useState(false);
  const [enableSmoothing, setEnableSmoothing] = useState(false);
  const { orbitControlsRef } = useCamera();

  return (
    <>
      <Canvas>
        {children}
        <CameraManager isOrthographic={isOrthographic} enableSmoothing={enableSmoothing} />
      </Canvas>
      <ViewControls
        orbitControlsRef={orbitControlsRef}
        isOrthographic={isOrthographic}
        setIsOrthographic={setIsOrthographic}
        enableSmoothing={enableSmoothing}
        setEnableSmoothing={setEnableSmoothing}
      />
      {showPlaybackControls && (
        <div className="absolute top-2 left-2 z-50">
          <div className="flex items-start gap-0.5">
            <SmallPlaybackControls />
          </div>
        </div>
      )}
    </>
  );
}

export function ViewControls({
  orbitControlsRef,
  isOrthographic,
  setIsOrthographic,
  enableSmoothing,
  setEnableSmoothing,
}: {
  orbitControlsRef: RefObject<OrbitControlsImpl | null>;
  isOrthographic: boolean;
  setIsOrthographic: (value: boolean) => void;
  enableSmoothing: boolean;
  setEnableSmoothing: (value: boolean) => void;
}) {
  const { animationData } = useAnimationData();
  const cameraDistance = animationData.precomputed.boundingBox.radius * 2.5 * UNIT_SCALE;
  const [isExpanded, setIsExpanded] = useState(false);

  const resetView = (viewType: "top" | "bottom" | "left" | "right" | "front" | "back") => {
    if (orbitControlsRef?.current) {
      const controls = orbitControlsRef.current;
      const camera = controls.object;
      const target = controls.target;

      if (camera && target) {
        const viewPositions = {
          top: [target.x, target.y, target.z + cameraDistance],
          bottom: [target.x, target.y, target.z - cameraDistance],
          left: [target.x - cameraDistance, target.y, target.z],
          right: [target.x + cameraDistance, target.y, target.z],
          front: [target.x, target.y + cameraDistance, target.z],
          back: [target.x, target.y - cameraDistance, target.z],
        };

        const position = viewPositions[viewType];
        camera.position.set(position[0], position[1], position[2]);
      }

      controls.update();
    }
  };

  const toggleCameraType = () => {
    setIsOrthographic(!isOrthographic);
  };

  const viewButtons = [
    { view: "front" as const, label: "North" },
    { view: "right" as const, label: "East" },
    { view: "back" as const, label: "South" },
    { view: "left" as const, label: "West" },
    { view: "top" as const, label: "Top" },
    { view: "bottom" as const, label: "Bottom" },
  ];

  return (
    <div className="absolute top-2 right-2 z-50">
      <div className="flex items-start gap-0.5">
        <AnimatePresence mode="popLayout">
          {!isExpanded ? (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-neutral-200 p-1 flex items-center gap-0.5 origin-right">
              {viewButtons.map(({ view, label }) => (
                <button
                  key={view}
                  onClick={() => resetView(view)}
                  className="p-1 rounded hover:bg-neutral-200 transition-colors text-neutral-700 text-[10px] font-medium w-5 h-5 flex items-center justify-center"
                  title={`${label} View`}>
                  {label.charAt(0)}
                </button>
              ))}
              <div className="w-px h-4 bg-neutral-300 mx-0.5" />
              <button
                onClick={toggleCameraType}
                className={`p-1 rounded transition-colors ${
                  isOrthographic ? "bg-blue-100 text-blue-700" : "hover:bg-neutral-200 text-neutral-700"
                }`}
                title={isOrthographic ? "Orthographic" : "Perspective"}>
                {isOrthographic ? <BoxSelect size={14} /> : <ScanEye size={14} />}
              </button>
              <div className="w-px h-4 bg-neutral-300 mx-0.5" />

              <button
                onClick={() => setIsExpanded(true)}
                className="p-1 rounded transition-colors hover:bg-neutral-200 text-neutral-700"
                title="More options">
                <ChevronDown size={14} />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, scale: 0.95, x: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: 10 }}
              transition={{ duration: 0.15 }}
              className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2 border border-neutral-200 min-w-48 origin-top-right">
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs font-semibold text-neutral-700">Views</div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 rounded hover:bg-neutral-200 transition-colors text-neutral-500"
                  title="Collapse">
                  <ChevronDown size={14} className="rotate-180" />
                </button>
              </div>
              <motion.div
                className="grid grid-cols-2 gap-1 mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.05 }}>
                {viewButtons.map(({ view, label }) => (
                  <button
                    key={view}
                    onClick={() => resetView(view)}
                    className="px-2 py-0.5 text-xs bg-neutral-100 hover:bg-neutral-200 rounded border border-neutral-300 transition-colors">
                    {label}
                  </button>
                ))}
              </motion.div>
              <motion.div
                className="flex items-center gap-2 pt-1 border-t border-neutral-200"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}>
                <span className="text-xs font-medium text-neutral-700">Persp</span>
                <Switch size="sm" checked={isOrthographic} onCheckedChange={setIsOrthographic} />
                <span className="text-xs font-medium text-neutral-700">Ortho</span>
              </motion.div>
              <motion.div
                className="flex items-center gap-2 pt-1 border-t border-neutral-200 mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}>
                <span className="text-xs font-medium text-neutral-700">Sharp</span>
                <Switch size="sm" checked={enableSmoothing} onCheckedChange={setEnableSmoothing} />
                <span className="text-xs font-medium text-neutral-700">Smooth</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
