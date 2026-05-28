import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useNodeRendering } from "@/features/3d/contexts/useNodeRendering";
import { useMetrics } from "@/features/metrics/useMetrics";

import {
  BlendIcon,
  CircleIcon,
  LayersIcon,
  Sliders,
  SquaresIntersectIcon,
  WorkflowIcon,
  type LucideIcon,
} from "lucide-react";
export function NodeDisplaySection() {
  const { isCurrentMetricHinge } = useMetrics();

  const {
    nodeScale,
    nodeOpacity,
    floorOpacity,
    belowThresholdNodeScale,
    hingeNodeScale,
    belowThresholdHingeScale,
    visualInterpolationEnabled,
    setHingeNodeScale,
    setBelowThresholdHingeScale,
    setVisualInterpolationEnabled,
    setNodeScale,
    setNodeOpacity,
    setBelowThresholdNodeScale,
    setFloorOpacity,
  } = useNodeRendering();

  return (
    <>
      <div className="mb-1 flex items-center gap-1">
        <Sliders size={12} className="text-muted-foreground" />
        <span className="text-foreground text-xs font-medium">Node Display</span>
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
        {/* <AdjustmentSlider
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
        /> */}

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
          <SquaresIntersectIcon size={12} className="text-muted-foreground" />
          <span className="text-muted-foreground text-xs">Visual Fill</span>
          <div className="border-border flex min-w-32 items-center border-x px-2">
            <Checkbox
              checked={visualInterpolationEnabled}
              onCheckedChange={(checked) => setVisualInterpolationEnabled(checked === true)}
            />
          </div>
        </Label>

        <div className="col-span-4">
          <span className="text-foreground text-xs font-medium">Below Threshold</span>
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
      <Icon size={12} className="text-muted-foreground" />
      <span className="text-muted-foreground text-xs">{label}</span>
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
      <span className="text-muted-foreground min-w-10 text-right text-xs">
        {suffix == "%" ? (value * 100).toFixed(0) : value.toFixed(1)}
        {suffix}
      </span>
    </div>
  );
}
