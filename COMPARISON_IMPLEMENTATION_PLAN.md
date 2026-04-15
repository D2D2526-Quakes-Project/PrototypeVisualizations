# Multi-Simulation Comparison Feature - Implementation Plan

This document describes the implementation plan for adding split-view comparison mode to the Quakes Visualization application. This feature allows users to view two simulations side-by-side, compare their results, and analyze differences between different earthquake scenarios, building configurations, or pre/post retrofit states.

## Overview

The comparison feature enables users to:

- Select two simulations from the main menu via multi-select checkboxes
- View both simulations in a split-screen layout with a resizable divider
- Each side operates independently (like two browser tabs) when syncs are disabled
- Synchronize specific aspects (time, camera, selection, color) between views when enabled
- Handle edge cases gracefully when comparing different buildings

## User Stories and Workflows

### Story 1: Compare Two Ground Motions on Same Building

A user has building "15Story" with simulations "Station 3138" and "Station 3139" (different earthquake inputs). They want to see how each earthquake affects the building.

**Flow**:

1. User opens the application, sees the simulation picker
2. User expands the "15Story" building section
3. User checks the checkboxes next to both simulations
4. A "Compare (2)" button becomes active
5. User clicks the button
6. Both datasets load in parallel (with progress indicators for each)
7. The split-view opens with both buildings visible

**Design Decisions**:

- When buildings match (same building folder), sync is enabled by default
- Timeline displays the range spanning both simulations' durations
- If frame counts differ, the system syncs to the shorter duration and shows a warning

### Story 2: Compare Pre/Post Retrofit

A user has the same building before and after retrofit, subjected to the same earthquake. They want to verify whether the retrofit reduced drift or other response metrics.

**Flow**:

1. User selects "15Story" building with "PreRetrofit" simulation
2. User selects the same building with "PostRetrofit" simulation
3. User clicks Compare
4. Split view opens showing both scenarios

**Design Decisions**:

- Because buildings match, node IDs align between both views
- Selection sync is enabled by default, allowing users to select the same node in both views
- The system supports a future "Difference Mode" that visualizes the delta between simulations

### Story 3: Compare Different Buildings with Same Motion

A user wants to compare how "15Story" versus "52Story" respond to the same earthquake "Station 3138".

**Flow**:

1. User selects "15Story" → "Station 3138"
2. User selects "52Story" → "Station 3138" (different building!)
3. User clicks Compare

**Pain Points and Solutions**:

- **Different node counts**: The NodePanel cannot show details for a node that doesn't exist in the other building. Solution: When buildings differ, show a message like "Node not present in comparison building" and disable selection sync.

- **Different floor counts**: Interstory Drift charts have different Y-axis scales. Solution: Each canvas displays its own chart by default; the user can manually switch which data to show.

- **Selection sync problems**: Selecting node 5 in building A has no meaning in building B. Solution: When buildings differ, display a warning "Different buildings - selection sync disabled" and automatically turn off syncSelection.

- **Independent operation**: Each side should feel like its own browser tab. Solution: When syncs are off, changing color mode on left doesn't affect right.

### Story 4: Click Node in One View, See Details

A user clicks a node in the left canvas. The NodePanel opens. They want to see the corresponding node in the right canvas.

**Flow**:

1. User clicks a node in the left canvas
2. NodePanel opens showing that node's data for the left simulation
3. User can switch the panel to show comparison data via a dropdown

**Design Decisions**:

- If buildings match (same folder), syncSelection selects matching node IDs in both views
- If buildings differ, show an appropriate message in the other canvas
- NodePanel displays which simulation it's showing data from (labeled in the header)

### Story 5: Panel Data Display in Comparison Mode

A user has the split view open and wants to add an Interstory Drift Chart. The question arises: which simulation's data should display?

**Options Considered**:

| Option | Approach                                                | Pros                                 | Cons                               |
| ------ | ------------------------------------------------------- | ------------------------------------ | ---------------------------------- |
| A      | Show both datasets overlaid on one chart                | Single panel, easy visual comparison | Can become cluttered, hard to read |
| B      | Duplicate the panel for each simulation                 | Clear which data is which            | Consumes more screen space         |
| C      | Dropdown to select which simulation to show             | Flexible and compact                 | Requires extra click to switch     |
| D      | Create new "Comparison Chart" showing both side-by-side | Purpose-built for comparison         | Requires building a new panel type |

**Chosen Approach**:

- Each side has its own independent dockview with panels
- Default to showing that side's simulation's data
- No cross-side panel sharing by default (each side is independent)

### Story 6: Sync Control Behavior

A user wants to control which aspects synchronize between the two views.

**Flow**:

1. User sees sync toggles in the navbar: Time, Camera, Selection, Color
2. Each toggle works independently
3. Changes take effect immediately

**Behavior Details**:

- **syncTime ON**: Single shared timeline. Play/pause affects both views. Scrubbing moves both canvases to the same frame.
- **syncTime OFF**: Each canvas has an independent frame index. Panels display data for their bound simulation.

- **syncCamera ON**: Camera orbit/pan/zoom in one canvas mirrors to the other canvas.
- **syncCamera OFF**: Each canvas has independent camera control.

- **syncSelection ON**: Selecting a node/floor in one canvas selects the equivalent in the other (only when buildings match).
- **syncSelection OFF**: Selection is independent in each canvas.

- **syncColor ON**: Changing "color by" metric in one canvas updates both.
- **syncColor OFF**: Each canvas has independent color mode.

**Default Settings**: All sync options default to ON, with the navbar providing prominent toggles to disable any of them.

---

## Architecture

### Core Principle: Two Independent Sides

Each side of the comparison view operates like a separate browser tab:

- Each side has its own AnimationDataContext instance
- Each side has its own dockview with panels
- Each side has its own playback state (frameIndex, playing, etc.)
- A higher-level ComparisonManager coordinates syncing when enabled

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ComparisonManager                               │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  syncSettings: { syncTime, syncCamera, syncSelection, ... }  ││
│  │  comparisonMode: boolean                                       ││
│  │  primaryBinding: { building, simulation }                      ││
│  │  comparisonBinding: { building, simulation }                 ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
         │                                            │
         ▼                                            ▼
┌─────────────────────────────┐      ┌─────────────────────────────┐
│         Left Side           │      │        Right Side            │
│  ┌───────────────────────┐  │      │  ┌───────────────────────┐  │
│  │ AnimationDataContext │  │      │  │ AnimationDataContext │  │
│  │ - animationData      │  │      │  │ - animationData      │  │
│  │ - currentBuilding    │  │      │  │ - currentBuilding    │  │
│  │ - currentSimulation │  │      │  │ - currentSimulation │  │
│  │ - datasetStates     │  │      │  │ - datasetStates     │  │
│  └───────────────────────┘  │      │  └───────────────────────┘  │
│            │                │      │            │                │
│            ▼                │      │            ▼                │
│  ┌───────────────────────┐  │      │  ┌───────────────────────┐  │
│  │  CanvasWithControls   │  │      │  │  CanvasWithControls   │  │
│  │  + PlaybackControls   │  │      │  │  + PlaybackControls   │  │
│  └───────────────────────┘  │      │  └───────────────────────┘  │
│            │                │      │            │                │
│            ▼                │      │            ▼                │
│  ┌───────────────────────┐  │      │  ┌───────────────────────┐  │
│  │   Dockview (panels)   │  │      │  │   Dockview (panels)   │  │
│  │   - NodePanel        │  │      │  │   - NodePanel        │  │
│  │   - FloorPanel       │  │      │  │   - FloorPanel       │  │
│  │   - ISD Chart        │  │      │  │   - ISD Chart        │  │
│  │   - ...              │  │      │  │   - ...              │  │
│  └───────────────────────┘  │      │  └───────────────────────┘  │
└─────────────────────────────┘      └─────────────────────────────┘
```

### Data Flow

1. **Loading**: Follow existing pipeline - required data loads first, optional loads second
2. **Context**: Each side gets its own AnimationDataContext instance (not shared)
3. **State**: Playback state (frameIndex, playing, etc.) stored per-side
4. **Sync**: ComparisonManager listens to one side's state changes and propagates to other when sync enabled

---

## Implementation Architecture

### Phase 1: Data Layer and Core Infrastructure

#### Goal

Enable loading and managing two simulation datasets simultaneously with independent contexts.

#### 1.1 Extend AnimationDataContext for Dual Data

The current context only holds one `animationData` object. We need to track two datasets.

**Changes Required**:

- Add `comparisonMode: boolean` to indicate comparison view is active
- Add `comparisonBinding: { building: BinaryBuilding, simulation: BinarySimulation } | null`
- Add `syncSettings: SyncSettings` state
- Add helper methods for comparison mode

**Where**: `src/lib/useAnimationData.tsx` - extend existing AnimationDataContext

```typescript
// Extended context type (additions)
interface AnimationDataContextType {
  // ... existing fields

  // NEW: Comparison support
  comparisonMode: boolean;
  comparisonBinding: { building: BinaryBuilding; simulation: BinarySimulation } | null;
  syncSettings: SyncSettings;

  // NEW: Set comparison selection
  setComparisonSelection: (
    building: BinaryBuilding,
    simulation: BinarySimulation,
    options?: Partial<OptionalDataLoadOptions>
  ) => void;

  // NEW: Update sync settings
  setSyncSettings: (settings: Partial<SyncSettings>) => void;

  // NEW: Check if two simulations are being compared
  isComparing: () => boolean;
}

interface SyncSettings {
  syncTime: boolean;
  syncCamera: boolean;
  syncSelection: boolean;
  syncColor: boolean;
}
```

#### 1.2 Update Main Menu for Multi-Select

The current simulation picker uses single-select radio buttons. This needs to change to checkboxes with a "Compare" button.

**Changes Required** (in `SimulationPickerOverlay`, lines 959-1274):

- Convert simulation selection from radio buttons to checkboxes
- Track an array of selected simulations (max 2)
- Show a "Compare (n)" button that becomes active when 2 are selected
- When Compare is clicked, trigger comparison mode with both selections

**Data Loading Pattern**:

- Follow existing pipeline: load required data first, optional second
- Each side loads independently using existing loadSelection logic
- Show parallel progress indicators

---

### Phase 2: Comparison View Layout and Canvas

#### Goal

Create the split-view layout with two independent but synchronized canvases.

#### 2.1 Modify View3d for Split Layout

The View3d component detects comparison mode and renders split layout.

**Changes Required**:

- In `src/features/view-3d/page.tsx`, check for `comparisonMode`
- When active, render two independent side-by-side containers
- No new routes - everything is SPA state

**Layout Structure**:

```tsx
// In src/features/view-3d/page.tsx
export function View3d() {
  const comparisonMode = useAnimationData((s) => s.comparisonMode);

  if (comparisonMode) {
    return <SplitView />;
  }
  return <SingleView />;
}

function SplitView() {
  return (
    <div className="flex flex-1">
      <div className="flex-1" ref={leftPanelRef}>
        <ComparisonSide side="primary" />
      </div>
      <ResizableDivider />
      <div className="flex-1" ref={rightPanelRef}>
        <ComparisonSide side="comparison" />
      </div>
    </div>
  );
}

function ComparisonSide({ side }: { side: "primary" | "comparison" }) {
  // Each side has its own context instance
  return (
    <AnimationDataProvider side={side}>
      <CanvasWithControls side={side} panelId={`${side}-canvas`} />
      <DockviewWrapper side={side} />
    </AnimationDataProvider>
  );
}
```

**File Structure**:

```
src/features/view-3d/
├── components/
│   ├── SplitCanvas.tsx      # Side-by-side canvas layout with divider
│   └── ComparisonSide.tsx  # Wrapper for each side's context
├── contexts/
│   └── ComparisonManager.tsx  # High-level sync coordinator
```

#### 2.2 Make AnimationDataContext Side-Aware

Each canvas needs to know which side it represents.

**Changes Required**:

- AnimationDataProvider accepts a `side: 'primary' | 'comparison'` prop
- Context stores which side it represents
- `useAnimationData()` returns data based on which side's context it's in

**Pattern**:

```typescript
// In AnimationDataProvider
interface AnimationDataProviderProps {
  side?: "primary" | "comparison"; // NEW
  children: ReactNode;
}

// Inside provider, set the side
const value = useMemo(
  () => ({
    // ... existing context value
    side: props.side ?? "primary",
    // ...
  }),
  [props.side]
);

// Components use side-aware hooks
const { animationData, side } = useAnimationData();
```

#### 2.3 Add Sync Toggle Controls to Navbar

Users need visible, accessible controls to toggle synchronization behavior.

**Changes Required**:

- Add sync toggles in the `NavigationBar` component, visible only when in comparison mode
- Use icons to represent each sync option: clock (time), camera (camera), pointer (selection), palette (color)
- The active state shows a filled icon, inactive shows an outline
- Sync settings stored in AnimationDataContext (not Zustand store)

**Affected Code Location**: `src/components/NavigationBar.tsx`

---

### Phase 3: Synchronization Implementation

#### Goal

Implement the sync behaviors for time, camera, selection, and color between the two sides.

#### 3.1 ComparisonManager Component

A higher-level component that coordinates sync between sides.

**Implementation**:

```typescript
// src/features/view-3d/contexts/ComparisonManager.tsx
function ComparisonManager({ children }: { children: ReactNode }) {
  const { syncSettings, setSyncSettings, comparisonMode } = useAnimationData();

  // SyncTime: broadcast frame index changes
  useEffect(() => {
    if (!syncSettings.syncTime || !comparisonMode) return;
    // Listen to primary side's frameIndex, update comparison side
  }, [syncSettings.syncTime, comparisonMode]);

  // SyncCamera: broadcast camera changes
  useEffect(() => {
    if (!syncSettings.syncCamera || !comparisonMode) return;
    // Listen to primary side's camera, update comparison side
  }, [syncSettings.syncCamera, comparisonMode]);

  // SyncSelection: broadcast selection changes
  useEffect(() => {
    if (!syncSettings.syncSelection || !comparisonMode) return;
    // Listen to primary side's selection, update comparison side
  }, [syncSettings.syncSelection, comparisonMode]);

  // SyncColor: broadcast color metric changes
  useEffect(() => {
    if (!syncSettings.syncColor || !comparisonMode) return;
    // Listen to primary side's color mode, update comparison side
  }, [syncSettings.syncColor, comparisonMode]);

  return <>{children}</>;
}
```

#### 3.2 Time Synchronization

When `syncTime` is ON:

- Single shared timeline, but each side has its own playback state internally
- When primary side changes frameIndex, ComparisonManager updates comparison side
- Play/pause broadcasts to both sides

When `syncTime` is OFF:

- Each side operates independently
- No cross-side communication

**Handling Different Frame Counts**:

- Both sides show their own timeline range
- If sync enabled, sync to minimum frame count
- Show warning "Different duration" indicator

#### 3.3 Camera Synchronization

When `syncCamera` is ON:

- Listen to OrbitControls `change` event on primary side
- Debounce and copy camera position/target to comparison side

When `syncCamera` is OFF:

- Each canvas has independent camera control

**Handling Different Building Scales**:

- Use relative camera offset (not absolute position)
- Same delta applied to both views

#### 3.4 Selection Synchronization

When `syncSelection` is ON:

- Broadcast selection changes from one side to the other
- Match by node ID when buildings match

When `syncSelection` is OFF:

- Independent selection in each canvas

**Handling Different Buildings**:

```typescript
const buildingsMatch = useMemo(() => {
  return primaryData?.metadata?.buildingFolder === comparisonData?.metadata?.buildingFolder;
}, [primaryData, comparisonData]);

// Auto-disable if buildings don't match
useEffect(() => {
  if (syncSelection && !buildingsMatch) {
    setSyncSettings({ syncSelection: false });
    showWarning("Different buildings - selection sync disabled");
  }
}, [buildingsMatch, syncSelection]);
```

#### 3.5 Color Synchronization

When `syncColor` is ON:

- Changing "color by" metric on one side updates both

When `syncColor` is OFF:

- Each side has independent color mode

---

### Phase 4: Panel Updates for Comparison Mode

#### Goal

Each side has its own dockview with panels. No cross-side panel sharing.

#### 4.1 Independent Dockviews

Each side renders its own dockview:

- Left side shows panels for primary simulation
- Right side shows panels for comparison simulation
- No need for simulation selector dropdown in panels - each panel automatically shows its side's data

#### 4.2 Handle Different Building Geometries

When buildings differ:

- Show warning "Different buildings - data may not be directly comparable"
- InterstoryDrift charts show their own Y-axis scales
- NodePanel shows "Node not present" for missing nodes

---

### Phase 5: State Persistence and Edge Cases

#### Goal

Handle state saving, sharing, and edge cases gracefully.

#### 5.1 State Persistence

Store in URL/state:

- Both simulation selections (building folder + simulation folder)
- Sync settings
- Layout preferences (split ratio)

**Implementation**: Extend existing `statePersistence.ts`

#### 5.2 Edge Cases

| Edge Case              | Handling                                              |
| ---------------------- | ----------------------------------------------------- |
| Different frame counts | Show warning, sync to minimum, allow independent time |
| Different buildings    | Disable selection sync, show warnings                 |
| One fails to load      | Show error, allow viewing successful one              |
| Memory constraints     | Lazy load comparison data after primary ready         |

---

## Component Changes Summary

### AnimationDataContext

- **Add**: `side?: 'primary' | 'comparison'` prop to provider
- **Add**: `comparisonMode: boolean`
- **Add**: `comparisonBinding: { building, simulation } | null`
- **Add**: `syncSettings: SyncSettings`
- **Add**: `setComparisonSelection()`, `setSyncSettings()`

### SimulationPickerOverlay

- **Change**: Radio buttons → checkboxes for simulation selection
- **Add**: Track selected simulations array (max 2)
- **Add**: "Compare (n)" button

### CanvasWithControls

- **Add**: `side?: 'primary' | 'comparison'` prop

### NavigationBar

- **Add**: Sync toggle buttons (visible in comparison mode)

### View3d (page.tsx)

- **Change**: Check comparisonMode, render SplitView or SingleView

---

## Implementation Phases and Timeline

### Phase 1: Foundation (Estimated 1-2 weeks)

- [ ] Extend AnimationDataContext for comparison support
- [ ] Update SimulationPickerOverlay for multi-select
- [ ] Add comparison mode state
- [ ] Create SplitView layout in View3d

### Phase 2: Core Synchronization (Estimated 1-2 weeks)

- [ ] Create ComparisonManager
- [ ] Implement time sync
- [ ] Implement camera sync
- [ ] Implement selection sync
- [ ] Implement color sync
- [ ] Add sync toggle UI to navbar

### Phase 3: Panel Integration (Estimated 1-2 weeks)

- [ ] Verify panels work in each side's context
- [ ] Handle different building geometries
- [ ] Test independent operation

### Phase 4: Polish and Testing (Estimated 1 week)

- [ ] Handle different frame counts
- [ ] Performance optimization
- [ ] UI polish
- [ ] End-to-end testing

---

## Open Questions for Stakeholders

1. **Default sync settings**: Sync is ON by default. (Recommended, user agreed)

2. **Timeline display**: Single shared timeline with dual indicators, or independent timelines? (Recommended: Single shared timeline when synced, indicator showing both frame positions)

3. **URL sharing**: Should comparison state be shareable via URL? If so, use compact encoding with simulation IDs.

4. **Memory management**: Load primary first, comparison in background. (Following existing pipeline)

---

## Related Documentation

- **SAVING_STATE.md**: State persistence patterns
- **DATA_DOCUMENTATION.md**: Data format documentation
- **TODO.md**: Task tracking

---

## Revision History

| Date       | Version | Changes                                                                                                 |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------- |
| 2026-04-15 | 1.0     | Initial implementation plan                                                                             |
| 2026-04-15 | 1.1     | Updated based on user feedback: SPA in state, independent contexts per side, ComparisonManager for sync |
