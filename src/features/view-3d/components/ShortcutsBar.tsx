/**
 * ShortcutsBar — contextual, icon-driven shortcut hints.
 *
 * Drop this in place of the static shortcuts <div> inside CanvasWithControls.
 * Pass the relevant state as props so the bar knows which shortcuts to surface.
 *
 * Usage:
 *   <ShortcutsBar
 *     isBoxSelecting={!!boxSelection}
 *     hasSelection={selectedNodeIds.size > 0}
 *     showPlayback={showPlaybackControls}
 *   />
 */

import {
  ArrowDownUp,
  ArrowLeftRight,
  CircleDashed,
  BoxSelect,
  CameraIcon,
  ChevronFirst,
  Keyboard,
  MousePointer2,
  Mouse,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Shortcut = {
  icon: React.ReactNode;
  label: string;
  key: string; // keyboard hint shown on the right
};

// ─── Context map (no conditional sprawl) ─────────────────────────────────────
// Each entry is a "mode" with its own set of shortcuts.
// Priority: first matching mode wins, so order matters.

type Mode = {
  id: string;
  active: (ctx: ShortcutContext) => boolean;
  shortcuts: Shortcut[];
};

const MODES: Mode[] = [
  {
    id: "box-selecting",
    active: (ctx) => ctx.isBoxSelecting,
    shortcuts: [
      { icon: <BoxSelect size={10} />, label: "Finish", key: "release" },
      { icon: <X size={10} />, label: "Cancel", key: "Esc" },
    ],
  },
  {
    id: "has-selection",
    active: (ctx) => ctx.hasSelection && !ctx.isBoxSelecting,
    shortcuts: [
      { icon: <BoxSelect size={10} />, label: "Replace", key: "Ctrl+drag" },
      { icon: <X size={10} />, label: "Clear", key: "X" },
    ],
  },
  {
    id: "playback",
    active: (ctx) => !!ctx.showPlayback,
    shortcuts: [
      { icon: <ArrowLeftRight size={10} />, label: "Step", key: "←/→" },
      { icon: <ChevronFirst size={10} />, label: "Ends", key: "Ctrl+←/→" },
      { icon: <BoxSelect size={10} />, label: "Box", key: "Ctrl+drag" },
    ],
  },
  {
    id: "default",
    active: () => true,
    shortcuts: [
      { icon: <BoxSelect size={10} />, label: "Box", key: "Ctrl+drag" },
      { icon: <Keyboard size={10} />, label: "Menu", key: "M" },
      { icon: <CameraIcon size={10} />, label: "Camera", key: "O" },
    ],
  },
];

const MOUSE_SHORTCUTS: Shortcut[] = [
  { icon: <MousePointer2 size={10} />, label: "Orbit", key: "L-drag" },
  { icon: <ArrowDownUp size={10} />, label: "Zoom", key: "Wheel" },
  { icon: <CircleDashed size={10} />, label: "Pan", key: "R-drag" },
];

// ─── Component ────────────────────────────────────────────────────────────────

type ShortcutContext = {
  isBoxSelecting: boolean;
  hasSelection: boolean;
  showPlayback: boolean;
};

export function ShortcutsBar(ctx: ShortcutContext) {
  const activeMode = MODES.find((m) => m.active(ctx))!;

  return (
    <div className="pointer-events-none absolute bottom-2 left-2 z-40">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeMode.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col gap-1 rounded-lg border border-neutral-200 bg-white/90 px-2 py-1.5 backdrop-blur-sm">
          <div className="flex items-center gap-0.5">
            <Keyboard size={10} className="mr-0.5 shrink-0 text-neutral-500" />
            {activeMode.shortcuts.map((s, i) => (
              <span key={`${activeMode.id}-${i}`} className="flex items-center gap-0.5">
                {i > 0 && <span className="mx-0.5 h-3 w-px bg-neutral-200" />}
                <span>{s.icon}</span>
                <span className="text-[9px] leading-none text-neutral-500">{s.label}</span>
                <kbd className="rounded border border-neutral-300 bg-neutral-200 px-1 py-0.5 font-mono text-[8px] leading-none">
                  {s.key}
                </kbd>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-0.5">
            <Mouse size={10} className="mr-0.5 shrink-0 text-neutral-500" />
            {MOUSE_SHORTCUTS.map((s, i) => (
              <span key={`mouse-${i}`} className="flex items-center gap-0.5">
                {i > 0 && <span className="mx-0.5 h-3 w-px bg-neutral-200" />}
                <span>{s.icon}</span>
                <span className="text-[9px] leading-none text-neutral-500">{s.label}</span>
                <kbd className="rounded border border-neutral-300 bg-neutral-200 px-1 py-0.5 font-mono text-[8px] leading-none">
                  {s.key}
                </kbd>
              </span>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
