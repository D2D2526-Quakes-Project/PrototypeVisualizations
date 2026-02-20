React Context is designed for dependency injection (like themes or auth tokens), not for high-frequency, complex state management. In a 3D visualization app (especially one using React Three Fiber, playing back animations, and rendering heavy geometries), Context will force your entire component tree to re-render on every frame tick or threshold change.

### The Recommended Solution: Zustand

For a React Three Fiber (R3F) application with these requirements, **Zustand** is the undisputed best choice. It is actually built by Poimandres (the same team behind R3F and `drei`), making it tailored for this exact type of architecture.

#### Why Zustand solves your problems:

1. **Selector-Based Re-rendering:** Components only re-render when the specific slice of state they subscribe to changes. Updating a damage threshold won't cause the timeline to re-render.
2. **Transient Updates (No React Re-renders):** You can read Zustand state imperatively inside R3F's `useFrame` loop without tying it to React's render cycle at all. (Currently, your `PlaybackContext` triggers a full React re-render up to 30 times a second!).
3. **The "Context + Zustand" Pattern:** This completely solves your split-view problem. You can create isolated instances of a Zustand store and pass the _store instance_ (not the state) down via Context.

---

### How to Architect the Split View with Zustand

To achieve split views that can operate independently but optionally sync, you should use the **Store Factory Pattern**.

#### 1. Define a Store Factory

Instead of a singleton global store, you create a function that generates a new store instance. This holds all the state previously handled by your `ColorProvider`, `ViewModeProvider`, etc.

```typescript
import { createStore, useStore } from 'zustand'

export interface ViewState {
  // Playback
  frameIndex: number;
  playing: boolean;
  setFrameIndex: (frame: number) => void;

  // View Mode
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;

  // Slices, Thresholds, etc.
  thresholds: Record<string, number>;
  setThreshold: (key: string, val: number) => void;
}

export const createViewStore = () => createStore<ViewState>((set) => ({
  frameIndex: 0,
  playing: false,
  setFrameIndex: (frameIndex) => set({ frameIndex }),

  mode: 'all-nodes',
  setMode: (mode) => set({ mode }),

  thresholds: { displacement: 0.1 /* ... */ },
  setThreshold: (key, val) => set((state) => ({
    thresholds: { ...state.thresholds,: val }
  })),
}))
```

#### 2. Scope the Store with React Context

You still use Context, but **only to pass the store instance, not the reactive data**. Because the store reference never changes, Context never triggers a re-render.

```tsx
import { createContext, useContext, useRef } from "react";

const ViewStoreContext = createContext<ReturnType<typeof createViewStore> | null>(null);

export function ViewProvider({ children }) {
  // Create a store instance exactly once per View
  const storeRef = useRef<ReturnType<typeof createViewStore>>(null);
  if (!storeRef.current) {
    storeRef.current = createViewStore();
  }

  return <ViewStoreContext.Provider value={storeRef.current}>{children}</ViewStoreContext.Provider>;
}

// Custom hook to consume the scoped store
export function useViewStore<T>(selector: (state: ViewState) => T): T {
  const store = useContext(ViewStoreContext);
  if (!store) throw new Error("Missing ViewProvider");
  return useStore(store, selector);
}
```

#### 3. Utilizing in Components (No more cascading renders!)

Components now pull exactly what they need.

```tsx
// This component WILL NOT re-render if `frameIndex` changes!
export function ViewModeSelector() {
  const mode = useViewStore((state) => state.mode);
  const setMode = useViewStore((state) => state.setMode);

  return <select value={mode} onChange={(e) => setMode(e.target.value)} />;
}
```

In your 3D Scene (`useFrame`), you can read state completely bypassing React renders:

```tsx
export function BuildingScene() {
  const store = useContext(ViewStoreContext);

  useFrame(() => {
    // Read directly from the store without triggering re-renders
    const currentFrame = store.getState().frameIndex;
    const currentMode = store.getState().mode;

    // Update instanced meshes directly here...
  });
}
```

#### 4. Handling the Split View & Synchronization

When you implement the split view, you simply wrap each half of the screen in its own `ViewProvider`.

To handle the "Syncing" feature (e.g., syncing the timeline or camera between the two views), you create a **SyncManager** component that sits above the views or alongside them. It imperatively subscribes to changes in one store and pushes them to the other.

```tsx
export function ViewSyncManager({ storeA, storeB, syncOptions }) {
  useEffect(() => {
    if (!syncOptions.syncTimeline) return;

    // Listen to Store A and push to Store B
    const unsubA = storeA.subscribe(
      (state) => state.frameIndex,
      (frameIndex) => storeB.setState({ frameIndex }),
    );

    // Listen to Store B and push to Store A
    const unsubB = storeB.subscribe(
      (state) => state.frameIndex,
      (frameIndex) => storeA.setState({ frameIndex }),
    );

    return () => {
      unsubA();
      unsubB();
    };
  });

  return null;
}
```

### Summary of the Migration Strategy

1. **Rip out Context Providers:** Combine `ColorContext`, `ViewModeContext`, `ExplodedViewContext`, `SliceSelectionContext`, `NodeVisibilityContext`, `ThresholdContext`, and `PlaybackContext` into a single, cohesive Zustand store factory.
2. **Setup Scoped Providers:** Wrap the root `View3d` component (and eventually `View3dLeft` and `View3dRight` in the split view) in your new `<ViewProvider>`.
3. **Refactor Hooks:** Change calls like `const { frameIndex } = usePlayback()` to `const frameIndex = useViewStore(s => s.frameIndex)`.
4. **Optimize 3D Code:** Remove `useFrame` dependencies on React state (like `frameIndexRef.current = frameIndex` in `BuildingScene.tsx`) and instead use `store.getState().frameIndex` directly inside the loop.

---

## Incremental Migration Plan

### Prerequisites

Install Zustand:
```bash
pnpm add zustand
```

The migration uses the `subscribeWithSelector` middleware which is the recommended approach for React apps.

### Phase 1: Create Parallel Zustand Stores (No Breaking Changes)

Create Zustand stores alongside existing Contexts. Components can gradually migrate one-by-one.

```typescript
// src/stores/viewStore.ts
import { createStore } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface ViewState {
  // Playback
  frameIndex: number;
  playing: boolean;
  fps: number;
  skippedPerFrame: number;
  setFrameIndex: (frame: number) => void;
  handlePlayPause: () => void;
  skipToStart: () => void;
  skipToEnd: () => void;

  // Visualization
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
  
  // Thresholds
  thresholds: ThresholdState;
  setThreshold: (type: ThresholdType, value: number) => void;
  
  // Color
  currentMetric: ColorMetric;
  setColorMetric: (metric: ColorMetric) => void;
  thresholdHighlighting: boolean;
  setThresholdHighlighting: (enabled: boolean) => void;
  
  // Visibility
  visibleFloors: Set<string>;
  toggleFloor: (storyId: string) => void;
  setFloorVisible: (storyId: string, visible: boolean) => void;
  
  // Exploded View
  explodedScale: number;
  setExplodedScale: (scale: number) => void;
  
  // Slice
  sliceEnabled: boolean;
  setSliceEnabled: (enabled: boolean) => void;
  slicePlane: SlicePlane | null;
  setSlicePlane: (plane: SlicePlane | null) => void;
}

export const createViewStore = () => createStore<ViewState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state matching your current Context defaults
    frameIndex: 0,
    playing: false,
    fps: 0,
    skippedPerFrame: 0,
    setFrameIndex: (frameIndex) => set({ frameIndex }),
    handlePlayPause: () => set((state) => ({ playing: !state.playing })),
    skipToStart: () => set({ frameIndex: 0 }),
    skipToEnd: () => set((state) => ({ frameIndex: /* totalFrames - 1 */ })),
    
    mode: 'all-nodes',
    setMode: (mode) => set({ mode }),
    
    thresholds: DEFAULT_THRESHOLDS,
    setThreshold: (type, value) => set((state) => ({
      thresholds: { ...state.thresholds, [type]: value }
    })),
    
    currentMetric: 'displacement',
    setColorMetric: (currentMetric) => set({ currentMetric }),
    thresholdHighlighting: false,
    setThresholdHighlighting: (thresholdHighlighting) => set({ thresholdHighlighting }),
    
    visibleFloors: new Set(),
    toggleFloor: (storyId) => set((state) => {
      const next = new Set(state.visibleFloors);
      if (next.has(storyId)) next.delete(storyId);
      else next.add(storyId);
      return { visibleFloors: next };
    }),
    setFloorVisible: (storyId, visible) => set((state) => {
      const next = new Set(state.visibleFloors);
      visible ? next.add(storyId) : next.delete(storyId);
      return { visibleFloors: next };
    }),
    
    explodedScale: 1,
    setExplodedScale: (explodedScale) => set({ explodedScale }),
    
    sliceEnabled: false,
    setSliceEnabled: (sliceEnabled) => set({ sliceEnabled }),
    slicePlane: null,
    setSlicePlane: (slicePlane) => set({ slicePlane }),
  }))
);
```

### Phase 2: Create ViewProvider Wrapper

```typescript
// src/stores/ViewProvider.tsx
import { createContext, useContext, useRef, useSyncExternalStore } from "react";
import { createViewStore, type ViewState } from "./viewStore";

const ViewStoreContext = createContext<ReturnType<typeof createViewStore> | null>(null);

export function ViewProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<ReturnType<typeof createViewStore> | null>(null);
  if (!storeRef.current) {
    storeRef.current = createViewStore();
  }
  return (
    <ViewStoreContext.Provider value={storeRef.current}>
      {children}
    </ViewStoreContext.Provider>
  );
}

export function useViewStore<T>(selector: (state: ViewState) => T): T {
  const store = useContext(ViewStoreContext);
  if (!store) throw new Error("useViewStore must be used within ViewProvider");
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}
```

### Phase 3: Migrate Components One-At-A-Time

Pick components that have the most bugs first:

1. **Playback (most critical for performance)**
2. **Threshold (causes cascading re-renders)**
3. **Color (depends on Threshold)**
4. **View Mode, Floor Visibility, etc.**

For each component:
- Change `usePlayback()` → `useViewStore(s => s.frameIndex)`
- Change `useThresholds()` → `useViewStore(s => s.thresholds)`
- Keep old Context wrappers working during transition

### Phase 4: Remove Old Contexts

Once all components migrated:
- Remove Context providers from `main.tsx`
- Remove old hook files

---

## Critical: Transient Updates for useFrame

For your 3D scene, you need transient updates to avoid React re-renders entirely:

```typescript
// In BuildingScene.tsx
import { useViewStore } from "@/stores/ViewProvider";
import { useFrame } from "@react-three/fiber";

export function BuildingScene() {
  const store = useContext(ViewStoreContext); // Get raw store
  
  useFrame(() => {
    // Read directly - NO re-render!
    const { frameIndex, mode, thresholds } = store.getState();
    
    // Update instanced meshes directly
    // ...
  });
  
  return <mesh />;
}
```

This is the **real performance fix** - your 3D components should read from Zustand directly in `useFrame`, completely bypassing React's render cycle.

---

## Global vs Scoped Stores

### Global Store (for truly shared state)
```typescript
// src/stores/globalStore.ts
export const useGlobalStore = create<GlobalState>((set) => ({ ... }));
```
Use for: Animation data (already in AnimationDataProvider), URL state, user preferences.

### Scoped Store (for view-specific state)
```typescript
// Created per-view in ViewProvider
const storeRef = useRef(createViewStore());
```
Use for: All visualization state that needs to be independent in split view.

---

## Migration Order (By Bug Severity)

| Priority | Context | Why First |
|----------|---------|-----------|
| 1 | PlaybackContext | Triggers re-renders 30x/sec, breaks timeline |
| 2 | ThresholdContext | Cascades through ColorContext → breaks 3D view |
| 3 | ColorContext | Depends on Threshold, causes 3D coloring bugs |
| 4 | ViewModeContext | View mode switching breaks scene |
| 5 | FloorVisibilityContext | Floor toggles don't sync |
| 6 | Others | Lower impact |

This architecture will dramatically improve performance, permanently eliminate cascading re-render bugs, and perfectly set you up for independent/synchronized split views.
