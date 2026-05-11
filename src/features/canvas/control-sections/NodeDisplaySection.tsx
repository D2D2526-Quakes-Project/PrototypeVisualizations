import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useMetrics } from "@/features/metrics/useMetrics";
import { useProfileStore } from "@/state";

import {
  BlendIcon,
  ChevronsLeftRightEllipsisIcon,
  CircleIcon,
  LayersIcon,
  MoveHorizontalIcon,
  Sliders,
  SquaresIntersectIcon,
  WorkflowIcon,
  type LucideIcon,
} from "lucide-react";
export function NodeDisplaySection() {
  const { isCurrentMetricHinge } = useMetrics();

  const nodeScale = useProfileStore((s) => s.nodeScale);
  const nodeOpacity = useProfileStore((s) => s.nodeOpacity);
  const floorOpacity = useProfileStore((s) => s.floorOpacity);
  const belowThresholdNodeScale = useProfileStore((s) => s.belowThresholdNodeScale);
  const connectionLineWidth = useProfileStore((s) => s.connectionLineWidth);
  const connectionLineOpacity = useProfileStore((s) => s.connectionLineOpacity);
  const hingeNodeScale = useProfileStore((s) => s.hingeNodeScale);
  const belowThresholdHingeScale = useProfileStore((s) => s.belowThresholdHingeScale);
  const visualInterpolationEnabled = useProfileStore((s) => s.visualInterpolationEnabled);
  const setHingeNodeScale = useProfileStore((s) => s.setHingeNodeScale);
  const setBelowThresholdHingeScale = useProfileStore((s) => s.setBelowThresholdHingeScale);
  const setVisualInterpolationEnabled = useProfileStore((s) => s.setVisualInterpolationEnabled);
  const setNodeScale = useProfileStore((s) => s.setNodeScale);
  const setNodeOpacity = useProfileStore((s) => s.setNodeOpacity);
  const setBelowThresholdNodeScale = useProfileStore((s) => s.setBelowThresholdNodeScale);
  const setFloorOpacity = useProfileStore((s) => s.setFloorOpacity);
  const setConnectionLineWidth = useProfileStore((s) => s.setConnectionLineWidth);
  const setConnectionLineOpacity = useProfileStore((s) => s.setConnectionLineOpacity);

  return (
    <>
      <div className="mb-1 flex items-center gap-1">
        <Sliders size={12} className="text-neutral-500" />
        <span className="text-xs font-medium text-neutral-700">Node Display</span>
      </div>

      <div className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-1">
        <AdjustmentSlider
          label="Scale"
          value={nodeScale}
          onChange={setNodeScale}
          min={0.1}
          max={3}
          step={0.1}
          suffix="x"
          Icon={CircleIcon}
        />
        <AdjustmentSlider
          label="Opacity"
          value={nodeOpacity}
          onChange={setNodeOpacity}
          min={0}
          max={1}
          step={0.05}
          suffix="%"
          Icon={BlendIcon}
        />
        <AdjustmentSlider
          label="Floor"
          value={floorOpacity}
          onChange={setFloorOpacity}
          min={0}
          max={1}
          step={0.05}
          suffix="%"
          Icon={LayersIcon}
        />
        <AdjustmentSlider
          label="Conn Width"
          value={connectionLineWidth}
          onChange={setConnectionLineWidth}
          min={1}
          max={10}
          step={0.5}
          suffix="px"
          Icon={MoveHorizontalIcon}
        />
        <AdjustmentSlider
          label="Conn Opacity"
          value={connectionLineOpacity}
          onChange={setConnectionLineOpacity}
          min={0}
          max={1}
          step={0.05}
          suffix="%"
          Icon={ChevronsLeftRightEllipsisIcon}
        />

        {isCurrentMetricHinge && (
          <AdjustmentSlider
            label="Hinge Scale"
            value={hingeNodeScale}
            onChange={setHingeNodeScale}
            min={0}
            max={3}
            step={0.05}
            suffix="x"
            Icon={WorkflowIcon}
          />
        )}

        <Label className="col-span-4 grid grid-cols-subgrid items-center gap-2 font-normal">
          <SquaresIntersectIcon size={12} className="text-neutral-400" />
          <span className="text-xs text-neutral-500">Visual Fill</span>
          <div className="border-border flex min-w-32 items-center border-x px-2">
            <Checkbox
              checked={visualInterpolationEnabled}
              onCheckedChange={(checked) => setVisualInterpolationEnabled(checked === true)}
            />
          </div>
        </Label>

        <div className="col-span-4">
          <span className="text-xs font-medium text-neutral-700">Below Threshold</span>
        </div>

        <AdjustmentSlider
          label="Node Scale"
          value={belowThresholdNodeScale}
          onChange={setBelowThresholdNodeScale}
          min={0}
          max={1}
          step={0.05}
          suffix="x"
          Icon={CircleIcon}
        />

        {isCurrentMetricHinge && (
          <AdjustmentSlider
            label="Hinge Scale"
            value={belowThresholdHingeScale}
            onChange={setBelowThresholdHingeScale}
            min={0}
            max={1}
            step={0.05}
            suffix="x"
            Icon={WorkflowIcon}
          />
        )}
      </div>
    </>
  );
}

function AdjustmentSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  Icon,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  suffix: string;
  Icon: LucideIcon;
}) {
  return (
    <div className="col-span-4 grid grid-cols-subgrid items-center gap-2">
      <Icon size={12} className="text-neutral-400" />
      <span className="text-xs text-neutral-500">{label}</span>
      <div className="border-border flex min-w-32 items-center border-x px-2 py-1">
        <Slider
          value={[value]}
          onValueChange={(val) => onChange(val[0])}
          min={min}
          max={max}
          step={step}
          className="flex-1"
        />
      </div>
      <span className="min-w-10 text-right text-xs text-neutral-500">
        {suffix == "%" ? (value * 100).toFixed(0) : value.toFixed(1)}
        {suffix}
      </span>
    </div>
  );
}
