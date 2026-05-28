import { AveragedMetricSection } from "@/components/AveragedMetricSection";
import { HingeLocalizedSummary } from "@/components/HingeLocalizedSummary";
import { IsometricBuilding } from "@/components/IsometricBoundingBox";
import { UnitTooltip } from "@/components/ui/unit-tooltip";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { numberToColor, numberToColorLight } from "@/lib/utils";
import type { IDockviewPanelHeaderProps, IDockviewPanelProps } from "dockview-react";
import { XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SectionVisualization } from "../3d/renderers/SectionVisualization";
import { Button } from "@/components/ui/button";

export interface CrossSectionParams {
  crossSectionType: "X" | "Y";
  position: string;
}

export function CrossSectionPanel(props: IDockviewPanelProps<CrossSectionParams>) {
  const { crossSectionType, position } = props.params;
  const positionNumber = Number(position);
  const { animationData } = useAnimationData();
  const nodeIds =
    crossSectionType === "X"
      ? animationData.metadata.crossSectionsX[position]
      : animationData.metadata.crossSectionsY[position];

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

  return (
    <div className="flex h-full w-full flex-col">
      <div className="scrollbar-gutter-stable flex-1 space-y-2 overflow-y-scroll p-3 text-xs">
        {/* LOCATION INFO */}
        <div className="animate-fade-in w-full" ref={containerRef}>
          <SectionVisualization nodeIds={nodeIds} width={dimensions} viewMode={crossSectionType === "X" ? "x" : "y"} />
        </div>{" "}
        <div className="animate-fade-in grid grid-cols-2 gap-2">
          {/* LOCATION INFO */}
          <div>
            <span className="text-foreground font-medium">{crossSectionType} Position:</span>
            <div className="text-muted-foreground">
              <UnitTooltip value={positionNumber} unit="inches" decimals={1} />
            </div>
          </div>
          <div>
            <span className="text-foreground font-medium">Nodes:</span>
            <div className="text-muted-foreground">{nodeIds.length}</div>
          </div>
        </div>
        {animationData.precomputed.hingeNodeMetrics && (
          <div className="animate-fade-in">
            <HingeLocalizedSummary nodeIds={nodeIds} />
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
        {!animationData.velocityLin && (
          <div className="text-muted-foreground text-[10px] italic">Velocities not loaded</div>
        )}
        {!animationData.accelerationLin && (
          <div className="text-muted-foreground text-[10px] italic">Accelerations not loaded</div>
        )}
      </div>
    </div>
  );
}

export function CrossSectionTab(props: IDockviewPanelHeaderProps<CrossSectionParams>) {
  const { crossSectionType, position: dataPosition } = props.params;
  const positionNumber = Number(dataPosition);
  const color = numberToColor(positionNumber);
  const lightColor = numberToColorLight(positionNumber);
  const { animationData } = useAnimationData();
  const boundingBox = animationData.precomputed.boundingBox;

  const handleClose = () => {
    props.api.close();
  };

  const posistion = Math.trunc(
    crossSectionType == "X" ? positionNumber - boundingBox.center[0] : positionNumber - boundingBox.center[1]
  );

  return (
    <div
      className="flex cursor-grab items-center justify-between border-b px-3 py-2 transition-colors active:cursor-grabbing"
      style={{ backgroundColor: lightColor, borderColor: color }}>
      <div className="pointer-events-none flex items-center gap-2">
        <span className="text-sm font-semibold" style={{ color }}>
          {crossSectionType} Section {posistion}
        </span>
        <div className="size-5">
          <IsometricBuilding
            highlightSliceX={crossSectionType == "X" ? posistion : undefined}
            highlightSliceY={crossSectionType == "Y" ? posistion : undefined}
          />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button onClick={handleClose} variant="ghost" size="icon-sm" style={{ color }} title="Close">
          <XIcon className="size-3" />
        </Button>
      </div>
    </div>
  );
}
