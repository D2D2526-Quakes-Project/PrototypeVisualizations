# TODO - Running Document

> **This is a living document. Please add new items as they are discovered and break down large tasks into smaller checkable items. Check off items as they are completed.**

---

### 2.2 Update Color UI

- [ ] Allow the user to change the color for each metric

---

### 3.1 Time Context Sync

- [ ] Add time range selection (start/end frames) for analysis

---

### 4.3 Consistency

- [x] Add informative tooltips to all interactive elements. Include all numbers and units.

---

## 5. Data Panel Enhancements

### 5.1 New Panels to Create

- [ ] Add small graphs for all metrics in the Node Panel
- [ ] Rotation Time Series Panel
- [ ] Velocity Distribution Panel
- [ ] Acceleration Distribution Panel
- [ ] Combined Metrics Panel (multiple metrics overlay)
- [ ] Time Range Analysis Panel

### 5.2 Existing Panel Improvements

- [ ] Add color bar legends to charts

---

## 6. Future Endeavors

### 6.1 Hinge/Beam Element Data

- [ ] Explore data folder for element data formats
- [ ] Write Python parsing scripts for binary element data
- [ ] Add JavaScript parsing for web consumption
- [ ] Create element visualization in 3D view
- [ ] Add hinge force/yielding visualization
- [ ] Add beam moment diagrams

### 6.2 Multi-Simulation Comparison

- [ ] Design data loading for multiple simulations
- [ ] Create side-by-side view layout
- [ ] Implement synchronized playback
- [ ] Add difference visualization
- [ ] Add simulation selector UI

### 6.3 Export Functionality

- [ ] Add canvas image export (PNG, high-res)
- [ ] Add chart image export
- [ ] Add GIF recording for playback
- [ ] Add video export (MP4/WebM)
- [ ] Add data table CSV export

---

## 7. View Modes & Visualization

### 7.1 New View Modes

- [ ] Add a way to view the ground motion either in the scene or in a separate panel
- [ ] Create "Velocity Vectors" view mode
- [ ] Create "Acceleration Vectors" view mode

### 7.2 Enhanced Rendering

- [ ] Add displacement vector arrows to nodes (view toggle)

- [ ] Add node labels (story/floor IDs)
- [ ] Add marching cubes to create voxel grid volumes from nodes. Allow coloring and thresholding just like nodes, but toggle between hiding or showing values above the threshold

---

## 8. Performance Optimization

### 8.1 Rendering Performance

- [ ] Optimize large node count rendering
- [ ] Optimize rerenders

---

## 9. User Experience

### 9.1 UI Improvements

- [ ] Add keyboard shortcuts for common actions
- [ ] Add undo/redo for selections
- [ ] Add "reset to defaults" button
- [ ] Improve panel drag/resize handles
- [ ] When panels are tabbed, they should share the same tab bar buttons (e.g., close, maximize, etc.)
- [ ] Make the Magic Panel dropdown, just text if the tab is not focused. If it is the only tab, it should remain a dropdown.

- [ ] Change the views menu popover to be a sidebar that takes up space next to the canvas

- [ ] Update teh Damage Threshold panel to have a better layout and information. Remove the checkboxes and add a slider to set the threshold.

### 9.2 Help & Documentation

- [ ] Add tooltips to all controls
- [ ] Create in-app help overlay

- [x] Add familiar file menu items (file, edit, view, help, etc.)
- [ ] Switch save-profile changes without requiring full page reload

---

### 10.1 Expand ComputedStats in types.ts

- [ ] Add peak values for each metric per node

---

## 12. View Mode & Visualization System Cleanup

The view mode system has incompatibilities and incomplete features. Need to unify and fix.

### 12.1 Simplify View Modes

- [ ] Consolidate view modes to: All Nodes, Wireframe, Floor Slabs
- [ ] Remove redundant view modes (threshold should be a color mode, not view mode)
- [ ] Ensure view mode changes don't break 3D scene rendering

### 12.2 Node Selection & Highlighting

- [ ] Fix node highlighting not working in all view modes
- [x] Make node hover work correctly for each view mode
- [x] Fix node panel colors not matching actual node positions
- [x] Fix node panel points not moving correctly with animation

### 12.3 Floor Selection & Panel

- [x] In floor slab view, disable node selection (floors are selectable, not nodes)
- [ ] Expand floor sidebar to show corners and drift values
- [ ] Click on corners to open specific node details/reference graph

### 12.4 Color By Integration

- [ ] Color by should work consistently across all view modes
- [ ] Color by should use threshold values for coloring
- [ ] Ensure floor slabs and nodes use same color mapping

### 12.5 Tooltips & User Guidance

- [ ] Add tooltip/hint in bottom-left of 3D view explaining box selection (Ctrl+drag)
- [ ] Add tooltips for all control panel options
- [ ] Document keyboard shortcuts

---

### 13.3 Slice & Exploded View

- [ ] Fix slice view working with node selection
- [ ] Fix exploded view working with node selection
- [ ] Fix displacement scale working with node selection
- [ ] Ensure box selection works correctly with all features

---

### 14.2 Replace with Main View Modes

- [ ] Add ribbons view mode to main 3D view (based on TemporalRibbons page)
- [ ] Move elevation slice features into main view as a mode

---

## 15. Unit Conversion Tooltips

Every number with a unit should be hoverable with conversions.

### 15.1 Create UnitTooltip Component

- [x] Create reusable UnitTooltip component using shadcn Tooltip
- [x] Support conversions: inches ↔ feet ↔ meters
- [x] Show full unit name on hover (not just abbreviation)
- [x] Click to copy numeric value

### 15.2 Integrate Across App

- [x] Add UnitTooltip to all displacement values
- [x] Add UnitTooltip to all velocity values
- [x] Add UnitTooltip to all acceleration values
- [x] Add UnitTooltip to all rotation values
- [x] Add UnitTooltip to all time values

### 15.3 Unit Conversion Reference

| Symbol | Full Name       | Conversions                 |
| ------ | --------------- | --------------------------- |
| in     | inches          | 1 in = 0.0254 m = 0.0833 ft |
| in/s   | inches/second   | 1 in/s = 0.0254 m/s         |
| in/s²  | inches/second²  | 1 in/s² = 0.0254 m/s²       |
| rad    | radians         | 1 rad = 57.2958°            |
| rad/s  | radians/second  | 1 rad/s = 57.2958°/s        |
| rad/s² | radians/second² | 1 rad/s² = 57.2958°/s²      |
| %      | percent         | 1% = 0.01 ratio             |
| s      | seconds         | -                           |

---

## 16. Node Panel & Selection Issues

### 16.1 Fix Node Panel Problems

- [ ] Fix node coloring not matching actual node positions
- [ ] Fix node points not animating correctly with playback
- [ ] Ensure selected nodes highlight correctly in all view modes

### 16.2 Selection System

- [ ] Make box selection (Ctrl+drag) more discoverable
- [ ] Add visual feedback during box selection
- [ ] Ensure selected nodes sync across all views
- [ ] When there is a selection, these options should be available in both the View Menu and the Collapsed View Menu: Clear Selection, Hide Selected Nodes, Show All Nodes
- [x] Add `Hide Selected Nodes` toggle in the expanded view controls

---

## 17. Saveable and Sharable UI & URLs

### 17.1 Create State Persistence Infrastructure

- [x] Create `src/lib/statePersistence.ts` with:
  - [x] `AppState` interface defining all savable state
  - [x] `saveToLocalStorage(state: AppState): void` - saves full state with timestamp
  - [x] `loadFromLocalStorage(): AppState | null`
  - [x] `getStateForUrl(includePanels: boolean): string` - compressed state for URL
  - [x] `restoreFromUrl(encoded: string): AppState | null`

- [x] Add lz-string compression library for URL encoding
  - [x] `pnpm add lz-string`
  - [x] Use compression in `getStateForUrl` to handle large state

### 17.2 Define Full AppState Interface

- [x] Define `AppState` in `src/lib/statePersistence.ts`:
  ```typescript
  interface AppState {
    version: number;
    timestamp: number;
    // Playback
    frameIndex: number;
    // View Settings
    currentMetric: Metric;
    thresholdHighlighting: boolean;
    // Thresholds
    thresholds: ThresholdState;
    // Floor Visibility
    visibleFloors: string[];
    // Node Selection
    selectedNodeIds: number[];
    // Exploded View
    explodedView: ExplodedViewState;
    // Slice
    sliceEnabled: boolean;
    xRange: [number, number];
    yRange: [number, number];
    zRange: [number, number];
    // Camera
    camera: {
      isOrthographic: boolean;
      position: [number, number, number];
      target: [number, number, number];
    };
    // Background
    backgroundColor: string;
    // Panel Layout
    layout: SerializedDockview;
    // Panel States (per-panel config)
    panelStates: Record<string, PanelState>;
  }
  ```

### 17.3 Merge Playback into Zustand

- [ ] Update `src/stores/viewStore.ts`:
  - [ ] Add `playing: boolean` to ViewState
  - [ ] Add `fps: number` to ViewState
  - [ ] Add `skippedPerFrame: number` to ViewState
  - [ ] Update methods to use Zustand instead of PlaybackContext

- [ ] Update `src/components/playback/PlaybackContext.tsx`:
  - [ ] Remove duplicate state management
  - [ ] Read from Zustand store instead
  - [ ] Keep animation loop logic but sync with Zustand

### 17.4 Add Camera State to Zustand

- [x] Update `src/stores/viewStore.ts`:
  - [x] Add `cameraState` to ViewState interface
  - [x] Add `setCameraState` action

- [x] Update `src/contexts/CameraContext.tsx`:
  - [x] Add `getCameraState()` method to capture position/target
  - [x] Add `setCameraState(state)` method to restore
  - [ ] Subscribe to Zustand changes
  - [ ] Update OrbitControls from Zustand on change

### 17.5 Create Panel State Registry

- [x] Define `PanelState` types for each panel:
  - [x] Timeline: `{ selectedKeys: ChannelKey[] }`
  - [x] StoryDriftHeatmap: `{ selectedCorners: Corner[], resolution: number }`
  - [x] InterstoryDriftChart: `{ visibleCorners: string[] }` (from eCharts legend)
  - [x] Main Canvas: Already captured in main view settings (now per-panel with CanvasPanelState)

- [x] Create `src/contexts/PanelStateContext.tsx`:
  - [x] Create context for panel state management
  - [x] Provide `getPanelState(panelId): PanelState`
  - [x] Provide `setPanelState(panelId, state): void`

- [ ] Update panels to use PanelStateContext:
  - [ ] Timeline.tsx - sync selectedKeys
  - [ ] StoryDriftHeatmap.tsx - sync selectedCorners, resolution

### 17.6 Handle eCharts Legend State

- [ ] Research ECharts legend API for series visibility
- [ ] Add legend state capture to InterstoryDriftChart:
  - [ ] Get reference to ECharts instance
  - [ ] Read `chartInstance.getOption().legend[0].selected`
  - [ ] Store visible series names

### 17.7 Auto-Save to LocalStorage

- [x] Create auto-save subscription in View3d page:
  - [x] Subscribe to Zustand store changes
  - [x] Debounce saves (2-3 seconds after last change)
  - [x] Skip saving during active playback (when `playing === true`)
  - [x] Save complete AppState on change

### 17.8 Named Presets System

- [x] Extend `src/lib/statePersistence.ts`:
  - [x] Add `saveNamedPreset(name: string, state: AppState): void`
  - [x] `loadNamedPreset(name: string): AppState | null`
  - [x] `deleteNamedPreset(name: string): void`
  - [x] `listNamedPresets(): string[]`

- [x] Add localStorage keys:
  - [x] `visuals_auto_save` - current working state
  - [x] `visuals_presets` - array of named presets
  - [x] `visuals_last_url_state` - temporary URL-loaded state

### 17.9 URL State Management

- [x] Update URL handling in app:
  - [x] Add `?state=` parameter support
  - [x] Keep backward compatibility with `?layout=` (only restore layout)
  - [x] Create separate function for "short URL" (excludes panel states)

- [x] On app mount:
  - [x] Check for `?state=` param first
  - [x] If found, load to "temporary/guest" state buffer
  - [x] Show toast: "State loaded from URL"
  - [x] Allow user to "Save as Preset" from URL state

### 17.10 Enhanced ShareButton UI

- [x] Update `src/components/ShareButton.tsx`:
  - [x] Change to dropdown menu
  - [x] "Copy Short Link" - state without panel configs
  - [x] "Copy Full Link" - complete state
  - [x] "Save to Browser" - save current state
  - [x] "Load Saved" - submenu with saved presets list

- [x] Add ShareMenu component:
  - [x] Show list of named presets
  - [x] Allow delete presets
  - [x] "Reset to Defaults" option

### 17.11 State Restoration Flow

- [x] Implement state restore logic:
  - [x] `restoreState(state: AppState): void` - applies all state
  - [x] Restore playback (frameIndex)
  - [x] Restore thresholds, colors, floor visibility
  - [x] Restore node selection
  - [x] Restore exploded view, slice settings
  - [x] Restore camera position
  - [x] Restore background color
  - [x] Restore dockview layout
  - [x] Restore panel states

- [x] Handle URL state as "guest" state:
  - [x] Store URL state separately
  - [x] Apply as "temporary" until user saves or navigates away

### 17.12 Consolidate Panel State into Zustand

- [x] Remove `PanelStateContext` provider and store panel state in `viewStore`
- [x] Update `Timeline.tsx` to sync selected keys via Zustand panel state
- [x] Update `StoryDriftHeatmap.tsx` to sync selected corners and resolution via Zustand panel state
- [x] Update `CanvasWithControls.tsx` to save camera state via Zustand panel state
- [ ] Add migration for legacy saves that only contain context-backed panel state

### 17.13 Update Panels to Sync with eCharts Legend

- [x] Add legend state capture to InterstoryDriftChart:
  - [x] Get reference to ECharts instance
  - [x] Read `chartInstance.getOption().legend[0].selected`
  - [x] Store visible series names

### 17.14 Zustand Architecture Follow-ups

- [ ] Introduce workspace-scoped state shape (`workspaces[workspaceId]`) for split-view support
- [ ] Separate persisted state from transient runtime state (`fps`, drag state, hover state)
- [x] Remove provider-only visualization wrappers (`floor`, `threshold`, `color`, `view mode`, `exploded`, `node visibility`) and use Zustand-backed hooks directly
- [x] Move node hover/selection and slice hover/selection into Zustand-backed interaction state
- [x] Add explicit interaction-mode policy for node vs slab pointer behavior

---

## 18. Known Bugs

- [x] When letting go of ctrl before releasing the mouse button, the box selection is not cleared

_Last Updated: February 2026_
