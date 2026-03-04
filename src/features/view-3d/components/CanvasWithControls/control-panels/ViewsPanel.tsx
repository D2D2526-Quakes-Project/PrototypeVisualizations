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
    <div className="grid grid-cols-3 gap-1 mb-2 w-full">
      {viewButtons.map(({ view, label }) => (
        <button
          key={view}
          onClick={() => resetView(view)}
          className="w-full px-2 py-0.5 text-xs bg-neutral-100 hover:bg-neutral-200 rounded border border-neutral-300 transition-colors">
          {label}
        </button>
      ))}
    </div>
  );
}
