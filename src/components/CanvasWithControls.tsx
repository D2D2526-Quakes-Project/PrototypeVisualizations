import { useAnimationData } from "@/hooks/nodeDataHook";
import { OrbitControls, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState, type RefObject } from "react";
import {
  OrthographicCamera as OrthographicCameraImpl,
  PerspectiveCamera as PerspectiveCameraImpl,
  Vector3,
} from "three";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";

// This component goes INSIDE the Canvas
function CameraManager({
  isOrthographic,
  orbitControlsRef,
  enableSmoothing,
  targetPosition,
  targetLookAt,
  isTransitioning,
  onTransitionComplete,
}: {
  isOrthographic: boolean;
  orbitControlsRef: RefObject<OrbitControlsImpl | null>;
  enableSmoothing: boolean;
  targetPosition: Vector3 | null;
  targetLookAt: Vector3 | null;
  isTransitioning: boolean;
  onTransitionComplete: () => void;
}) {
  const perspectiveCamRef = useRef<PerspectiveCameraImpl>(null);
  const orthoCamRef = useRef<OrthographicCameraImpl>(null);

  const { camera, set } = useThree();

  useEffect(() => {
    const activeCamera = isOrthographic ? orthoCamRef.current : perspectiveCamRef.current;
    if (activeCamera) {
      if (camera) activeCamera.position.copy(camera.position);
      set({ camera: activeCamera });
    }
  }, [isOrthographic, camera, set]);

  // Smooth camera transition using lerp
  useFrame(() => {
    if (isTransitioning && targetPosition && targetLookAt && orbitControlsRef.current) {
      const controls = orbitControlsRef.current;
      const cam = controls.object;

      if (cam) {
        // Lerp camera position (adjust 0.15 for speed - higher = faster)
        cam.position.lerp(targetPosition, 0.25);

        // Lerp controls target
        controls.target.lerp(targetLookAt, 0.25);

        // Check if we're close enough to the target
        const positionDistance = cam.position.distanceTo(targetPosition);
        const targetDistance = controls.target.distanceTo(targetLookAt);

        if (positionDistance < 1.0 && targetDistance < 1.0) {
          // Snap to final position
          cam.position.copy(targetPosition);
          controls.target.copy(targetLookAt);
          onTransitionComplete();
        }

        controls.update();
      }
    }
  });

  return (
    <>
      <PerspectiveCamera
        ref={perspectiveCamRef}
        makeDefault={!isOrthographic}
        position={[50, 50, 50]}
        fov={75}
        up={[0, 0, 1]}
      />
      <OrthographicCamera
        ref={orthoCamRef}
        makeDefault={isOrthographic}
        position={[50, 50, 50]}
        zoom={50}
        up={[0, 0, 1]}
      />
      <OrbitControls ref={orbitControlsRef} enableDamping={enableSmoothing} />
    </>
  );
}

export function CanvasWithControls({ children }: { children: React.ReactNode }) {
  const [isOrthographic, setIsOrthographic] = useState(false);
  const [enableSmoothing, setEnableSmoothing] = useState(true);
  const [targetPosition, setTargetPosition] = useState<Vector3 | null>(null);
  const [targetLookAt, setTargetLookAt] = useState<Vector3 | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const orbitControlsRef = useRef<OrbitControlsImpl>(null);

  const handleTransitionComplete = () => {
    setIsTransitioning(false);
    setTargetPosition(null);
    setTargetLookAt(null);
  };

  return (
    <>
      <Canvas>
        {children}
        <CameraManager
          isOrthographic={isOrthographic}
          orbitControlsRef={orbitControlsRef}
          enableSmoothing={enableSmoothing}
          targetPosition={targetPosition}
          targetLookAt={targetLookAt}
          isTransitioning={isTransitioning}
          onTransitionComplete={handleTransitionComplete}
        />
      </Canvas>
      <ViewControls
        isOrthographic={isOrthographic}
        setIsOrthographic={setIsOrthographic}
        enableSmoothing={enableSmoothing}
        setEnableSmoothing={setEnableSmoothing}
        setTargetPosition={setTargetPosition}
        setTargetLookAt={setTargetLookAt}
        setIsTransitioning={setIsTransitioning}
      />
    </>
  );
}

export function ViewControls({
  isOrthographic,
  setIsOrthographic,
  enableSmoothing,
  setEnableSmoothing,
  setTargetPosition,
  setTargetLookAt,
  setIsTransitioning,
}: {
  isOrthographic: boolean;
  setIsOrthographic: (value: boolean) => void;
  enableSmoothing: boolean;
  setEnableSmoothing: (value: boolean) => void;
  setTargetPosition: (pos: Vector3 | null) => void;
  setTargetLookAt: (pos: Vector3 | null) => void;
  setIsTransitioning: (value: boolean) => void;
}) {
  const { animationData } = useAnimationData();

  const buildingWidth = animationData.precomputed.boundingBox.min[0] - animationData.precomputed.boundingBox.max[0];
  const buildingDepth = animationData.precomputed.boundingBox.min[2] - animationData.precomputed.boundingBox.max[2];
  const buildingHeight = animationData.precomputed.boundingBox.min[1] - animationData.precomputed.boundingBox.max[1];
  const maxDimension = Math.max(buildingWidth, buildingDepth, buildingHeight);
  const cameraDistance = maxDimension * 2;

  const resetView = (viewType: "top" | "bottom" | "left" | "right" | "front" | "back") => {
    const viewPositions = {
      top: { position: [0, cameraDistance, 0], target: [0, 0, 0] },
      left: { position: [-cameraDistance, buildingHeight / 2, 0], target: [0, 0, 0] },
      right: { position: [cameraDistance, buildingHeight / 2, 0], target: [0, 0, 0] },
      bottom: { position: [0, -cameraDistance, 0], target: [0, 0, 0] },
      front: { position: [0, buildingHeight / 2, cameraDistance], target: [0, 0, 0] },
      back: { position: [0, buildingHeight / 2, -cameraDistance], target: [0, 0, 0] },
    };

    const { position, target } = viewPositions[viewType];

    // Set target position and start transition
    setTargetPosition(new Vector3(position[0], position[1], position[2]));
    setTargetLookAt(new Vector3(target[0], target[1], target[2]));
    setIsTransitioning(true);
  };

  const toggleCameraType = () => {
    setIsOrthographic(!isOrthographic);
  };

  const toggleSmoothing = () => {
    setEnableSmoothing(!enableSmoothing);
  };

  return (
    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2 border border-neutral-200 z-50">
      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold text-center text-neutral-700 mb-1">Views</div>

        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => resetView("top")}
            className="px-2 py-1 text-xs bg-neutral-100 hover:bg-neutral-200 rounded border border-neutral-300 transition-colors"
            title="Top View">
            Top
          </button>
          <button
            onClick={() => resetView("bottom")}
            className="px-2 py-1 text-xs bg-neutral-100 hover:bg-neutral-200 rounded border border-neutral-300 transition-colors"
            title="Bottom View">
            Bottom
          </button>
          <button
            onClick={() => resetView("left")}
            className="px-2 py-1 text-xs bg-neutral-100 hover:bg-neutral-200 rounded border border-neutral-300 transition-colors"
            title="Left View">
            Left
          </button>
          <button
            onClick={() => resetView("right")}
            className="px-2 py-1 text-xs bg-neutral-100 hover:bg-neutral-200 rounded border border-neutral-300 transition-colors"
            title="Right View">
            Right
          </button>
          <button
            onClick={() => resetView("front")}
            className="px-2 py-1 text-xs bg-neutral-100 hover:bg-neutral-200 rounded border border-neutral-300 transition-colors"
            title="Front View">
            Front
          </button>
          <button
            onClick={() => resetView("back")}
            className="px-2 py-1 text-xs bg-neutral-100 hover:bg-neutral-200 rounded border border-neutral-300 transition-colors"
            title="Back View">
            Back
          </button>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-neutral-200">
          <span className="text-xs font-medium text-neutral-700">Perspective</span>
          <button
            onClick={toggleCameraType}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              isOrthographic ? "bg-blue-600" : "bg-neutral-300"
            }`}
            title="Toggle Camera Type">
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                isOrthographic ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </button>
          <span className="text-xs font-medium text-neutral-700">Orthographic</span>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-neutral-200">
          <span className="text-xs font-medium text-neutral-700">Sharp</span>
          <button
            onClick={toggleSmoothing}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              enableSmoothing ? "bg-blue-600" : "bg-neutral-300"
            }`}
            title="Toggle Camera Smoothing">
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                enableSmoothing ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </button>
          <span className="text-xs font-medium text-neutral-700">Smooth</span>
        </div>
      </div>
    </div>
  );
}
