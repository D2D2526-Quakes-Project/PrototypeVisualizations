import { useAnimationData } from "@/hooks/nodeDataHook";
import { UNIT_SCALE } from "@/lib/utils";
import { OrbitControls, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState, type RefObject } from "react";
import {
  MathUtils,
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
}: {
  isOrthographic: boolean;
  orbitControlsRef: RefObject<OrbitControlsImpl | null>;
  enableSmoothing: boolean;
}) {
  const perspectiveCamRef = useRef<PerspectiveCameraImpl>(null);
  const orthoCamRef = useRef<OrthographicCameraImpl>(null);

  const { camera, set, size } = useThree();

  useEffect(() => {
    const controls = orbitControlsRef.current;
    const perspective = perspectiveCamRef.current;
    const ortho = orthoCamRef.current;

    if (!controls || !perspective || !ortho) return;

    const distance = camera.position.distanceTo(controls.target);

    if (isOrthographic) {
      // --- PERSPECTIVE TO ORTHO ---
      // Match the perspective FOV height at the target distance
      const fovRadians = MathUtils.degToRad(perspective.fov);
      // Formula: zoom = 1 / (tan(fov/2) * distance)
      // We multiply by (size.height / 2) because Drei's OrthoCam uses viewport units
      const newZoom = size.height / (2 * Math.tan(fovRadians / 2) * distance);

      ortho.zoom = newZoom;
      ortho.position.copy(camera.position);
      ortho.updateProjectionMatrix();
      set({ camera: ortho });
    } else {
      // --- ORTHO TO PERSPECTIVE ---
      // Reverse the formula to find the distance the perspective cam needs to be
      const fovRadians = MathUtils.degToRad(perspective.fov);
      const targetDistance = size.height / (2 * Math.tan(fovRadians / 2) * ortho.zoom);

      // Move the perspective camera position along the same vector to match the distance
      const direction = new Vector3().subVectors(camera.position, controls.target).normalize();
      const newPos = new Vector3().addVectors(controls.target, direction.multiplyScalar(targetDistance));

      perspective.position.copy(newPos);
      perspective.updateProjectionMatrix();
      set({ camera: perspective });
    }
  }, [orbitControlsRef, perspectiveCamRef, orthoCamRef]);

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
  const orbitControlsRef = useRef<OrbitControlsImpl>(null);

  return (
    <>
      <Canvas>
        {children}
        <CameraManager
          isOrthographic={isOrthographic}
          orbitControlsRef={orbitControlsRef}
          enableSmoothing={enableSmoothing}
        />
      </Canvas>
      <ViewControls
        orbitControlsRef={orbitControlsRef}
        isOrthographic={isOrthographic}
        setIsOrthographic={setIsOrthographic}
        enableSmoothing={enableSmoothing}
        setEnableSmoothing={setEnableSmoothing}
      />
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

  const buildingVerticalCenter =
    ((animationData.precomputed.boundingBox.center[2] - animationData.precomputed.boundingBox.min[2]) / 2) * UNIT_SCALE;
  const cameraDistance = animationData.precomputed.boundingBox.radius * 1.5 * UNIT_SCALE;

  const resetView = (viewType: "top" | "bottom" | "left" | "right" | "front" | "back") => {
    const viewPositions = {
      top: { position: [0, 0, cameraDistance], target: [0, 0, buildingVerticalCenter] },
      left: { position: [-cameraDistance, 0, buildingVerticalCenter], target: [0, 0, buildingVerticalCenter] },
      right: { position: [cameraDistance, 0, buildingVerticalCenter], target: [0, 0, buildingVerticalCenter] },
      bottom: { position: [0, 0, -cameraDistance], target: [0, 0, buildingVerticalCenter] },
      front: { position: [0, cameraDistance, buildingVerticalCenter], target: [0, 0, buildingVerticalCenter] },
      back: { position: [0, -cameraDistance, buildingVerticalCenter], target: [0, 0, buildingVerticalCenter] },
    };

    const { position, target } = viewPositions[viewType];

    if (orbitControlsRef?.current) {
      const controls = orbitControlsRef.current;
      const camera = controls.object;

      if (camera) {
        camera.position.set(position[0], position[1], position[2]);
        camera.lookAt(target[0], target[1], target[2]);
      }

      controls.target.set(target[0], target[1], target[2]);
      controls.update();
    }
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
