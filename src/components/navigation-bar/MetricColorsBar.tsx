import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { ThresholdSlider } from "@/features/canvas/control-sections/ThresholdSection";
import {
  getMetricColorScale,
  getMetricsForThreshold,
  METRIC_CONFIGS,
  METRIC_PALETTES,
  THRESHOLD_CONFIGS,
  THRESHOLD_KEY_ORDER,
  type Metric,
  type MetricPaletteKey,
  type ThresholdKey,
} from "@/features/metrics/metrics";
import { useMetrics } from "@/features/metrics/useMetrics";
import { useThresholds } from "@/features/metrics/useThresholds";
import type { BuildingAnimationData } from "@/lib/types";
import { useGlobalStore } from "@/state";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

function ColorPalettePicker({ metric, currentPaletteKey }: { metric: Metric; currentPaletteKey: MetricPaletteKey }) {
  const { setMetricPalette } = useMetrics();
  const metricConfig = METRIC_CONFIGS[metric];
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-4 flex-1 cursor-pointer rounded-sm border border-neutral-300 transition-opacity hover:opacity-80"
          style={{
            background: `linear-gradient(to right, ${[...METRIC_PALETTES[currentPaletteKey].positiveColorStops, ...METRIC_PALETTES[currentPaletteKey].positiveThresholdColorStops].join(", ")})`,
          }}
          title={`Change ${metricConfig.label.toLowerCase()} palette`}
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2" side="top">
        <div className="grid grid-cols-2 gap-1.5">
          {(
            Object.entries(METRIC_PALETTES) as Array<[MetricPaletteKey, (typeof METRIC_PALETTES)[MetricPaletteKey]]>
          ).map(([paletteKey, palette]) => {
            const isActive = currentPaletteKey === paletteKey;
            return (
              <button
                key={paletteKey}
                type="button"
                onClick={() => {
                  setMetricPalette(metric, paletteKey === metricConfig.defaultPalette ? null : paletteKey);
                  setOpen(false);
                }}
                className={`flex rounded border p-1 transition-colors ${
                  isActive ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 hover:bg-neutral-50"
                }`}
                title={`Use ${palette.label.toLowerCase()} palette`}>
                <div
                  className="h-3 w-full rounded-sm"
                  style={{
                    background: `linear-gradient(to right, ${[...palette.positiveColorStops, palette.positiveThresholdColorStops].join(", ")})`,
                  }}
                />
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MetricRow({
  metric,
  metricPaletteOverrides,
  available,
  index,
}: {
  metric: Metric;
  metricPaletteOverrides: Partial<Record<Metric, MetricPaletteKey>>;
  available: boolean;
  index: number;
}) {
  const config = METRIC_CONFIGS[metric];
  const colorScale = getMetricColorScale(metric, metricPaletteOverrides);

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.1, delay: index * 0.02 }}
      className={`flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${
        available ? "hover:bg-neutral-100" : ""
      }`}>
      <span className="flex h-5 flex-1 shrink-0 items-center gap-0.5 rounded-sm">
        <ColorPalettePicker metric={metric} currentPaletteKey={colorScale.paletteKey} />
      </span>

      <span className={`min-w-0 ${!available ? "opacity-40" : ""}`}>
        <span
          className={`block truncate text-xs leading-tight font-medium ${available ? "text-neutral-700" : "text-neutral-400"}`}>
          {config.shortLabel}
        </span>
        {!available && (
          <span className="block truncate text-[10px] leading-tight text-neutral-400 italic">Requires data</span>
        )}
      </span>
    </motion.div>
  );
}

const FALLBACK_MAX_THRESHOLD: Record<string, number> = {
  displacement: 100,
  velocity: 100,
  acceleration: 100,
  rotation: 0.1,
  rotationVelocity: 0.5,
  rotationAcceleration: 2,
  interstoryDrift: 10,
  hingeRotation: 0.3,
  shear: 5000,
  inf: 100,
};

function ThresholdSection({
  thresholdKey,
  metricPaletteOverrides,
  animationData,
  showHiddenMetrics,
}: {
  thresholdKey: ThresholdKey;
  metricPaletteOverrides: Partial<Record<Metric, MetricPaletteKey>>;
  animationData: BuildingAnimationData;
  showHiddenMetrics: boolean;
}) {
  const config = THRESHOLD_CONFIGS[thresholdKey];
  const { thresholds, setThreshold } = useThresholds();
  const metrics = getMetricsForThreshold(thresholdKey);
  const max = Math.max(
    config.getPrecomputedMax(animationData),
    thresholds[thresholdKey] || FALLBACK_MAX_THRESHOLD[thresholdKey],
    FALLBACK_MAX_THRESHOLD[thresholdKey]
  );

  const visibleMetrics = metrics.filter((m) => {
    const c = METRIC_CONFIGS[m];
    if (c.hiddenByDefault && !showHiddenMetrics) return false;
    return true;
  });

  if (visibleMetrics.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12 }}
      className="mb-3">
      <div className="grid grid-cols-[auto_1fr_auto] gap-1 px-2 py-1">
        <ThresholdSlider
          label={config.label}
          value={thresholds[thresholdKey]}
          unit={config.unit}
          max={max}
          currentlyUsed={true}
          onChange={(v) => setThreshold(thresholdKey, v)}
        />
      </div>

      <div className="grid grid-cols-2 gap-0.5">
        {visibleMetrics.map((metric, i) => {
          const available = METRIC_CONFIGS[metric].isAvailable(animationData);
          return (
            <MetricRow
              key={metric}
              metric={metric}
              metricPaletteOverrides={metricPaletteOverrides}
              available={available}
              index={i}
            />
          );
        })}
      </div>
    </motion.div>
  );
}

export function MetricColorsBar() {
  const { animationData } = useAnimationData();
  const metricPaletteOverrides = useGlobalStore((s) => s.metricPaletteOverrides);
  const showHiddenMetrics = useGlobalStore((s) => s.showHiddenMetrics);

  const allThresholdKeys: ThresholdKey[] = [...THRESHOLD_KEY_ORDER, "inf"];

  return (
    <div className="flex h-full w-full flex-col overflow-hidden border-t border-neutral-200 bg-neutral-50">
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allThresholdKeys.map((key) => (
              <ThresholdSection
                key={key}
                thresholdKey={key}
                metricPaletteOverrides={metricPaletteOverrides}
                animationData={animationData}
                showHiddenMetrics={showHiddenMetrics}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
