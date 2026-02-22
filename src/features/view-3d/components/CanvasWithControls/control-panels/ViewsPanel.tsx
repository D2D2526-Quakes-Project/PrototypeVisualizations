interface ViewsPanelProps {
  resetView: (view: "top" | "bottom" | "left" | "right" | "front" | "back") => void;
}

const viewButtons: { view: "top" | "bottom" | "left" | "right" | "front" | "back"; label: string }[] = [
  { view: "front", label: "North" },
  { view: "right", label: "East" },
  { view: "back", label: "South" },
  { view: "left", label: "West" },
  { view: "top", label: "Top" },
  { view: "bottom", label: "Bottom" },
];

export function ViewsPanel({ resetView }: ViewsPanelProps) {
  return (
    <div className="grid grid-cols-2 gap-1 mb-2">
      {viewButtons.map(({ view, label }) => (
        <button
          key={view}
          onClick={() => resetView(view)}
          className="px-2 py-0.5 text-xs bg-neutral-100 hover:bg-neutral-200 rounded border border-neutral-300 transition-colors">
          {label}
        </button>
      ))}
    </div>
  );
}
