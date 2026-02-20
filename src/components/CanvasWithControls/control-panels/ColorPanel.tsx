import { Switch } from "@/components/ui/switch";
import { Palette } from "lucide-react";
import { ColorScaleBar } from "../ColorScaleBar";
import type { ColorMetric } from "@/lib/colors";

interface ColorPanelProps {
  currentMetric: ColorMetric;
  setColorMetric: (metric: ColorMetric) => void;
  availableMetrics: ColorMetric[];
  thresholdHighlighting: boolean;
  setThresholdHighlighting: (enabled: boolean) => void;
  thresholds: Record<string, number>;
  animationData: {
    precomputed: {
      maxDisplacement: number;
      maxDisplacementX: number;
      maxDisplacementY: number;
      maxDisplacementZ: number;
      maxVelocity: number | null;
      maxVelocityX: number | null;
      maxVelocityY: number | null;
      maxVelocityZ: number | null;
      maxAcceleration: number | null;
      maxAccelerationX: number | null;
      maxAccelerationY: number | null;
      maxAccelerationZ: number | null;
      maxStoryDrift: number;
    };
  };
}

const metricLabels: Record<ColorMetric, string> = {
  displacement: "Displacement (Mag)",
  "displacement-x": "Displacement X",
  "displacement-y": "Displacement Y",
  "displacement-z": "Displacement Z",
  velocity: "Velocity (Mag)",
  "velocity-x": "Velocity X",
  "velocity-y": "Velocity Y",
  "velocity-z": "Velocity Z",
  acceleration: "Acceleration (Mag)",
  "acceleration-x": "Acceleration X",
  "acceleration-y": "Acceleration Y",
  "acceleration-z": "Acceleration Z",
  "story-drift": "Story Drift",
};

export function ColorPanel({
  currentMetric,
  setColorMetric,
  availableMetrics,
  thresholdHighlighting,
  setThresholdHighlighting,
  thresholds,
  animationData,
}: ColorPanelProps) {
  return (
    <>
      <div className="flex items-center gap-1 mb-1">
        <Palette size={12} className="text-neutral-500" />
        <span className="text-xs font-medium text-neutral-700">Color By</span>
      </div>
      <select
        value={currentMetric}
        onChange={(e) => setColorMetric(e.target.value as ColorMetric)}
        className="w-full text-xs px-2 py-1 bg-neutral-100 border border-neutral-300 rounded hover:bg-neutral-200 transition-colors cursor-pointer">
        {availableMetrics.map((metric) => (
          <option key={metric} value={metric}>
            {metricLabels[metric]}
          </option>
        ))}
      </select>

      <div className="mt-2">
        <div className="text-[10px] text-neutral-500 mb-1">Color Scale</div>
        <ColorScaleBar
          currentMetric={currentMetric}
          thresholdHighlighting={thresholdHighlighting}
          thresholds={thresholds}
          animationData={animationData}
        />
      </div>

      <div className="flex items-center gap-2 mt-1">
        <Switch size="sm" checked={thresholdHighlighting} onCheckedChange={setThresholdHighlighting} />
        <span className="text-[10px] text-neutral-500">Highlight exceeding threshold</span>
      </div>
    </>
  );
}
