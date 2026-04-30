import { usePlayback } from "@/features/playback/PlaybackContext";
import { useAnimationData } from "@/lib/useAnimationData";
// import { buildHingeEnrichedRows } from "@/lib/hingeAnalysis";
import type { IDockviewPanelHeaderProps, IDockviewPanelProps } from "dockview";
import { useMemo } from "react";
import { MiniTimeSeries } from "./MiniTimeSeries";
import { UnitTooltip } from "@/components/ui/unit-tooltip";
// import { FloorTorsionPlanPreview } from "@/features/view-3d/components/FloorTorsionPlanPreview";
// import { computeStoryPlanRotationPeak } from "@/features/view-3d/lib/floorTorsion";
import { getMetricKeyColor } from "@/lib/metrics";
import { useViewStore } from "@/state";
// import { interpolate } from "culori";
import { ChartNoAxesCombinedIcon, XIcon } from "lucide-react";
import { stringToNumber } from "@/lib/utils";
import { IsometricBuilding } from "@/components/IsometricBoundingBox";
import { HingeLocalizedSummary } from "@/features/view-3d/components/HingeLocalizedSummary";

// const torsionColorScale = interpolate(["#2563eb", "#f8fafc", "#dc2626"], "oklab");

// Generate a unique vibrant color based on node ID
export function getFloorColor(storyId: string): string {
  // Use golden ratio for good distribution
  const num: number = stringToNumber(storyId);
  const hue = (num * 137.508) % 360;
  return `hsl(${hue}, 70%, 45%)`;
}

// Generate a lighter version for backgrounds
export function getFloorColorLight(storyId: string): string {
  const num: number = stringToNumber(storyId);
  const hue = (num * 137.508) % 360;

  return `hsl(${hue}, 70%, 90%)`;
}

export function FloorPanel(props: IDockviewPanelProps<{ storyId: string }>) {
  const storyId = props.params.storyId;
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const nodePanelGraphVisibility = useViewStore((s) => s.nodePanelGraphVisibility);
  const toggleNodePanelGraph = useViewStore((s) => s.toggleNodePanelGraph);
  const metricPaletteOverrides = useViewStore((s) => s.metricPaletteOverrides);
  const displacementXColor = getMetricKeyColor("displacementX", metricPaletteOverrides);
  const displacementYColor = getMetricKeyColor("displacementY", metricPaletteOverrides);
  const displacementZColor = getMetricKeyColor("displacementZ", metricPaletteOverrides);
  const velocityXColor = getMetricKeyColor("velocityX", metricPaletteOverrides);
  const velocityYColor = getMetricKeyColor("velocityY", metricPaletteOverrides);
  const velocityZColor = getMetricKeyColor("velocityZ", metricPaletteOverrides);
  const accelerationXColor = getMetricKeyColor("accelerationX", metricPaletteOverrides);
  const accelerationYColor = getMetricKeyColor("accelerationY", metricPaletteOverrides);
  const accelerationZColor = getMetricKeyColor("accelerationZ", metricPaletteOverrides);
  // const rotationXColor = getMetricKeyColor("rotationX", metricPaletteOverrides);
  // const rotationYColor = getMetricKeyColor("rotationY", metricPaletteOverrides);
  // const rotationZColor = getMetricKeyColor("rotationZ", metricPaletteOverrides);
  const storyDriftColor = getMetricKeyColor("interstoryDrift", metricPaletteOverrides);

  const nodeIds = useMemo(
    () => animationData.metadata.stories[storyId] || [],
    [storyId, animationData.metadata.stories]
  );

  // LOCATION INFO
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

  // const floorTorsionPeak = useMemo(
  //   () => computeStoryPlanRotationPeak(animationData, storyId),
  //   [animationData, storyId]
  // );

  // const floorTorsion = useMemo(() => {
  //   const snapshot = buildFloorTorsionSnapshot(animationData, storyId, frameIndex);
  //   if (!snapshot) return null;

  //   const scaleMax = Math.max(Math.abs(snapshot.rotationRad), floorTorsionPeak.peakAbsRad, 1e-6);
  //   const normalized = Math.max(-1, Math.min(1, snapshot.rotationRad / scaleMax));

  //   return {
  //     snapshot,
  //     color: formatHex(torsionColorScale((normalized + 1) / 2)),
  //     colorScaleAbsMax: scaleMax,
  //   };
  // }, [animationData, storyId, frameIndex, floorTorsionPeak]);

  // const hingeSliceSummary = useMemo(() => {
  //   const hingeData = animationData.hingeData;
  //   if (!hingeData) return null;

  //   const rows = buildHingeEnrichedRows(hingeData, animationData.beamData);
  //   if (rows.length === 0) return null;

  //   let maxOnlyCount = 0;
  //   let ge1 = 0;
  //   let ge2 = 0;
  //   let ge4 = 0;
  //   let maxCritical = 0;
  //   const topRows = rows
  //     .filter((row) => row.stepType === "Max")
  //     .slice()
  //     .sort((a, b) => b.criticalDcr - a.criticalDcr)
  //     .slice(0, 5);

  //   for (const row of rows) {
  //     if (row.stepType !== "Max") continue;
  //     maxOnlyCount += 1;
  //     if (row.criticalDcr > maxCritical) maxCritical = row.criticalDcr;
  //     if (row.criticalDcr >= 1) ge1 += 1;
  //     if (row.criticalDcr >= 2) ge2 += 1;
  //     if (row.criticalDcr >= 4) ge4 += 1;
  //   }

  //   const dcrSummaryMax = hingeData.metadata.summary?.metrics.max_pos_deform_dc_ratio?.max;
  //   const dcrSummaryMin = hingeData.metadata.summary?.metrics.max_pos_deform_dc_ratio?.min;
  //   const negDcrSummaryMax = hingeData.metadata.summary?.metrics.max_neg_deform_dc_ratio?.max;
  //   const negDcrSummaryMin = hingeData.metadata.summary?.metrics.max_neg_deform_dc_ratio?.min;
  //   const p95Approx = Math.max(
  //     dcrSummaryMax?.p95 ?? 0,
  //     dcrSummaryMin?.p95 ?? 0,
  //     negDcrSummaryMax?.p95 ?? 0,
  //     negDcrSummaryMin?.p95 ?? 0
  //   );

  //   return {
  //     totalRows: rows.length,
  //     maxOnlyCount,
  //     ge1,
  //     ge2,
  //     ge4,
  //     maxCritical,
  //     p95Approx,
  //     topRows,
  //   };
  // }, [animationData.hingeData, animationData.beamData]);

  // DISPLACEMENT
  const displacementData = useMemo(() => {
    const nodeCount = nodeIds.length;
    if (nodeCount === 0) return null;

    let totalMag = 0;
    let maxMag = 0;
    let maxMagFrame = 0;
    let maxX = 0,
      maxY = 0,
      maxZ = 0;
    let maxXFrame = 0,
      maxYFrame = 0,
      maxZFrame = 0;
    let sumX = 0,
      sumY = 0,
      sumZ = 0;

    for (let f = 0; f < animationData.metadata.frameCount; f++) {
      let frameMag = 0;
      let frameX = 0,
        frameY = 0,
        frameZ = 0;

      for (const nodeId of nodeIds) {
        const disp = animationData.displacementLin.atFrame(f).at(nodeId);
        frameMag += Math.hypot(disp[0], disp[1], disp[2]);
        frameX += disp[0];
        frameY += disp[1];
        frameZ += disp[2];
      }

      const avgMag = frameMag / nodeCount;
      const avgX = frameX / nodeCount;
      const avgY = frameY / nodeCount;
      const avgZ = frameZ / nodeCount;

      if (avgMag > maxMag) {
        maxMag = avgMag;
        maxMagFrame = f;
      }
      if (Math.abs(avgX) > Math.abs(maxX)) {
        maxX = avgX;
        maxXFrame = f;
      }
      if (Math.abs(avgY) > Math.abs(maxY)) {
        maxY = avgY;
        maxYFrame = f;
      }
      if (Math.abs(avgZ) > Math.abs(maxZ)) {
        maxZ = avgZ;
        maxZFrame = f;
      }
    }

    const currentDisp = animationData.displacementLin.atFrame(frameIndex);
    for (const nodeId of nodeIds) {
      const disp = currentDisp.at(nodeId);
      totalMag += Math.hypot(disp[0], disp[1], disp[2]);
      sumX += disp[0];
      sumY += disp[1];
      sumZ += disp[2];
    }

    return {
      current: {
        magnitude: totalMag / nodeCount,
        x: sumX / nodeCount,
        y: sumY / nodeCount,
        z: sumZ / nodeCount,
      },
      peak: {
        magnitude: maxMag,
        magnitudeTime: maxMagFrame * animationData.metadata.dt,
        x: maxX,
        xTime: maxXFrame * animationData.metadata.dt,
        y: maxY,
        yTime: maxYFrame * animationData.metadata.dt,
        z: maxZ,
        zTime: maxZFrame * animationData.metadata.dt,
      },
    };
  }, [nodeIds, animationData, frameIndex]);

  // VELOCITY
  const velocityData = useMemo(() => {
    if (!animationData.velocityLin || nodeIds.length === 0) return null;

    let maxMag = 0,
      maxMagFrame = 0;
    let maxX = 0,
      maxY = 0,
      maxZ = 0;
    let maxXFrame = 0,
      maxYFrame = 0,
      maxZFrame = 0;

    const nodeCount = nodeIds.length;

    for (let f = 0; f < animationData.metadata.frameCount; f++) {
      let frameMag = 0;
      let frameX = 0,
        frameY = 0,
        frameZ = 0;

      for (const nodeId of nodeIds) {
        const vel = animationData.velocityLin.atFrame(f).at(nodeId);
        frameMag += Math.hypot(vel[0], vel[1], vel[2]);
        frameX += vel[0];
        frameY += vel[1];
        frameZ += vel[2];
      }

      const avgMag = frameMag / nodeCount;
      const avgX = frameX / nodeCount;
      const avgY = frameY / nodeCount;
      const avgZ = frameZ / nodeCount;

      if (avgMag > maxMag) {
        maxMag = avgMag;
        maxMagFrame = f;
      }
      if (Math.abs(avgX) > Math.abs(maxX)) {
        maxX = avgX;
        maxXFrame = f;
      }
      if (Math.abs(avgY) > Math.abs(maxY)) {
        maxY = avgY;
        maxYFrame = f;
      }
      if (Math.abs(avgZ) > Math.abs(maxZ)) {
        maxZ = avgZ;
        maxZFrame = f;
      }
    }

    const currentVel = animationData.velocityLin.atFrame(frameIndex);
    let sumMag = 0,
      sumX = 0,
      sumY = 0,
      sumZ = 0;

    for (const nodeId of nodeIds) {
      const vel = currentVel.at(nodeId);
      sumMag += Math.hypot(vel[0], vel[1], vel[2]);
      sumX += vel[0];
      sumY += vel[1];
      sumZ += vel[2];
    }

    return {
      current: {
        magnitude: sumMag / nodeCount,
        x: sumX / nodeCount,
        y: sumY / nodeCount,
        z: sumZ / nodeCount,
      },
      peak: {
        magnitude: maxMag,
        magnitudeTime: maxMagFrame * animationData.metadata.dt,
        x: maxX,
        xTime: maxXFrame * animationData.metadata.dt,
        y: maxY,
        yTime: maxYFrame * animationData.metadata.dt,
        z: maxZ,
        zTime: maxZFrame * animationData.metadata.dt,
      },
    };
  }, [nodeIds, animationData, frameIndex]);

  // ACCELERATION
  const accelerationData = useMemo(() => {
    if (!animationData.accelerationLin || nodeIds.length === 0) return null;

    let maxMag = 0,
      maxMagFrame = 0;
    let maxX = 0,
      maxY = 0,
      maxZ = 0;
    let maxXFrame = 0,
      maxYFrame = 0,
      maxZFrame = 0;

    const nodeCount = nodeIds.length;

    for (let f = 0; f < animationData.metadata.frameCount; f++) {
      let frameMag = 0;
      let frameX = 0,
        frameY = 0,
        frameZ = 0;

      for (const nodeId of nodeIds) {
        const acc = animationData.accelerationLin.atFrame(f).at(nodeId);
        frameMag += Math.hypot(acc[0], acc[1], acc[2]);
        frameX += acc[0];
        frameY += acc[1];
        frameZ += acc[2];
      }

      const avgMag = frameMag / nodeCount;
      const avgX = frameX / nodeCount;
      const avgY = frameY / nodeCount;
      const avgZ = frameZ / nodeCount;

      if (avgMag > maxMag) {
        maxMag = avgMag;
        maxMagFrame = f;
      }
      if (Math.abs(avgX) > Math.abs(maxX)) {
        maxX = avgX;
        maxXFrame = f;
      }
      if (Math.abs(avgY) > Math.abs(maxY)) {
        maxY = avgY;
        maxYFrame = f;
      }
      if (Math.abs(avgZ) > Math.abs(maxZ)) {
        maxZ = avgZ;
        maxZFrame = f;
      }
    }

    const currentAcc = animationData.accelerationLin.atFrame(frameIndex);
    let sumMag = 0,
      sumX = 0,
      sumY = 0,
      sumZ = 0;

    for (const nodeId of nodeIds) {
      const acc = currentAcc.at(nodeId);
      sumMag += Math.hypot(acc[0], acc[1], acc[2]);
      sumX += acc[0];
      sumY += acc[1];
      sumZ += acc[2];
    }

    return {
      current: {
        magnitude: sumMag / nodeCount,
        x: sumX / nodeCount,
        y: sumY / nodeCount,
        z: sumZ / nodeCount,
      },
      peak: {
        magnitude: maxMag,
        magnitudeTime: maxMagFrame * animationData.metadata.dt,
        x: maxX,
        xTime: maxXFrame * animationData.metadata.dt,
        y: maxY,
        yTime: maxYFrame * animationData.metadata.dt,
        z: maxZ,
        zTime: maxZFrame * animationData.metadata.dt,
      },
    };
  }, [nodeIds, animationData, frameIndex]);

  // CORNER DRIFT VALUES
  const cornerDrifts = useMemo(() => {
    const cornerNodes = animationData.metadata.cornerNodes[storyId];

    const cornerData: Record<string, { current: number; peak: number; peakTime: number }> = {};

    for (const corner in cornerNodes) {
      const nodeId = cornerNodes[corner as keyof typeof cornerNodes];
      const currentDrift = animationData.storyDrift.get(frameIndex, nodeId);
      const peakDrift = animationData.precomputed.peakStoryDrift[nodeId];
      const peakDriftFrame = animationData.precomputed.peakStoryDriftFrame[nodeId];

      cornerData[corner] = {
        current: currentDrift ?? 0,
        peak: peakDrift ?? 0,
        peakTime: (peakDriftFrame ?? 0) * animationData.metadata.dt,
      };
    }

    return cornerData;
  }, [storyId, animationData, frameIndex]);

  // TIME SERIES FOR MINI CHARTS
  const displacementTimeSeries = useMemo(() => {
    const times: number[] = [];
    const magnitudes: number[] = [];
    const xValues: number[] = [];
    const yValues: number[] = [];
    const zValues: number[] = [];

    for (let f = 0; f < animationData.metadata.frameCount; f++) {
      times.push(f * animationData.metadata.dt);
      let frameMag = 0;
      let frameX = 0;
      let frameY = 0;
      let frameZ = 0;
      for (const nodeId of nodeIds) {
        const disp = animationData.displacementLin.atFrame(f).at(nodeId);
        frameMag += Math.hypot(disp[0], disp[1], disp[2]);
        frameX += disp[0];
        frameY += disp[1];
        frameZ += disp[2];
      }
      magnitudes.push(frameMag / nodeIds.length);
      xValues.push(frameX / nodeIds.length);
      yValues.push(frameY / nodeIds.length);
      zValues.push(frameZ / nodeIds.length);
    }

    const getPeakTime = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const maxIdx = arr.reduce((maxIdx, val, idx, arr) => (val > arr[maxIdx] ? idx : maxIdx), 0);
      return times[maxIdx];
    };
    return {
      times,
      magnitudes,
      xValues,
      yValues,
      zValues,
      peakTimes: {
        magnitudes: getPeakTime(magnitudes),
        x: getPeakTime(xValues),
        y: getPeakTime(yValues),
        z: getPeakTime(zValues),
      },
    };
  }, [nodeIds, animationData.metadata.frameCount, animationData.metadata.dt, animationData.displacementLin]);

  const velocityTimeSeries = useMemo(() => {
    if (!animationData.velocityLin) return null;
    const times: number[] = [];
    const magnitudes: number[] = [];
    const xValues: number[] = [];
    const yValues: number[] = [];
    const zValues: number[] = [];

    for (let f = 0; f < animationData.metadata.frameCount; f++) {
      times.push(f * animationData.metadata.dt);
      let frameMag = 0;
      let frameX = 0;
      let frameY = 0;
      let frameZ = 0;
      for (const nodeId of nodeIds) {
        const vel = animationData.velocityLin.atFrame(f).at(nodeId);
        frameMag += Math.hypot(vel[0], vel[1], vel[2]);
        frameX += vel[0];
        frameY += vel[1];
        frameZ += vel[2];
      }
      magnitudes.push(frameMag / nodeIds.length);
      xValues.push(frameX / nodeIds.length);
      yValues.push(frameY / nodeIds.length);
      zValues.push(frameZ / nodeIds.length);
    }

    const getPeakTime = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const maxIdx = arr.reduce((maxIdx, val, idx, arr) => (val > arr[maxIdx] ? idx : maxIdx), 0);
      return times[maxIdx];
    };
    return {
      times,
      magnitudes,
      xValues,
      yValues,
      zValues,
      peakTimes: {
        magnitudes: getPeakTime(magnitudes),
        x: getPeakTime(xValues),
        y: getPeakTime(yValues),
        z: getPeakTime(zValues),
      },
    };
  }, [animationData.velocityLin, nodeIds, animationData.metadata.frameCount, animationData.metadata.dt]);

  const accelerationTimeSeries = useMemo(() => {
    if (!animationData.accelerationLin) return null;
    const times: number[] = [];
    const magnitudes: number[] = [];
    const xValues: number[] = [];
    const yValues: number[] = [];
    const zValues: number[] = [];

    for (let f = 0; f < animationData.metadata.frameCount; f++) {
      times.push(f * animationData.metadata.dt);
      let frameMag = 0;
      let frameX = 0;
      let frameY = 0;
      let frameZ = 0;
      for (const nodeId of nodeIds) {
        const acc = animationData.accelerationLin.atFrame(f).at(nodeId);
        frameMag += Math.hypot(acc[0], acc[1], acc[2]);
        frameX += acc[0];
        frameY += acc[1];
        frameZ += acc[2];
      }
      magnitudes.push(frameMag / nodeIds.length);
      xValues.push(frameX / nodeIds.length);
      yValues.push(frameY / nodeIds.length);
      zValues.push(frameZ / nodeIds.length);
    }

    const getPeakTime = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const maxIdx = arr.reduce((maxIdx, val, idx, arr) => (val > arr[maxIdx] ? idx : maxIdx), 0);
      return times[maxIdx];
    };
    return {
      times,
      magnitudes,
      xValues,
      yValues,
      zValues,
      peakTimes: {
        magnitudes: getPeakTime(magnitudes),
        x: getPeakTime(xValues),
        y: getPeakTime(yValues),
        z: getPeakTime(zValues),
      },
    };
  }, [animationData.accelerationLin, nodeIds, animationData.metadata.frameCount, animationData.metadata.dt]);

  const driftTimeSeries = useMemo(() => {
    const times: number[] = [];
    const nwValues: number[] = [];
    const neValues: number[] = [];
    const swValues: number[] = [];
    const seValues: number[] = [];

    const cornerNodes = animationData.metadata.cornerNodes[storyId];

    for (let f = 0; f < animationData.metadata.frameCount; f++) {
      times.push(f * animationData.metadata.dt);
      nwValues.push(animationData.storyDrift.get(f, cornerNodes.NW));
      neValues.push(animationData.storyDrift.get(f, cornerNodes.NE));
      swValues.push(animationData.storyDrift.get(f, cornerNodes.SW));
      seValues.push(animationData.storyDrift.get(f, cornerNodes.SE));
    }

    const peakTimes = {
      nw: (animationData.precomputed.peakStoryDriftFrame[cornerNodes.NW] ?? 0) * animationData.metadata.dt,
      ne: (animationData.precomputed.peakStoryDriftFrame[cornerNodes.NE] ?? 0) * animationData.metadata.dt,
      sw: (animationData.precomputed.peakStoryDriftFrame[cornerNodes.SW] ?? 0) * animationData.metadata.dt,
      se: (animationData.precomputed.peakStoryDriftFrame[cornerNodes.SE] ?? 0) * animationData.metadata.dt,
    };

    return {
      times,
      nwValues,
      neValues,
      swValues,
      seValues,
      peakTimes,
    };
  }, [animationData, storyId]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-3 text-xs *:border-b *:pb-3">
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
                <UnitTooltip value={storyInfo.elevation} unit="in" decimals={1} />
              </div>
            </div>
            <div>
              <span className="font-medium text-neutral-700">Story Height:</span>
              <div className="text-neutral-600">
                <UnitTooltip value={storyInfo.height} unit="in" decimals={1} />
              </div>
            </div>
          </div>
        </div>

        {/* {floorTorsion && (
          <div className="animate-fade-in">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold">Floor Torsion (Top-Down)</h3>
              <span className="text-[10px] text-neutral-500">X-Y plan (Z vertical)</span>
            </div>
            <div className="rounded border border-neutral-200 bg-neutral-50 p-2">
              <div className="h-32 w-full rounded border border-neutral-100 bg-white">
                <FloorTorsionPlanPreview
                  snapshot={floorTorsion.snapshot}
                  fill={floorTorsion.color}
                  className="h-full w-full"
                  label={`Story ${storyId} floor torsion preview`}
                />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <div className="text-neutral-500">Current Rotation</div>
                  <div className="font-mono text-neutral-800">
                    <UnitTooltip value={floorTorsion.snapshot.rotationRad} unit="rad" />
                  </div>
                </div>
                <div>
                  <div className="text-neutral-500">Peak |Rotation|</div>
                  <div className="font-mono text-neutral-800">
                    <UnitTooltip value={floorTorsionPeak.peakAbsRad} unit="rad" />
                  </div>
                  <div className="text-neutral-400">
                    @ {(floorTorsionPeak.peakFrameIndex * animationData.metadata.dt).toFixed(2)} s
                  </div>
                </div>
                <div>
                  <div className="text-neutral-500">Peak Signed Rotation</div>
                  <div className="font-mono text-neutral-800">
                    <UnitTooltip value={floorTorsionPeak.peakSignedRad} unit="rad" />
                  </div>
                </div>
                <div>
                  <div className="text-neutral-500">Color Scale (rad)</div>
                  <div
                    className="mt-1 h-2 rounded border border-neutral-200"
                    style={{
                      background: "linear-gradient(90deg, #2563eb 0%, #f8fafc 50%, #dc2626 100%)",
                    }}
                    title={`Rotation color scale ±${floorTorsion.colorScaleAbsMax.toFixed(2)} rad`}
                  />
                  <div className="mt-1 font-mono text-[9px] text-neutral-500">
                    ±{floorTorsion.colorScaleAbsMax.toFixed(2)} rad
                  </div>
                </div>
              </div>
            </div>
          </div>
        )} */}

        {animationData.precomputed.hingeNodeMetrics && (
          <div className="animate-fade-in">
            <HingeLocalizedSummary
              title="Static Hinge Rotation"
              subtitle="Hinge data localized to this floor's nodes."
              nodeIds={nodeIds}
            />
          </div>
        )}

        {/* DISPLACEMENT */}
        {displacementData && (
          <div className="animate-fade-in">
            <h3 className="mb-2 text-sm font-bold">Displacement</h3>
            {/* <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium text-neutral-700">Current Avg:</span>
                <div className="font-mono text-neutral-600">
                  <UnitTooltip value={displacementData.current.magnitude} unit="in" />
                </div>
              </div>
              <div>
                <span className="font-medium text-neutral-700">Peak Avg:</span>
                <div className="font-mono text-neutral-600">
                  <UnitTooltip value={displacementData.peak.magnitude} unit="in" />
                </div>
                <span className="text-[9px] text-neutral-500">
                  {" "}
                  @ {displacementData.peak.magnitudeTime.toFixed(2)} s
                </span>
              </div>
            </div> */}
            <div className="mt-2 space-y-1">
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current X:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={displacementData.current.x} unit="in" />
                  <button
                    onClick={() => toggleNodePanelGraph("dispX")}
                    className="rounded p-0.5 transition-colors hover:bg-neutral-200"
                    title={nodePanelGraphVisibility[`dispX`] ? "Hide graph" : "Show graph"}>
                    <ChartNoAxesCombinedIcon
                      className={`size-4 ${nodePanelGraphVisibility[`dispX`] ? "text-blue-500" : "text-neutral-300"}`}
                    />
                  </button>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Peak X:</span>
                <span className="flex items-baseline justify-between font-mono text-neutral-800">
                  <UnitTooltip value={displacementData.peak.x} unit="in" />
                  <span className="text-[9px] text-neutral-500"> @ {displacementData.peak.xTime.toFixed(2)} s</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current Y:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={displacementData.current.y} unit="in" />
                  <button
                    onClick={() => toggleNodePanelGraph("dispY")}
                    className="rounded p-0.5 transition-colors hover:bg-neutral-200"
                    title={nodePanelGraphVisibility[`dispY`] ? "Hide graph" : "Show graph"}>
                    <ChartNoAxesCombinedIcon
                      className={`size-4 ${nodePanelGraphVisibility[`dispY`] ? "text-blue-500" : "text-neutral-300"}`}
                    />
                  </button>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Peak Y:</span>
                <span className="flex items-baseline justify-between font-mono text-neutral-800">
                  <UnitTooltip value={displacementData.peak.y} unit="in" />
                  <span className="text-[9px] text-neutral-500"> @ {displacementData.peak.yTime.toFixed(2)} s</span>
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <span className="text-neutral-600">Current Z:</span>
              <span className="flex items-end justify-between font-mono text-neutral-800">
                <UnitTooltip value={displacementData.current.z} unit="in" />
                <button
                  onClick={() => toggleNodePanelGraph("dispZ")}
                  className="rounded p-0.5 transition-colors hover:bg-neutral-200"
                  title={nodePanelGraphVisibility[`dispZ`] ? "Hide graph" : "Show graph"}>
                  <ChartNoAxesCombinedIcon
                    className={`size-4 ${nodePanelGraphVisibility[`dispZ`] ? "text-blue-500" : "text-neutral-300"}`}
                  />
                </button>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <span className="text-neutral-600">Peak Z:</span>
              <span className="flex items-baseline justify-between font-mono text-neutral-800">
                <UnitTooltip value={displacementData.peak.z} unit="in" />
                <span className="text-[9px] text-neutral-500"> @ {displacementData.peak.zTime.toFixed(2)} s</span>
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {nodePanelGraphVisibility[`dispX`] && (
                <MiniTimeSeries
                  data={displacementTimeSeries.xValues}
                  times={displacementTimeSeries.times}
                  color={displacementXColor}
                  currentValue={displacementData.current.x}
                  unit="in"
                  label="Displacement X"
                  peakTime={displacementTimeSeries.peakTimes.x}
                />
              )}
              {nodePanelGraphVisibility[`dispY`] && (
                <MiniTimeSeries
                  data={displacementTimeSeries.yValues}
                  times={displacementTimeSeries.times}
                  color={displacementYColor}
                  currentValue={displacementData.current.y}
                  unit="in"
                  label="Displacement Y"
                  peakTime={displacementTimeSeries.peakTimes.y}
                />
              )}
              {nodePanelGraphVisibility[`dispZ`] && (
                <MiniTimeSeries
                  data={displacementTimeSeries.zValues}
                  times={displacementTimeSeries.times}
                  color={displacementZColor}
                  currentValue={displacementData.current.z}
                  unit="in"
                  label="Displacement Z"
                  peakTime={displacementTimeSeries.peakTimes.z}
                />
              )}
            </div>
          </div>
        )}

        {/* VELOCITY */}
        {velocityData && (
          <div className="animate-fade-in">
            <h3 className="mb-2 text-sm font-bold">Velocity</h3>

            <div className="mt-2 space-y-1">
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current X:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={velocityData.current.x} unit="in/s" />
                  <button
                    onClick={() => toggleNodePanelGraph("velX")}
                    className="rounded p-0.5 transition-colors hover:bg-neutral-200"
                    title={nodePanelGraphVisibility[`velX`] ? "Hide graph" : "Show graph"}>
                    <ChartNoAxesCombinedIcon
                      className={`size-4 ${nodePanelGraphVisibility[`velX`] ? "text-blue-500" : "text-neutral-300"}`}
                    />
                  </button>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Peak X:</span>
                <span className="flex items-baseline justify-between font-mono text-neutral-800">
                  <UnitTooltip value={velocityData.peak.x} unit="in/s" />
                  <span className="text-[9px] text-neutral-500">@ {velocityData.peak.xTime.toFixed(2)} s</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current Y:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={velocityData.current.y} unit="in/s" />
                  <button
                    onClick={() => toggleNodePanelGraph("velY")}
                    className="rounded p-0.5 transition-colors hover:bg-neutral-200"
                    title={nodePanelGraphVisibility[`velY`] ? "Hide graph" : "Show graph"}>
                    <ChartNoAxesCombinedIcon
                      className={`size-4 ${nodePanelGraphVisibility[`velY`] ? "text-blue-500" : "text-neutral-300"}`}
                    />
                  </button>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Peak Y:</span>
                <span className="flex items-baseline justify-between font-mono text-neutral-800">
                  <UnitTooltip value={velocityData.peak.y} unit="in/s" />
                  <span className="text-[9px] text-neutral-500">@ {velocityData.peak.yTime.toFixed(2)} s</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current Z:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={velocityData.current.z} unit="in/s" />
                  <button
                    onClick={() => toggleNodePanelGraph("velZ")}
                    className="rounded p-0.5 transition-colors hover:bg-neutral-200"
                    title={nodePanelGraphVisibility[`velZ`] ? "Hide graph" : "Show graph"}>
                    <ChartNoAxesCombinedIcon
                      className={`size-4 ${nodePanelGraphVisibility[`velZ`] ? "text-blue-500" : "text-neutral-300"}`}
                    />
                  </button>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Peak Z:</span>
                <span className="flex items-baseline justify-between font-mono text-neutral-800">
                  <UnitTooltip value={velocityData.peak.z} unit="in/s" />
                  <span className="text-[9px] text-neutral-500">@ {velocityData.peak.zTime.toFixed(2)} s</span>
                </span>
              </div>
            </div>
            {velocityTimeSeries && (
              <div className="mt-3 space-y-2">
                {nodePanelGraphVisibility[`velX`] && (
                  <MiniTimeSeries
                    data={velocityTimeSeries.xValues}
                    times={velocityTimeSeries.times}
                    color={velocityXColor}
                    currentValue={velocityData.current.x}
                    unit="in/s"
                    label="Velocity X"
                    peakTime={velocityTimeSeries.peakTimes.x}
                  />
                )}
                {nodePanelGraphVisibility[`velY`] && (
                  <MiniTimeSeries
                    data={velocityTimeSeries.yValues}
                    times={velocityTimeSeries.times}
                    color={velocityYColor}
                    currentValue={velocityData.current.y}
                    unit="in/s"
                    label="Velocity Y"
                    peakTime={velocityTimeSeries.peakTimes.y}
                  />
                )}
                {nodePanelGraphVisibility[`velZ`] && (
                  <MiniTimeSeries
                    data={velocityTimeSeries.zValues}
                    times={velocityTimeSeries.times}
                    color={velocityZColor}
                    currentValue={velocityData.current.z}
                    unit="in/s"
                    label="Velocity Z"
                    peakTime={velocityTimeSeries.peakTimes.z}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* ACCELERATION */}
        {accelerationData && (
          <div className="animate-fade-in">
            <h3 className="mb-2 text-sm font-bold">Acceleration</h3>

            <div className="mt-2 space-y-1">
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current X:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={accelerationData.current.x} unit="in/s²" />
                  <button
                    onClick={() => toggleNodePanelGraph("accX")}
                    className="rounded p-0.5 transition-colors hover:bg-neutral-200"
                    title={nodePanelGraphVisibility[`accX`] ? "Hide graph" : "Show graph"}>
                    <ChartNoAxesCombinedIcon
                      className={`size-4 ${nodePanelGraphVisibility[`accX`] ? "text-blue-500" : "text-neutral-300"}`}
                    />
                  </button>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Peak X:</span>
                <span className="flex items-baseline justify-between font-mono text-neutral-800">
                  <UnitTooltip value={accelerationData.peak.x} unit="in/s²" />
                  <span className="text-[9px] text-neutral-500">@ {accelerationData.peak.xTime.toFixed(2)} s</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current Y:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={accelerationData.current.y} unit="in/s²" />
                  <button
                    onClick={() => toggleNodePanelGraph("accY")}
                    className="rounded p-0.5 transition-colors hover:bg-neutral-200"
                    title={nodePanelGraphVisibility[`accY`] ? "Hide graph" : "Show graph"}>
                    <ChartNoAxesCombinedIcon
                      className={`size-4 ${nodePanelGraphVisibility[`accY`] ? "text-blue-500" : "text-neutral-300"}`}
                    />
                  </button>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Peak Y:</span>
                <span className="flex items-baseline justify-between font-mono text-neutral-800">
                  <UnitTooltip value={accelerationData.peak.y} unit="in/s²" />
                  <span className="text-[9px] text-neutral-500">@ {accelerationData.peak.yTime.toFixed(2)} s</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current Z:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={accelerationData.current.z} unit="in/s²" />
                  <button
                    onClick={() => toggleNodePanelGraph("accZ")}
                    className="rounded p-0.5 transition-colors hover:bg-neutral-200"
                    title={nodePanelGraphVisibility[`accZ`] ? "Hide graph" : "Show graph"}>
                    <ChartNoAxesCombinedIcon
                      className={`size-4 ${nodePanelGraphVisibility[`accZ`] ? "text-blue-500" : "text-neutral-300"}`}
                    />
                  </button>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Peak Z:</span>
                <span className="flex items-baseline justify-between font-mono text-neutral-800">
                  <UnitTooltip value={accelerationData.peak.z} unit="in/s²" />
                  <span className="text-[9px] text-neutral-500">@ {accelerationData.peak.zTime.toFixed(2)} s</span>
                </span>
              </div>
            </div>
            {accelerationTimeSeries && (
              <div className="mt-3 space-y-2">
                {nodePanelGraphVisibility[`accX`] && (
                  <MiniTimeSeries
                    data={accelerationTimeSeries.xValues}
                    times={accelerationTimeSeries.times}
                    color={accelerationXColor}
                    currentValue={accelerationData.current.x}
                    unit="in/s²"
                    label="Acceleration X"
                    peakTime={accelerationTimeSeries.peakTimes.x}
                  />
                )}
                {nodePanelGraphVisibility[`accY`] && (
                  <MiniTimeSeries
                    data={accelerationTimeSeries.yValues}
                    times={accelerationTimeSeries.times}
                    color={accelerationYColor}
                    currentValue={accelerationData.current.y}
                    unit="in/s²"
                    label="Acceleration Y"
                    peakTime={accelerationTimeSeries.peakTimes.y}
                  />
                )}
                {nodePanelGraphVisibility[`accZ`] && (
                  <MiniTimeSeries
                    data={accelerationTimeSeries.zValues}
                    times={accelerationTimeSeries.times}
                    color={accelerationZColor}
                    currentValue={accelerationData.current.z}
                    unit="in/s²"
                    label="Acceleration Z"
                    peakTime={accelerationTimeSeries.peakTimes.z}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* CORNER DRIFTS */}
        {cornerDrifts && (
          <div className="animate-fade-in">
            <h3 className="mb-2 text-sm font-bold">Story Drifts</h3>
            <div className="space-y-1">
              {Object.entries(cornerDrifts).map(([corner, data]) => (
                <div key={corner} className="flex items-center gap-2">
                  <span className="w-8 font-medium text-neutral-700">{corner}:</span>
                  {data ? (
                    <div className="font-mono text-[10px] text-neutral-600">
                      <span className="mr-1">Current:</span>
                      <UnitTooltip value={data.current} unit="%" />
                      <span className="mx-2 text-neutral-300">|</span>
                      <span className="mr-1">Peak:</span>
                      <UnitTooltip value={data.peak} unit="%" />
                      <span className="text-[9px] text-neutral-500">@ {data.peakTime.toFixed(2)} s</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-neutral-400">N/A</div>
                  )}
                </div>
              ))}
            </div>
            {driftTimeSeries && (
              <div className="mt-3 space-y-2">
                {nodePanelGraphVisibility[`driftNW`] && (
                  <MiniTimeSeries
                    data={driftTimeSeries.nwValues}
                    times={driftTimeSeries.times}
                    color={storyDriftColor}
                    currentValue={cornerDrifts.NW?.current ?? 0}
                    unit="%"
                    label="Drift NW"
                    peakTime={driftTimeSeries.peakTimes.nw}
                  />
                )}
                {nodePanelGraphVisibility[`driftNE`] && (
                  <MiniTimeSeries
                    data={driftTimeSeries.neValues}
                    times={driftTimeSeries.times}
                    color={storyDriftColor}
                    currentValue={cornerDrifts.NE?.current ?? 0}
                    unit="%"
                    label="Drift NE"
                    peakTime={driftTimeSeries.peakTimes.ne}
                  />
                )}
                {nodePanelGraphVisibility[`driftSW`] && (
                  <MiniTimeSeries
                    data={driftTimeSeries.swValues}
                    times={driftTimeSeries.times}
                    color={storyDriftColor}
                    currentValue={cornerDrifts.SW?.current ?? 0}
                    unit="%"
                    label="Drift SW"
                    peakTime={driftTimeSeries.peakTimes.sw}
                  />
                )}
                {nodePanelGraphVisibility[`driftSE`] && (
                  <MiniTimeSeries
                    data={driftTimeSeries.seValues}
                    times={driftTimeSeries.times}
                    color={storyDriftColor}
                    currentValue={cornerDrifts.SE?.current ?? 0}
                    unit="%"
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
  const color = getFloorColor(storyId);
  const lightColor = getFloorColorLight(storyId);
  const { animationData } = useAnimationData();
  const storyElevations = animationData.precomputed.storyElevations;
  console.log(storyId, storyElevations);

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
