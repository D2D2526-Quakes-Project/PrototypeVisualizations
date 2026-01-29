import { AnimatePresence } from "motion/react";
import { useNodeSelection } from "@/contexts/NodeSelectionContext";
import { FloatingNodePanel } from "./FloatingNodePanel";

export function FloatingPanelManager() {
  const { floatingPanels } = useNodeSelection();

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      <AnimatePresence>
        {floatingPanels.map((panel) => (
          <div key={panel.id} className="pointer-events-auto">
            <FloatingNodePanel panel={panel} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}