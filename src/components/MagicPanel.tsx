import { InterstoryDriftChart } from "@/pages/View3d/InterstoryDriftChart";
import { SmallTimeline } from "./SmallTimeline";
import { Timeline } from "./Timeline";
import { useState } from "react";
import type { IDockviewPanelProps } from "dockview";

const PanelCatalog = {
  Timeline: Timeline,
  SmallTimeline: SmallTimeline,
  InterstoryDriftChart: InterstoryDriftChart,
} as const;

type PanelType = keyof typeof PanelCatalog;

const MagicPanel = ({ panelProps, type }: { panelProps: IDockviewPanelProps; type: PanelType }) => {
  const [currentPanelType, setCurrentPanelType] = useState<PanelType>("Timeline"); // Default view

  const CurrentComponent = PanelCatalog[currentPanelType];

  const handlePanelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentPanelType(event.target.value as PanelType);
  };

  return (
    <div className="magic-panel">
      <div className="panel-header">
        <select value={currentPanelType} onChange={handlePanelChange}>
          {Object.keys(PanelCatalog).map((panelType) => (
            <option key={panelType} value={panelType}>
              {panelType}
            </option>
          ))}
        </select>
        {/* Other dock controls can go here */}
      </div>
      <div className="panel-content">
        {/* Dynamically render the selected component and pass dock props */}
        <CurrentComponent panelProps={panelProps} />
      </div>
    </div>
  );
};

export default MagicPanel;
