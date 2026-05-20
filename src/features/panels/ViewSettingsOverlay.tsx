import { useCanvasState } from "../3d/contexts/CanvasContext";
import { useGlobalStore, useProfileData } from "@/state";
import { useAnimationData } from "@/features/animation-data/useAnimationData";

export function ViewSettingsOverlay() {
  const canvasState = useCanvasState();
  const colorTheme = useGlobalStore((s) => s.colorTheme);
  const hiddenFloors = useProfileData((s) => s._hiddenFloors);
  const { animationData } = useAnimationData();
  const totalFloors = Object.keys(animationData.precomputed.storyElevations).length;
  const visibleFloors = totalFloors - hiddenFloors.length;

  const lines: string[] = [];

  if (canvasState.orthographic) {
    lines.push("Orthographic");
  }

  if (canvasState.spin) {
    lines.push("Spinning");
  }

  if (canvasState.sliceEnabled) {
    const x = canvasState.sliceXRange;
    const y = canvasState.sliceYRange;
    const z = canvasState.sliceZRange;
    lines.push(
      `Slice X:[${x[0].toFixed(0)},${x[1].toFixed(0)}] Y:[${y[0].toFixed(0)},${y[1].toFixed(0)}] Z:[${z[0].toFixed(0)},${z[1].toFixed(0)}]`
    );
  }

  if (canvasState.xExpansion !== 1 || canvasState.yExpansion !== 0 || canvasState.zExpansion !== 0) {
    lines.push(
      `Expand X:${canvasState.xExpansion.toFixed(1)} Y:${canvasState.yExpansion.toFixed(1)} Z:${canvasState.zExpansion.toFixed(1)}`
    );
  }

  if (canvasState.xyDisplacementScale !== 1 || canvasState.zDisplacementScale !== 1) {
    lines.push(`Disp XY:${canvasState.xyDisplacementScale.toFixed(1)} Z:${canvasState.zDisplacementScale.toFixed(1)}`);
  }

  if (visibleFloors !== totalFloors && hiddenFloors.length > 0) {
    lines.push(`Floors: ${hiddenFloors.join(",")} hidden`);
  }

  if (lines.length === 0) return null;

  return (
    <div
      className="absolute right-2 bottom-2 z-50 flex flex-col items-end text-[10px]"
      style={{ color: colorTheme.canvasText }}>
      {lines.map((line, i) => (
        <span key={i} className="font-mono whitespace-nowrap">
          {line}
        </span>
      ))}
    </div>
  );
}
