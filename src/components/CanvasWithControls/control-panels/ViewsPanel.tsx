interface ViewsPanelProps {
  resetView: (view: string) => void;
}

const viewButtons = [
  { view: "front", label: "Front" },
  { view: "back", label: "Back" },
  { view: "left", label: "Left" },
  { view: "right", label: "Right" },
  { view: "top", label: "Top" },
  { view: "iso", label: "Iso" },
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
