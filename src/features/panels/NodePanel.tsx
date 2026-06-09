import { UnitTooltip } from "@/components/ui/unit-tooltip";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { usePlayback } from "@/features/playback/usePlayback";

import { MetricSection } from "@/components/MetricSection";
import { MiniRibbon } from "@/components/MiniRibbon";
import { MiniTimeSeries } from "@/components/MiniTimeSeries";
import { Toggle } from "@/components/ui/toggle";
import { getMetricKeyColor } from "@/features/metrics/metrics";
import { numberToColor, numberToColorLight, threeColorToCSS } from "@/lib/utils";
import { useGlobalStore, useProfileActions, useProfileData } from "@/state";
import { type IDockviewPanelHeaderProps, type IDockviewPanelProps } from "dockview-react";
import { ChartNoAxesCombinedIcon, InfoIcon, TriangleIcon, XIcon } from "lucide-react";
import { useMemo } from "react";
import { Vector3 } from "three";
import { useMetrics } from "../metrics/useMetrics";

export function NodePanel({ params: { nodeId } }: IDockviewPanelProps<{ nodeId: number }>) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const nodePanelGraphVisibility = useProfileData((s) => s.nodePanelGraphVisibility);
  const { toggleNodePanelGraph } = useProfileActions();
  const metricPaletteOverrides = useGlobalStore((s) => s.metricPaletteOverrides);
  const { getNodeColorForMetric } = useMetrics();

  const visualInterpolationEnabled = useProfileData((s) => s.visualInterpolationEnabled);
  const isMissingNode = animationData.metadata.displacementMissingNodeIndices.includes(nodeId);

  const initialPosRaw = animationData.initialPositions.at(nodeId);
  const currentDispRaw = animationData.displacementLin.atFrame(frameIndex).at(nodeId);

  const currentPos = useMemo(
    () =>
      [
        initialPosRaw[0] + currentDispRaw[0],
        initialPosRaw[1] + currentDispRaw[1],
        initialPosRaw[2] + currentDispRaw[2],
      ] as const,
    [initialPosRaw, currentDispRaw]
  );

  // RIBBON PATH
  const ribbonPath = useMemo(() => {
    const accessor = (() => {
      if (!isMissingNode || !visualInterpolationEnabled) return animationData.displacementLin;
      const story = animationData.metadata.nodeToStory[nodeId];
      if (!story) return animationData.displacementLin;
      const storyIndex = animationData.metadata.storyOrder.indexOf(story);
      if (storyIndex === -1) return animationData.displacementLin;
      return {
        atFrame: (frame: number) => ({
          at: (_nodeId: number) => animationData.precomputed.avgDisplacementPerStory.atFrame(frame).at(storyIndex),
        }),
      };
    })();

    const path = new Array(animationData.metadata.frameCount).fill(null).map(() => new Vector3(0, 0, 0));
    for (let i = 0; i < animationData.metadata.frameCount; i++) {
      const pos = accessor.atFrame(i).at(nodeId);
      path[i] = new Vector3(pos[0], pos[1], pos[2]);
    }
    return path;
  }, [animationData, nodeId, isMissingNode, visualInterpolationEnabled]);

  const { precomputed, metadata } = animationData;
  const { frameCount, dt } = metadata;

  // STRUCTURAL INFO
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const storyInfo = useMemo(() => {
    for (const [storyName, nodeIds] of Object.entries(animationData.metadata.stories)) {
      if (nodeIds.includes(nodeId)) {
        const storyIndex = animationData.metadata.storyOrder.indexOf(storyName);
        return {
          story: storyName,
          height: animationData.metadata.storyHeights[storyName],
          elevation: animationData.precomputed.storyElevations[storyName] || 0,
          floorNumber: storyIndex + 1,
          totalFloors: animationData.metadata.storyOrder.length,
        };
      }
    }
    return { story: "Unknown", height: 0, elevation: 0, floorNumber: 0, totalFloors: 0 };
  }, [animationData, nodeId]);

  const cornerInfo = useMemo(() => {
    for (const [cornerName, nodeIds] of Object.entries(animationData.metadata.corners)) {
      if (nodeIds.includes(nodeId)) return cornerName;
    }
    return "Interior";
  }, [nodeId, animationData]);

  // STORY DRIFT
  const storyDrift = useMemo(() => {
    const currentDrift = animationData.storyDrift.get(frameIndex, nodeId) ?? 0;
    const peakDrift = animationData.precomputed.peakStoryDrift[nodeId] ?? 0;
    const peakFrame = animationData.precomputed.peakStoryDriftFrame[nodeId] ?? 0;
    return { current: currentDrift, peak: peakDrift, peakTime: peakFrame * dt };
  }, [frameIndex, animationData, nodeId, dt]);

  const storyDriftTimeSeries = useMemo(() => {
    if (!storyDrift) return null;
    const times: number[] = [];
    const values: number[] = [];
    for (let i = 0; i < frameCount; i++) {
      times.push(i * dt);
      values.push(animationData.storyDrift.get(i, nodeId));
    }
    const peakTime = (animationData.precomputed.peakStoryDriftFrame[nodeId] ?? 0) * dt;
    return { times, values, peakTime };
  }, [animationData, storyDrift, nodeId, frameCount, dt]);

  const storyDriftColor = getMetricKeyColor("interstoryDrift", metricPaletteOverrides);

  // DISTANCE TRAVELED
  const totalDistanceTraveled = useMemo(() => {
    let distance = 0;
    for (let i = 1; i < frameCount; i++) {
      const prev = animationData.displacementLin.atFrame(i - 1).at(nodeId);
      const curr = animationData.displacementLin.atFrame(i).at(nodeId);
      distance += Math.hypot(curr[0] - prev[0], curr[1] - prev[1], curr[2] - prev[2]);
    }
    return distance;
  }, [animationData, nodeId, frameCount]);

  // HINGE ENTRIES
  const hingeEntries = useMemo(() => {
    const nodeToHingeIndexMap = animationData.precomputed.nodeToHingeIndexMap;
    const hingeData = animationData.hingeData;
    if (!nodeToHingeIndexMap || !hingeData) return null;

    const entries: Array<{
      hingeIdx: number;
      endCap: number;
      beamIdx: number;
      maxValue: number;
      minValue: number;
      color: string;
    }> = [];

    const hingesForNode = nodeToHingeIndexMap[nodeId];
    if (!hingesForNode || hingesForNode.length === 0) return null;

    for (const { hingeIdx, endCap } of hingesForNode) {
      const hingeRow = hingeData.getRow(hingeIdx);
      const maxVal = endCap === 1 ? hingeRow.iR3Max : hingeRow.jR3Max;
      const minVal = endCap === 1 ? hingeRow.iR3Min : hingeRow.jR3Min;
      const { color } = getNodeColorForMetric("hingeRotationAbs", hingeIdx, endCap);
      entries.push({
        hingeIdx,
        endCap,
        beamIdx: hingeRow.beamIndex,
        maxValue: maxVal,
        minValue: minVal,
        color: threeColorToCSS(color),
      });
    }

    return entries.length > 0 ? entries : null;
  }, [nodeId, animationData, getNodeColorForMetric]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-3 text-xs *:border-b *:pb-3">
        {/* RIBBON */}
        {!(isMissingNode && !visualInterpolationEnabled) && (
          <div className="animate-fade-in">
            <h3 className="mb-2 text-sm font-bold">Displacement Path</h3>
            <>
              <MiniRibbon
                path={ribbonPath}
                dt={dt}
                frameIndex={frameIndex}
                grayMode={isMissingNode && visualInterpolationEnabled}
              />
              <div className="text-muted-foreground mt-1 flex items-center gap-1 text-[10px] italic">
                <InfoIcon className="size-2.5" />
                {isMissingNode && visualInterpolationEnabled
                  ? "Showing story average displacement"
                  : "Number of points reduced"}
              </div>
            </>
          </div>
        )}

        {/* LOCATION INFO */}
        <div className="animate-fade-in">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-foreground font-medium">Story ID:</span>
              <div className="text-muted-foreground font-mono">{storyInfo.story}</div>
            </div>
            <div>
              <span className="text-foreground font-medium">Corner:</span>
              <div className="text-muted-foreground">{cornerInfo}</div>
            </div>
            <div>
              <span className="text-foreground font-medium">Elevation:</span>
              <div className="text-muted-foreground">
                <UnitTooltip value={storyInfo.elevation / 12} unit="feet" decimals={0} />
              </div>
            </div>
            <div>
              <span className="text-foreground font-medium">Story Height:</span>
              <div className="text-muted-foreground">
                <UnitTooltip value={storyInfo.height / 12} unit="feet" decimals={0} />
              </div>
            </div>
            <div>
              <span className="text-foreground font-medium">Node below:</span>
              <div className="text-muted-foreground">{animationData.metadata.nodeToBelow[nodeId]}</div>
            </div>
          </div>
        </div>

        {/* POSITION */}
        <div className="animate-fade-in">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-foreground font-medium">
                X:{" "}
                <span className="text-muted-foreground font-mono">
                  <UnitTooltip value={currentPos[0]} unit="inches" />
                </span>
              </span>
            </div>
            <div>
              <span className="text-foreground font-medium">
                Y:{" "}
                <span className="text-muted-foreground font-mono">
                  <UnitTooltip value={currentPos[1]} unit="inches" />
                </span>
              </span>
            </div>
            <div>
              <span className="text-foreground font-medium">
                Z:{" "}
                <span className="text-muted-foreground font-mono">
                  <UnitTooltip value={currentPos[2]} unit="inches" />
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* HINGE ROTATION */}
        {hingeEntries && (
          <div className="animate-fade-in">
            <h3 className="text-sm font-bold">Hinge Rotation</h3>
            <div className="space-y-2">
              <div className="mb-0 grid grid-cols-3 items-center gap-2">
                <div className="flex items-center gap-1" />
                <div className="text-right">
                  <div className="text-muted-foreground text-[10px]">Max</div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground text-[10px]">Min</div>
                </div>
              </div>
              {hingeEntries.map((entry) => (
                <div key={entry.hingeIdx} className="grid grid-cols-3 items-center gap-2">
                  <div className="flex items-center gap-1">
                    <TriangleIcon className="text-border size-4" style={{ fill: entry.color }} />
                    <span className="text-foreground">{entry.endCap === 1 ? "I" : "J"}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-foreground font-mono">
                      <UnitTooltip value={entry.maxValue} unit="radians" decimals={4} showConversions={false} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-foreground font-mono">
                      <UnitTooltip value={entry.minValue} unit="radians" decimals={4} showConversions={false} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DISPLACEMENT */}
        {isMissingNode ? (
          <>
            <div className="animate-fade-in">
              <span className="text-muted-foreground text-[10px] italic">Node has no data</span>
            </div>
          </>
        ) : (
          <>
            <MetricSection
              title="Displacement"
              unit="inches"
              graphPrefix="disp"
              nodeId={nodeId}
              accessor={animationData.displacementLin}
              peakComponentValues={[
                precomputed.peakNodeDisplacementX[nodeId],
                precomputed.peakNodeDisplacementY[nodeId],
                precomputed.peakNodeDisplacementZ[nodeId],
              ]}
            />

            {/* ROTATION */}
            <MetricSection
              title="Rotation"
              unit="radians"
              graphPrefix="rot"
              nodeId={nodeId}
              accessor={animationData.displacementRot}
            />

            {/* VELOCITY */}
            <MetricSection
              title="Velocity"
              unit="inches/second"
              graphPrefix="vel"
              nodeId={nodeId}
              accessor={animationData.velocityLin}
            />

            {/* ACCELERATION */}
            <MetricSection
              title="Acceleration"
              unit="inches/second²"
              graphPrefix="acc"
              nodeId={nodeId}
              accessor={animationData.accelerationLin}
            />

            {/* STORY DRIFT */}
            {storyDrift && (
              <div className="animate-fade-in">
                <h3 className="mb-2 text-sm font-bold">Story Drift Ratio</h3>
                <div className="mt-2 space-y-1">
                  <div className="grid grid-cols-2 gap-1">
                    <span className="text-muted-foreground">Current:</span>
                    <span className="text-foreground flex items-end justify-between font-mono">
                      <UnitTooltip value={storyDrift.current} unit="percent" />
                      <Toggle
                        size="icon-xs"
                        pressed={nodePanelGraphVisibility["drift"]}
                        onPressedChange={() => toggleNodePanelGraph("drift")}
                        title={nodePanelGraphVisibility["drift"] ? "Hide graph" : "Show graph"}>
                        <ChartNoAxesCombinedIcon
                          className={`size-4 ${nodePanelGraphVisibility["drift"] ? "text-foreground" : "text-muted-foreground"}`}
                        />
                      </Toggle>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <span className="text-muted-foreground">Peak:</span>
                    <span className="text-foreground flex items-baseline justify-between font-mono">
                      <UnitTooltip value={storyDrift.peak} unit="percent" />
                      <span className="text-muted-foreground text-[9px]"> @ {storyDrift.peakTime.toFixed(2)} s</span>
                    </span>
                  </div>
                </div>
                {storyDriftTimeSeries && nodePanelGraphVisibility["drift"] && (
                  <div className="mt-3 space-y-2">
                    <MiniTimeSeries
                      data={storyDriftTimeSeries.values}
                      times={storyDriftTimeSeries.times}
                      color={storyDriftColor}
                      currentValue={storyDrift.current}
                      unit="percent"
                      label="Story Drift"
                      peakTime={storyDriftTimeSeries.peakTime}
                    />
                  </div>
                )}
              </div>
            )}

            {/* CUMULATIVE STATS */}
            <div className="animate-fade-in">
              <h3 className="mb-2 text-sm font-bold">Total Distance Traveled</h3>
              <div className="text-muted-foreground font-mono">
                <UnitTooltip value={totalDistanceTraveled} unit="inches" />
              </div>
            </div>

            {/* NOT-LOADED NOTICES */}
            <div>
              {!animationData.displacementRot && (
                <div className="text-muted-foreground text-[10px] italic">Rotations not loaded</div>
              )}
              {!animationData.velocityLin && (
                <div className="text-muted-foreground text-[10px] italic">Velocities not loaded</div>
              )}
              {!animationData.accelerationLin && (
                <div className="text-muted-foreground text-[10px] italic">Accelerations not loaded</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function NodeTab(props: IDockviewPanelHeaderProps<{ nodeId: number }>) {
  const nodeId = props.params.nodeId;
  const color = numberToColor(nodeId);
  const lightColor = numberToColorLight(nodeId);

  const handleClose = () => {
    props.api.close();
  };

  return (
    <div
      className="flex h-full cursor-grab items-center justify-between border-b px-3 py-2 transition-colors active:cursor-grabbing"
      style={{ backgroundColor: lightColor, borderColor: color }}>
      <div className="pointer-events-none flex items-center gap-2">
        <span className="text-sm font-semibold" style={{ color }}>
          Node {nodeId}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={handleClose}
          className="hover:bg-background/50 rounded p-1 transition-colors"
          style={{ color }}
          title="Close">
          <XIcon className="size-3" />
        </button>
      </div>
    </div>
  );
}
