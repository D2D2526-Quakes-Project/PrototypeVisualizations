import { usePlayback } from "@/features/playback/usePlayback";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import type { IDockviewPanelHeaderProps, IDockviewPanelProps } from "dockview-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { UnitTooltip } from "@/components/ui/unit-tooltip";

import { XIcon } from "lucide-react";
import { IsometricBuilding } from "@/components/IsometricBoundingBox";
import { HingeLocalizedSummary } from "@/components/HingeLocalizedSummary";
import type { ShearRow } from "@/lib/types";
import { MiniTimeSeries } from "@/components/MiniTimeSeries";
import { AveragedMetricSection } from "@/components/AveragedMetricSection";
import { numberToColor, numberToColorLight, stringToNumber } from "@/lib/utils";
import { useGlobalStore, useProfileStore } from "@/state";
import { getMetricKeyColor } from "@/features/metrics/metrics";
import { SectionVisualization } from "../3d/renderers/SectionVisualization";

export function FloorPanel(props: IDockviewPanelProps<{ storyId: string }>) {
  const storyId = props.params.storyId;
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const nodePanelGraphVisibility = useProfileStore((s) => s.nodePanelGraphVisibility);
  const metricPaletteOverrides = useGlobalStore((s) => s.metricPaletteOverrides);
  const shearXColor = getMetricKeyColor("shearXAbs", metricPaletteOverrides);
  const shearYColor = getMetricKeyColor("shearYAbs", metricPaletteOverrides);
  const storyDriftColor = getMetricKeyColor("interstoryDrift", metricPaletteOverrides);

  const nodeIds = useMemo(
    () => animationData.metadata.stories[storyId] || [],
    [storyId, animationData.metadata.stories]
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState(300);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions(width);
      }
    };
    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // LOCATION INFO — no frameIndex dep, fine as-is
  const storyInfo = useMemo(() => {
    const storyIndex = animationData.metadata.storyOrder.indexOf(storyId);
    return {
      story: storyId,
      height: animationData.metadata.storyHeights[storyId] || 0,
      elevation: animationData.precomputed.storyElevations[storyId] || 0,
      floorNumber: storyIndex + 1,
      totalFloors: animationData.metadata.storyOrder.length,
    };
  }, [storyId, animationData]);

  const shearSummary = useMemo<ShearRow | null>(
    () => animationData.shearData?.getByStory(storyId) ?? null,
    [animationData.shearData, storyId]
  );

  const driftTimeSeries = useMemo(() => {
    const cornerNodes = animationData.metadata.cornerNodes[storyId];
    const frameCount = animationData.metadata.frameCount;
    const dt = animationData.metadata.dt;

    const times: number[] = [];
    const nwValues: number[] = [];
    const neValues: number[] = [];
    const swValues: number[] = [];
    const seValues: number[] = [];

    for (let f = 0; f < frameCount; f++) {
      times.push(f * dt);
      nwValues.push(animationData.storyDrift.get(f, cornerNodes.NW));
      neValues.push(animationData.storyDrift.get(f, cornerNodes.NE));
      swValues.push(animationData.storyDrift.get(f, cornerNodes.SW));
      seValues.push(animationData.storyDrift.get(f, cornerNodes.SE));
    }

    return {
      times,
      nwValues,
      neValues,
      swValues,
      seValues,
      peakTimes: {
        nw: (animationData.precomputed.peakStoryDriftFrame[cornerNodes.NW] ?? 0) * dt,
        ne: (animationData.precomputed.peakStoryDriftFrame[cornerNodes.NE] ?? 0) * dt,
        sw: (animationData.precomputed.peakStoryDriftFrame[cornerNodes.SW] ?? 0) * dt,
        se: (animationData.precomputed.peakStoryDriftFrame[cornerNodes.SE] ?? 0) * dt,
      },
    };
  }, [animationData, storyId]);

  const cornerDriftPeaks = useMemo(() => {
    const cornerNodes = animationData.metadata.cornerNodes[storyId];
    const dt = animationData.metadata.dt;
    const result: Record<string, { peak: number; peakTime: number }> = {};
    for (const corner in cornerNodes) {
      const nodeId = cornerNodes[corner as keyof typeof cornerNodes];
      result[corner] = {
        peak: animationData.precomputed.peakStoryDrift[nodeId] ?? 0,
        peakTime: (animationData.precomputed.peakStoryDriftFrame[nodeId] ?? 0) * dt,
      };
    }
    return result;
  }, [storyId, animationData]);

  const cornerDriftsCurrent = useMemo(() => {
    const cornerNodes = animationData.metadata.cornerNodes[storyId];
    const result: Record<string, number> = {};
    for (const corner in cornerNodes) {
      const nodeId = cornerNodes[corner as keyof typeof cornerNodes];
      result[corner] = animationData.storyDrift.get(frameIndex, nodeId) ?? 0;
    }
    return result;
  }, [storyId, animationData.storyDrift, animationData.metadata.cornerNodes, frameIndex]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-3 text-xs *:border-b *:pb-3">
        {/* 3D VISUALIZATION */}
        <div className="animate-fade-in w-full" ref={containerRef}>
          <SectionVisualization nodeIds={nodeIds} width={dimensions} viewMode="floor" />
        </div>

        {/* LOCATION INFO */}
        <div className="animate-fade-in">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium text-neutral-700">Story:</span>
              <div className="font-mono text-neutral-600">{storyInfo.story}</div>
            </div>
            <div>
              <span className="font-medium text-neutral-700">Nodes:</span>
              <div className="text-neutral-600">{nodeIds.length}</div>
            </div>
            <div>
              <span className="font-medium text-neutral-700">Elevation:</span>
              <div className="text-neutral-600">
                <UnitTooltip value={storyInfo.elevation} unit="inches" decimals={1} />
              </div>
            </div>
            <div>
              <span className="font-medium text-neutral-700">Story Height:</span>
              <div className="text-neutral-600">
                <UnitTooltip value={storyInfo.height} unit="inches" decimals={1} />
              </div>
            </div>
          </div>
        </div>

        {animationData.precomputed.hingeNodeMetrics && (
          <div className="animate-fade-in">
            <HingeLocalizedSummary nodeIds={nodeIds} />
          </div>
        )}

        {shearSummary && (
          <div className="animate-fade-in">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold">Static Shear</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: shearXColor }} />
                  <span className="text-xs font-medium text-neutral-700">X Direction</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <span className="text-neutral-600">Max</span>
                  <span className="font-mono text-neutral-800">
                    <UnitTooltip value={shearSummary.xMax} unit="kips" />
                  </span>
                  <span className="text-neutral-600">Min</span>
                  <span className="font-mono text-neutral-800">
                    <UnitTooltip value={shearSummary.xMin} unit="kips" />
                  </span>
                  <span className="text-neutral-600">Abs</span>
                  <span className="font-mono text-neutral-800">
                    <UnitTooltip value={shearSummary.xAbs} unit="kips" />
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: shearYColor }} />
                  <span className="text-xs font-medium text-neutral-700">Y Direction</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <span className="text-neutral-600">Max</span>
                  <span className="font-mono text-neutral-800">
                    <UnitTooltip value={shearSummary.yMax} unit="kips" />
                  </span>
                  <span className="text-neutral-600">Min</span>
                  <span className="font-mono text-neutral-800">
                    <UnitTooltip value={shearSummary.yMin} unit="kips" />
                  </span>
                  <span className="text-neutral-600">Abs</span>
                  <span className="font-mono text-neutral-800">
                    <UnitTooltip value={shearSummary.yAbs} unit="kips" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DISPLACEMENT */}
        <AveragedMetricSection
          title="Displacement"
          unit="inches"
          graphPrefix="disp"
          nodeIds={nodeIds}
          accessor={animationData.displacementLin}
        />

        {/* VELOCITY */}
        <AveragedMetricSection
          title="Velocity"
          unit="inches/second"
          graphPrefix="vel"
          nodeIds={nodeIds}
          accessor={animationData.velocityLin}
        />

        {/* ACCELERATION */}
        <AveragedMetricSection
          title="Acceleration"
          unit="inches/second²"
          graphPrefix="acc"
          nodeIds={nodeIds}
          accessor={animationData.accelerationLin}
        />

        {/* CORNER DRIFTS */}
        {cornerDriftsCurrent && (
          <div className="animate-fade-in">
            <h3 className="mb-2 text-sm font-bold">Story Drifts</h3>
            <div className="space-y-1">
              {Object.entries(cornerDriftsCurrent).map(([corner, current]) => {
                const peaks = cornerDriftPeaks[corner];
                return (
                  <div key={corner} className="flex items-center gap-2">
                    <span className="w-8 font-medium text-neutral-700">{corner}:</span>
                    <div className="font-mono text-[10px] text-neutral-600">
                      <span className="mr-1">Current:</span>
                      <UnitTooltip value={current} unit="percent" />
                      <span className="mx-2 text-neutral-300">|</span>
                      <span className="mr-1">Peak:</span>
                      <UnitTooltip value={peaks.peak} unit="percent" />
                      <span className="text-[9px] text-neutral-500">@ {peaks.peakTime.toFixed(2)} s</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {driftTimeSeries && (
              <div className="mt-3 space-y-2">
                {nodePanelGraphVisibility[`driftNW`] && (
                  <MiniTimeSeries
                    data={driftTimeSeries.nwValues}
                    times={driftTimeSeries.times}
                    color={storyDriftColor}
                    currentValue={cornerDriftsCurrent.NW ?? 0}
                    unit="percent"
                    label="Drift NW"
                    peakTime={driftTimeSeries.peakTimes.nw}
                  />
                )}
                {nodePanelGraphVisibility[`driftNE`] && (
                  <MiniTimeSeries
                    data={driftTimeSeries.neValues}
                    times={driftTimeSeries.times}
                    color={storyDriftColor}
                    currentValue={cornerDriftsCurrent.NE ?? 0}
                    unit="percent"
                    label="Drift NE"
                    peakTime={driftTimeSeries.peakTimes.ne}
                  />
                )}
                {nodePanelGraphVisibility[`driftSW`] && (
                  <MiniTimeSeries
                    data={driftTimeSeries.swValues}
                    times={driftTimeSeries.times}
                    color={storyDriftColor}
                    currentValue={cornerDriftsCurrent.SW ?? 0}
                    unit="percent"
                    label="Drift SW"
                    peakTime={driftTimeSeries.peakTimes.sw}
                  />
                )}
                {nodePanelGraphVisibility[`driftSE`] && (
                  <MiniTimeSeries
                    data={driftTimeSeries.seValues}
                    times={driftTimeSeries.times}
                    color={storyDriftColor}
                    currentValue={cornerDriftsCurrent.SE ?? 0}
                    unit="percent"
                    label="Drift SE"
                    peakTime={driftTimeSeries.peakTimes.se}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {!animationData.velocityLin && <div className="text-[10px] text-neutral-400 italic">Velocities not loaded</div>}
        {!animationData.accelerationLin && (
          <div className="text-[10px] text-neutral-400 italic">Accelerations not loaded</div>
        )}
      </div>
    </div>
  );
}

export function FloorTab(props: IDockviewPanelHeaderProps<{ storyId: string }>) {
  const storyId = props.params.storyId;
  const color = numberToColor(stringToNumber(storyId));
  const lightColor = numberToColorLight(stringToNumber(storyId));
  const { animationData } = useAnimationData();
  const storyElevations = animationData.precomputed.storyElevations;

  const handleClose = () => {
    props.api.close();
  };

  return (
    <div
      className="flex cursor-grab items-center justify-between border-b px-3 py-2 transition-colors active:cursor-grabbing"
      style={{ backgroundColor: lightColor, borderColor: color }}>
      <div className="pointer-events-none flex items-center gap-2">
        <span className="text-sm font-semibold" style={{ color }}>
          Floor {storyId}
        </span>
        <div className="size-5">
          <IsometricBuilding highlightSliceZ={storyElevations[storyId] ?? undefined} />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={handleClose}
          className="rounded p-1 transition-colors hover:bg-white/50"
          style={{ color }}
          title="Close">
          <XIcon className="size-3" />
        </button>
      </div>
    </div>
  );
}
