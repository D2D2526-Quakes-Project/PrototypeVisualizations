/**
 * ShortcutsBar — contextual shortcut reference panel for the slide-out dock.
 *
 * Expanded from the compact bar variant. Designed to fill roughly half the
 * screen height in a side-sheet / dock context, with full-width layout.
 *
 * Usage:
 *   <ShortcutsBar
 *     isBoxSelecting={!!boxSelection}
 *     hasSelection={selectedNodeIds.size > 0}
 *     showPlayback={showPlaybackControls}
 *     mode={viewMode}
 *   />
 */

import type { ViewMode } from "@/features/3d/contexts/visualization/ViewModeContext";
import {
  ArrowDownUp,
  ArrowLeftRight,
  BoxSelect,
  CameraIcon,
  ChevronFirst,
  CircleDashed,
  Keyboard,
  Mouse,
  MousePointer2,
  MousePointerClick,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Shortcut = {
  icon: React.ReactNode;
  label: string;
  description?: string; // longer hint shown in the expanded layout
  key: string;
};

type ShortcutContext = {
  isBoxSelecting: boolean;
  hasSelection: boolean;
  showPlayback: boolean;
  mode: ViewMode;
};

// ─── Mode definitions ─────────────────────────────────────────────────────────

type Mode = {
  id: string;
  label: string; // section title shown in expanded layout
  active: (ctx: ShortcutContext) => boolean;
  shortcuts: Shortcut[];
  mouseShortcuts?: Shortcut[];
};

const MODES: Mode[] = [
  {
    id: "box-selecting",
    label: "Box Selection",
    active: (ctx) => ctx.isBoxSelecting,
    shortcuts: [
      {
        icon: <BoxSelect size={14} />,
        label: "Finish selection",
        description: "Release drag to confirm",
        key: "release",
      },
      {
        icon: <X size={14} />,
        label: "Cancel",
        description: "Discard current selection",
        key: "Esc",
      },
    ],
    mouseShortcuts: [
      {
        icon: <MousePointer2 size={14} />,
        label: "Draw selection",
        description: "Drag to define region",
        key: "Drag",
      },
      {
        icon: <Mouse size={14} />,
        label: "Apply selection",
        description: "Release to commit",
        key: "Release",
      },
    ],
  },
  {
    id: "has-selection",
    label: "Selection Active",
    active: (ctx) => ctx.hasSelection && !ctx.isBoxSelecting,
    shortcuts: [
      {
        icon: <BoxSelect size={14} />,
        label: "Replace selection",
        description: "Draw a new box to replace",
        key: "Ctrl+Drag",
      },
      {
        icon: <X size={14} />,
        label: "Clear selection",
        description: "Deselect all nodes",
        key: "X",
      },
    ],
  },
  {
    id: "playback",
    label: "Playback Mode",
    active: (ctx) => !!ctx.showPlayback,
    shortcuts: [
      {
        icon: <ArrowLeftRight size={14} />,
        label: "Step frame",
        description: "Advance or rewind one step",
        key: "← / →",
      },
      {
        icon: <ChevronFirst size={14} />,
        label: "Jump to ends",
        description: "Go to first or last frame",
        key: "Ctrl+← / →",
      },
      {
        icon: <BoxSelect size={14} />,
        label: "Box select",
        description: "Select nodes in region",
        key: "Ctrl+Drag",
      },
    ],
  },
  {
    id: "default",
    label: "Navigation",
    active: () => true,
    shortcuts: [
      {
        icon: <BoxSelect size={14} />,
        label: "Box select",
        description: "Select a group of nodes",
        key: "Ctrl+Drag",
      },
      {
        icon: <Keyboard size={14} />,
        label: "Command menu",
        description: "Open the quick-action menu",
        key: "M",
      },
      {
        icon: <CameraIcon size={14} />,
        label: "Reset camera",
        description: "Return to default view",
        key: "O",
      },
    ],
  },
];

// ─── Mouse shortcuts ──────────────────────────────────────────────────────────

function getMouseShortcuts({ mode }: ShortcutContext): Shortcut[] {
  if (mode === "floor-slabs") {
    return [
      {
        icon: <MousePointerClick size={14} />,
        label: "Open floor",
        description: "Inspect the clicked slab",
        key: "Click",
      },
      {
        icon: <MousePointer2 size={14} />,
        label: "Orbit",
        description: "Rotate the 3-D view",
        key: "L-Drag",
      },
      {
        icon: <CircleDashed size={14} />,
        label: "Pan",
        description: "Translate the camera",
        key: "R-Drag",
      },
      {
        icon: <ArrowDownUp size={14} />,
        label: "Zoom",
        description: "Scroll to zoom in/out",
        key: "Wheel",
      },
    ];
  }

  return [
    {
      icon: <MousePointerClick size={14} />,
      label: "Open node",
      description: "Inspect the clicked node",
      key: "Click",
    },
    {
      icon: <MousePointerClick size={14} />,
      label: "Open floor",
      description: "Open floor detail panel",
      key: "R-Click",
    },
    {
      icon: <MousePointer2 size={14} />,
      label: "Orbit",
      description: "Rotate the 3-D view",
      key: "L-Drag",
    },
    {
      icon: <CircleDashed size={14} />,
      label: "Pan",
      description: "Translate the camera",
      key: "R-Drag",
    },
    {
      icon: <ArrowDownUp size={14} />,
      label: "Zoom",
      description: "Scroll to zoom in/out",
      key: "Wheel",
    },
  ];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ShortcutRow({ shortcut, index }: { shortcut: Shortcut; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15, delay: index * 0.04 }}
      className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-neutral-200/60">
      {/* Icon */}
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500 shadow-sm">
        {shortcut.icon}
      </span>

      {/* Label + description */}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs leading-tight font-medium text-neutral-700">{shortcut.label}</span>
        {shortcut.description && (
          <span className="block truncate text-[10px] leading-tight text-neutral-400">{shortcut.description}</span>
        )}
      </span>

      {/* Key badge */}
      <kbd className="ml-auto shrink-0 rounded-md border border-neutral-300 bg-neutral-100 px-2 py-1 font-mono text-[10px] leading-none font-medium text-neutral-600 shadow-sm shadow-neutral-300">
        {shortcut.key}
      </kbd>
    </motion.div>
  );
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 pt-0.5 pb-1">
      <span className="text-neutral-400">{icon}</span>
      <span className="text-[10px] font-semibold tracking-widest text-neutral-400 uppercase">{label}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ShortcutsBar(ctx: ShortcutContext) {
  const activeMode = MODES.find((m) => m.active(ctx))!;
  const mouseShortcuts = activeMode.mouseShortcuts ?? getMouseShortcuts(ctx);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden border-t border-neutral-200 bg-neutral-50">
      {/* Mode indicator / heading */}
      <div className="flex shrink-0 items-center gap-2 border-b border-neutral-200 bg-white px-3 py-2">
        <Keyboard size={13} className="text-neutral-400" />
        <span className="text-sm font-semibold text-neutral-600">Shortcuts</span>
      </div>

      {/* Scrollable body — two-column on wider viewports */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeMode.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            // Stack on narrow, side-by-side on wider
            className="grid grid-cols-1 gap-x-2 gap-y-0 sm:grid-cols-2">
            {/* Keyboard shortcuts section */}
            <div className="flex flex-col">
              <SectionHeader icon={<Keyboard size={11} />} label="Keyboard" />
              <div className="flex flex-col gap-0.5">
                {activeMode.shortcuts.map((s, i) => (
                  <ShortcutRow key={`${activeMode.id}-kb-${i}`} shortcut={s} index={i} />
                ))}
              </div>
            </div>

            {/* Mouse shortcuts section */}
            <div className="flex flex-col sm:border-l sm:border-neutral-200 sm:pl-2">
              {/* On small screens add a separator */}
              <div className="mt-3 sm:mt-0">
                <SectionHeader icon={<Mouse size={11} />} label="Mouse" />
                <div className="flex flex-col gap-0.5">
                  {mouseShortcuts.map((s, i) => (
                    <ShortcutRow key={`mouse-${i}`} shortcut={s} index={i} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
