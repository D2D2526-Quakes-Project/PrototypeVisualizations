import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { UNIT_SCALE } from "@/lib/utils";
import { RangeSlider3D } from "../components/RangeSlider3D";
import { useCanvasState } from "../contexts/CanvasContext";
import { RangeHandles3D } from "../components/RangeHandles3D";

const HANDLES = true;

export function FloorSliceRangeSliders() {
  const { animationData } = useAnimationData();
  const { boundingBox } = animationData.precomputed;

  const { sliceEnabled, sliceXRange, setSliceXRange, sliceYRange, setSliceYRange, sliceZRange, setSliceZRange } =
    useCanvasState();

  const maxBounds = animationData.precomputed.boundingBox.max;
  const minBounds = animationData.precomputed.boundingBox.min;

  if (!sliceEnabled) return null;

  if (HANDLES)
    return (
      <>
        <RangeHandles3D
          min={minBounds[0]}
          max={maxBounds[0]}
          value={[sliceXRange[0], sliceXRange[1]]}
          onChange={(newValues) => {
            setSliceXRange(newValues);
          }}
          position={[0, 0, (boundingBox.span[2] / 2) * UNIT_SCALE]}
          rotation={[0, 0, 0]}
          width={(boundingBox.span[0] * UNIT_SCALE) / 5}
          scale={5}
          handleOffset={1}
        />
        <RangeHandles3D
          min={minBounds[1]}
          max={maxBounds[1]}
          value={[sliceYRange[0], sliceYRange[1]]}
          onChange={(newValues) => {
            setSliceYRange(newValues);
          }}
          position={[0, 0, (boundingBox.span[2] / 2) * UNIT_SCALE]}
          rotation={[0, 0, Math.PI / 2]}
          width={(boundingBox.span[1] * UNIT_SCALE) / 5}
          scale={5}
          handleOffset={1}
        />
        <RangeHandles3D
          min={minBounds[2]}
          max={maxBounds[2]}
          value={[sliceZRange[0], sliceZRange[1]]}
          onChange={(newValues) => {
            setSliceZRange(newValues);
          }}
          position={[0, 0, (boundingBox.span[2] / 2) * UNIT_SCALE]}
          rotation={[0, -Math.PI / 2, 0]}
          width={(boundingBox.span[2] * UNIT_SCALE) / 5}
          scale={5}
          handleOffset={1}
        />
      </>
    );

  return (
    <>
      <RangeSlider3D
        min={minBounds[0]}
        max={maxBounds[0]}
        value={[sliceXRange[0], sliceXRange[1]]}
        onChange={(newValues) => {
          setSliceXRange(newValues);
        }}
        position={[0, (boundingBox.span[1] / 2) * UNIT_SCALE, 0]}
        rotation={[0, 0, 0]}
        width={(boundingBox.span[0] * UNIT_SCALE) / 5}
        scale={5}
      />
      <RangeSlider3D
        min={minBounds[1]}
        max={maxBounds[1]}
        value={[sliceYRange[0], sliceYRange[1]]}
        onChange={(newValues) => {
          setSliceYRange(newValues);
        }}
        position={[(boundingBox.span[0] / 2) * UNIT_SCALE, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
        width={(boundingBox.span[1] * UNIT_SCALE) / 5}
        scale={5}
      />
      <RangeSlider3D
        min={minBounds[2]}
        max={maxBounds[2]}
        value={[sliceZRange[0], sliceZRange[1]]}
        onChange={(newValues) => {
          setSliceZRange(newValues);
        }}
        position={[
          (boundingBox.span[0] / 2) * UNIT_SCALE,
          (boundingBox.span[1] / 2) * UNIT_SCALE,
          (boundingBox.span[2] / 2) * UNIT_SCALE,
        ]}
        rotation={[0, -Math.PI / 2, 0]}
        width={(boundingBox.span[2] * UNIT_SCALE) / 5}
        scale={5}
      />
    </>
  );
}
