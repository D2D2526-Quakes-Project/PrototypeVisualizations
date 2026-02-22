# Saving State Guide

This document explains how state saving/restoring works in this project, how panel state is modeled, and how to add new state safely.

## 1. Single Source Of Truth

All runtime state is owned by the Zustand store in:

- `src/stores/viewStore.ts`

Use these access patterns:

- `useViewStore((s) => s.someField)` for reactive reads in components
- `useViewStoreRaw().getState()` for imperative reads/writes in effects, handlers, and integration code

Do not create duplicate local stores for the same data.

## 2. What Gets Persisted

Persisted app state shape is defined in:

- `src/lib/statePersistence.ts` (`AppState`)

Important persisted fields:

- Global playback: `frameIndex`
- Global visualization state: thresholds, metric, exploded/slice settings, floor visibility, selection
- Layout: `layout` (Dockview serialized model)
- Per-panel state: `panelStates` keyed by panel id

Per-panel state currently includes:

- Canvas panels (`type: "canvas"`): camera (`position`, `target`, `isOrthographic`, `zoom`)
- Timeline panel legend/channel choices
- Story drift heatmap controls
- Interstory drift chart legend visibility

## 3. Save/Restore Pipeline

### Save

Autosave is handled by:

- `src/hooks/useAutoSave.ts`

Behavior:

- Subscribes to selected store fields
- Saves immediately for critical fields like `frameIndex` (when not playing)
- Debounces larger updates
- Flushes on `beforeunload`, `pagehide`, and `visibilitychange(hidden)`

### Share URL

URL encode/decode is handled by:

- `src/lib/statePersistence.ts`

Key helpers:

- `encodeStateForUrl`
- `decodeStateFromUrl`
- `createShareableUrl`

### Initial restore

Restore entrypoint is:

- `src/pages/View3d/page.tsx`

Flow:

1. Load state from `?state=` URL first, else local storage
2. Apply state into store on mount
3. Reassert critical state (`frameIndex`, `panelStates`) after short delay to beat mount races

## 4. Panel State Pattern

Each panel should use `panelId` as its state key.

Minimal pattern:

```tsx
import { useViewStore } from "@/stores";

const panelId = api?.id ?? "fallback-id";
const setPanelState = useViewStore((s) => s.setPanelState);
const saved = useViewStore((s) => s.panelStates[panelId]);

const panelState = saved?.type === "interstoryDriftChart" ? saved.state : { visibleCorners: ["NW", "NE", "SW", "SE"] };

// write
setPanelState(panelId, "interstoryDriftChart", {
  visibleCorners: ["NW", "SE"],
});
```

Rules:

- Always guard by `saved?.type === expectedType`
- Always include panel id in writes
- Prefer store-backed state over duplicated local `useState`

## 5. Timeline State Notes

Timeline position is global (`frameIndex`), not panel-local.

Read/write via playback hook:

```tsx
const { frameIndex, setFrameIndex } = usePlayback();
```

If a chart playhead does not initialize correctly on first render, use chart-ready + retry pattern:

```tsx
const [chartReadyVersion, setChartReadyVersion] = useState(0);

useEffect(() => {
  const sync = () => {
    const chart = chartRef.current?.getEchartsInstance();
    if (!chart) return false;
    // convertToPixel / setOption here
    return true;
  };

  if (sync()) return;
  const rafId = requestAnimationFrame(sync);
  return () => cancelAnimationFrame(rafId);
}, [frameIndex, chartReadyVersion]);

<ReactECharts onChartReady={() => setChartReadyVersion((v) => v + 1)} />;
```

## 6. Camera State Notes (Per Canvas)

Camera state is panel-local and stored in `panelStates[panelId]` for `type: "canvas"`.

Important fields:

- `position`
- `target`
- `isOrthographic`
- `zoom` (orthographic)

Best practices from `src/components/CanvasWithControls.tsx`:

- Restore camera after controls are actually ready (retry with `requestAnimationFrame`)
- Save on OrbitControls `end` event plus debounced `change`
- Do not overwrite restored camera on first mount when toggling camera mode

## 7. Defaults And Migrations

Default values should come from one place:

- `src/stores/viewStore.ts` exports defaults (`DEFAULT_*`)
- `src/lib/statePersistence.ts` consumes those defaults

When adding persisted fields:

1. Add to `ViewState`
2. Add store default + actions
3. Add to `AppState`
4. Add to autosave snapshot (`useAutoSave`)
5. Add to restore logic (`src/pages/View3d/page.tsx`)
6. Add to share/preset snapshot (`src/components/ShareButton.tsx`)
7. Add backward-compatible fallback in restore/default merge

## 8. Debugging State Restores

Enable debug by adding:

- `?debugState=1`

Current debug logs:

- `[restore] loaded initial state`
- `[restore] reasserted critical state`
- `[state] frameIndex update` with stack trace

Use this to find late writes that reset state after restore.

## 9. Common Failure Modes

1. Chart shows old/default playhead until interaction

- Cause: chart not ready when sync runs
- Fix: chart-ready + RAF retry

2. Camera restores wrong in orthographic

- Cause: zoom not persisted/restored
- Fix: persist `zoom` and apply projection matrix update

3. Panel state not surviving share/reload

- Cause: local-only state not mirrored into `panelStates`
- Fix: make `panelStates` the source of truth

4. State looks correct then gets overwritten

- Cause: mount-time side effects running after restore
- Fix: one-time hydration guards + delayed critical reassert

## 10. Quick Implementation Checklist

Before shipping any new savable UI state:

- [ ] Is there exactly one source of truth in Zustand?
- [ ] Is state represented in `AppState`?
- [ ] Does autosave include it?
- [ ] Does share URL include it (full state path)?
- [ ] Does restore apply it after data/layout mount races?
- [ ] Does panel-specific state use `panelId` keys?
- [ ] Did you test in incognito with a copied full share URL?
