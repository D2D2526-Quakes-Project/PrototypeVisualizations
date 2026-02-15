# Building Visualization System Architecture

## Overview

This document outlines the architecture for implementing view modes, coloring systems, exploded views, slice selection, and node selection features in the 3D building visualization.

---

## 1. Core Systems

### 1.1 View Mode System

**Location:** `/contexts/ViewModeContext.tsx`

```typescript
type ViewMode =
  | "all-nodes" // Current default
  | "floor-slabs" // Show horizontal floor planes
  | "exterior-only" // Show only perimeter nodes
  | "corners-only" // Show only corner nodes per floor
  | "vertical-connections" // Show nodes + vertical lines
  | "custom-selection"; // User-defined node subset

interface ViewModeConfig {
  mode: ViewMode;
  // Filtering function that determines which nodes to render
  nodeFilter: (nodeId: number, metadata: AnimationMetadata) => boolean;
  // Optional: custom rendering component
  renderComponent?: ReactNode;
}
```

**Implementation Strategy:**

- Create a context provider that manages current view mode
- Each view mode has a filtering function that determines visibility
- BuildingScene reads from this context to decide what to render
- View mode selector added to ViewControls component

**Node Filtering Functions:**

```typescript
// lib/viewFilters.ts
export const viewFilters = {
  allNodes: (nodeId: number) => true,

  floorSlabs: (nodeId: number, metadata: AnimationMetadata) => {
    // Return true if node is part of any floor
    return Object.values(metadata.stories).some((storyNodes) => storyNodes.includes(nodeId));
  },

  exteriorOnly: (nodeId: number, metadata: AnimationMetadata) => {
    // Check if node is on building perimeter
    // Implementation depends on building geometry data
    return isPerimeterNode(nodeId, metadata);
  },

  cornersOnly: (nodeId: number, metadata: AnimationMetadata) => {
    return Object.values(metadata.corners).flat().includes(nodeId);
  },
};
```

---

### 1.2 Coloring System

**Location:** `/lib/colorScales.ts`

```typescript
type ColorMetric = "displacement" | "velocity" | "acceleration" | "story-drift" | "custom";

interface ColorScale {
  metric: ColorMetric;
  // Tailwind-based color gradient (using oklch for better interpolation)
  colorStops: string[]; // e.g., ['oklch(82.8% 0.189 84.429)', 'oklch(50.5% 0.213 27.518)']
  // Function to extract the metric value from node data
  extractValue: (nodeId: number, frameIndex: number, data: BuildingAnimationData) => number;
  // Max value for normalization (can be computed or fixed)
  maxValue: number;
  // Label for UI
  label: string;
  // Unit string for display
  unit: string;
}

// Predefined color scales using Tailwind colors
export const COLOR_SCALES: Record<ColorMetric, ColorScale> = {
  displacement: {
    metric: "displacement",
    colorStops: [
      "oklch(82.8% 0.189 84.429)", // amber-400
      "oklch(50.5% 0.213 27.518)", // red-700
    ],
    extractValue: (nodeId, frameIndex, data) => {
      const disp = data.displacementLin.atFrame(frameIndex).at(nodeId);
      return Math.hypot(disp[0], disp[1], disp[2]);
    },
    maxValue: 0, // Set dynamically from precomputed stats
    label: "Displacement",
    unit: "in",
  },

  velocity: {
    metric: "velocity",
    colorStops: [
      "oklch(75% 0.15 150)", // green-400
      "oklch(65% 0.20 230)", // blue-500
    ],
    extractValue: (nodeId, frameIndex, data) => {
      if (!data.velocityLin) return 0;
      const vel = data.velocityLin.atFrame(frameIndex).at(nodeId);
      return Math.hypot(vel[0], vel[1], vel[2]);
    },
    maxValue: 0,
    label: "Velocity",
    unit: "in/s",
  },

  acceleration: {
    metric: "acceleration",
    colorStops: [
      "oklch(90% 0.05 180)", // cyan-200
      "oklch(55% 0.25 300)", // purple-600
    ],
    extractValue: (nodeId, frameIndex, data) => {
      if (!data.accelerationLin) return 0;
      const acc = data.accelerationLin.atFrame(frameIndex).at(nodeId);
      return Math.hypot(acc[0], acc[1], acc[2]);
    },
    maxValue: 0,
    label: "Acceleration",
    unit: "in/s²",
  },

  "story-drift": {
    metric: "story-drift",
    colorStops: [
      "oklch(95% 0.05 120)", // green-100
      "oklch(45% 0.25 20)", // red-800
    ],
    extractValue: (nodeId, frameIndex, data) => {
      // Find which story this node belongs to
      const storyId = findStoryForNode(nodeId, data.metadata);
      if (!storyId) return 0;
      const storyIndex = data.metadata.storyOrder.indexOf(storyId);
      const drifts = data.precomputed.storyDrift.getStoryDrift(storyIndex, frameIndex);
      return Math.max(...drifts); // Max drift of all corners
    },
    maxValue: 0,
    label: "Story Drift",
    unit: "%",
  },
};
```

**Color Context:**

```typescript
// contexts/ColorContext.tsx
interface ColorContextType {
  currentMetric: ColorMetric;
  setColorMetric: (metric: ColorMetric) => void;
  getNodeColor: (nodeId: number, frameIndex: number) => THREE.Color;
}
```

**Integration:**

- Move color computation logic out of BuildingScene
- Create reusable color utility functions
- Add color metric selector to ViewControls
- Update all visualization components to use the color context

---

### 1.3 Exploded View System

**Location:** `/contexts/ExplodedViewContext.tsx`

```typescript
interface ExplodedViewState {
  enabled: boolean;
  // Explosion factors (0 = normal, 1 = full explosion)
  xExplosion: number;
  yExplosion: number;
  zExplosion: number;
  // Base explosion distance (multiplied by factors)
  explosionDistance: number;
}

interface ExplodedViewContextType {
  state: ExplodedViewState;
  setExplosion: (axis: "x" | "y" | "z", factor: number) => void;
  toggleExploded: () => void;
  reset: () => void;
  // Compute exploded position for a node
  getExplodedPosition: (nodeId: number, basePosition: [number, number, number]) => [number, number, number];
}
```

**Position Calculation:**

```typescript
// For Z-axis (floor) explosion:
getExplodedPosition(nodeId, [x, y, z]) {
  if (!state.enabled) return [x, y, z];

  // Find which story this node belongs to
  const storyIndex = findStoryIndexForNode(nodeId);
  const totalStories = metadata.storyOrder.length;

  // Center the explosion around the middle story
  const centerOffset = storyIndex - (totalStories / 2);

  return [
    x + (centerOffset * state.explosionDistance * state.xExplosion),
    y + (centerOffset * state.explosionDistance * state.yExplosion),
    z + (centerOffset * state.explosionDistance * state.zExplosion)
  ];
}
```

**UI Controls:**

- Add "Exploded View" toggle to ViewControls
- Add sliders for X/Y/Z explosion factors
- Consider preset explosion configurations (floor-only, full-3D, etc.)

---

### 1.4 Slice Selection System

**Location:** `/contexts/SliceSelectionContext.tsx`

```typescript
type SliceType = "floor" | "xz-plane" | "yz-plane" | "xy-plane";

interface Slice {
  id: string;
  type: SliceType;
  // For floor: story ID; for planes: position along axis
  value: string | number;
  // Nodes included in this slice
  nodeIds: number[];
  // Display name
  label: string;
}

interface SliceSelectionContextType {
  selectedSlices: Slice[];
  selectSlice: (slice: Slice) => void;
  deselectSlice: (sliceId: string) => void;
  clearSlices: () => void;
  // Helper to open slice panel
  openSlicePanel: (slice: Slice) => void;
}
```

**Slice Detection:**

```typescript
// lib/sliceDetection.ts
export function detectSliceAtPosition(
  position: [number, number, number],
  type: SliceType,
  metadata: AnimationMetadata,
  tolerance: number = 1.0, // inches
): Slice | null {
  switch (type) {
    case "floor":
      // Find nearest floor
      const storyId = findNearestStory(position[2], metadata, tolerance);
      if (!storyId) return null;
      return {
        id: `floor-${storyId}`,
        type: "floor",
        value: storyId,
        nodeIds: metadata.stories[storyId],
        label: `Floor ${storyId}`,
      };

    case "xz-plane":
      // Find nodes at similar Y coordinate
      const nodesAtY = findNodesAtCoordinate("y", position[1], tolerance);
      return {
        id: `xz-${position[1]}`,
        type: "xz-plane",
        value: position[1],
        nodeIds: nodesAtY,
        label: `XZ Slice at Y=${position[1].toFixed(1)}"`,
      };

    // Similar for yz-plane and xy-plane
  }
}
```

**SlicePanel Component:**

```typescript
// components/SlicePanel.tsx
export function SlicePanel({ slice }: { slice: Slice }) {
  // Similar to NodePanel but for a collection of nodes
  // Shows:
  // - Slice identification info
  // - Mini 3D preview of just those nodes
  // - Stats aggregated across all nodes in slice
  // - Individual node list (expandable)
}
```

**Interaction Flow:**

1. User hovers over building in BuildingScene
2. System detects potential slices (floors, planes)
3. Hover effect highlights the slice
4. Click opens SlicePanel via dockview
5. Panel shows slice-specific visualizations and data

---

### 1.5 Node Selection & Visibility System

**Location:** `/contexts/NodeVisibilityContext.tsx`

```typescript
interface BoundingBox {
  min: [number, number, number];
  max: [number, number, number];
}

interface NodeVisibilityState {
  // Bounding box defining visible region
  visibilityBox: BoundingBox | null;
  // Explicitly selected nodes (from lasso or other selection)
  selectedNodeIds: Set<number>;
  // Slice mode: show only nodes in a specific Z range
  sliceMode: {
    enabled: boolean;
    min: number;
    max: number;
  };
}

interface NodeVisibilityContextType {
  state: NodeVisibilityState;
  // Set visibility box (null = show all)
  setVisibilityBox: (box: BoundingBox | null) => void;
  // Lasso selection
  performLassoSelection: (screenPoints: [number, number][]) => void;
  // Slice controls
  setSliceRange: (min: number, max: number) => void;
  // Check if node should be visible
  isNodeVisible: (nodeId: number) => boolean;
}
```

**Lasso Selection Implementation:**

```typescript
// lib/lassoSelection.ts
export function performLassoSelection(
  lassoPoints: [number, number][], // Screen space coordinates
  camera: THREE.Camera,
  nodePositions: Float32Array,
  nodeCount: number,
): number[] {
  const selectedNodes: number[] = [];
  const raycaster = new THREE.Raycaster();

  for (let i = 0; i < nodeCount; i++) {
    const worldPos = new THREE.Vector3(nodePositions[i * 3], nodePositions[i * 3 + 1], nodePositions[i * 3 + 2]);

    // Project to screen space
    const screenPos = worldPos.clone().project(camera);
    const screenX = (screenPos.x + 1) / 2;
    const screenY = (1 - screenPos.y) / 2;

    // Check if point is inside lasso polygon
    if (isPointInPolygon([screenX, screenY], lassoPoints)) {
      selectedNodes.push(i);
    }
  }

  return selectedNodes;
}
```

**Slice Control UI:**

```typescript
// components/SliceControls.tsx
export function SliceControls() {
  const { state, setSliceRange } = useNodeVisibility();
  const { animationData } = useAnimationData();

  const minZ = animationData.precomputed.boundingBox.min[2];
  const maxZ = animationData.precomputed.boundingBox.max[2];

  return (
    <div className="slice-controls">
      <label>Slice View</label>
      <Switch
        checked={state.sliceMode.enabled}
        onChange={/* toggle slice mode */}
      />

      {state.sliceMode.enabled && (
        <RangeSlider
          min={minZ}
          max={maxZ}
          value={[state.sliceMode.min, state.sliceMode.max]}
          onChange={([min, max]) => setSliceRange(min, max)}
        />
      )}
    </div>
  );
}
```

---

## 2. Integration Architecture

### 2.1 Context Hierarchy

```
App
├─ AnimationDataProvider (existing)
├─ PlaybackProvider (existing)
├─ NodeSelectionProvider (existing)
├─ CameraProvider (existing)
└─ VisualizationProvider (NEW - wraps all visualization contexts)
   ├─ ViewModeProvider
   ├─ ColorProvider
   ├─ ExplodedViewProvider
   ├─ SliceSelectionProvider
   └─ NodeVisibilityProvider
```

**Rationale:** Group all visualization-related contexts under a single provider to:

- Simplify imports
- Enable cross-context optimizations
- Provide unified state management

### 2.2 Component Updates

**BuildingScene.tsx:**

```typescript
export function BuildingScene() {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { selectedNodes } = useNodeSelection();

  // NEW: Visualization contexts
  const { currentMode, nodeFilter } = useViewMode();
  const { getNodeColor } = useColor();
  const { getExplodedPosition } = useExplodedView();
  const { isNodeVisible } = useNodeVisibility();

  // Filter visible nodes based on all contexts
  const visibleNodes = useMemo(() => {
    const nodes: number[] = [];
    for (let i = 0; i < animationData.metadata.nodeCount; i++) {
      if (nodeFilter(i) && isNodeVisible(i)) {
        nodes.push(i);
      }
    }
    return nodes;
  }, [nodeFilter, isNodeVisible, animationData.metadata.nodeCount]);

  // Compute positions with explosion
  const positions = useMemo(() => {
    const positions = new Float32Array(visibleNodes.length * 3);
    visibleNodes.forEach((nodeId, idx) => {
      const pos = animationData.initialPositions.at(nodeId);
      const disp = animationData.displacementLin.atFrame(frameIndex).at(nodeId);
      const base: [number, number, number] = [
        pos[0] + disp[0],
        pos[1] + disp[1],
        pos[2] + disp[2]
      ];
      const exploded = getExplodedPosition(nodeId, base);
      positions[idx * 3] = exploded[0];
      positions[idx * 3 + 1] = exploded[1];
      positions[idx * 3 + 2] = exploded[2];
    });
    return positions;
  }, [visibleNodes, frameIndex, getExplodedPosition]);

  // Compute colors based on selected metric
  const colors = useMemo(() => {
    const colors = new Float32Array(visibleNodes.length * 3);
    visibleNodes.forEach((nodeId, idx) => {
      const color = getNodeColor(nodeId, frameIndex);
      color.toArray(colors, idx * 3);
    });
    return colors;
  }, [visibleNodes, frameIndex, getNodeColor]);

  // Render based on view mode
  return (
    <>
      {currentMode === 'all-nodes' && <NodesRenderer positions={positions} colors={colors} />}
      {currentMode === 'floor-slabs' && <FloorSlabsRenderer nodes={visibleNodes} />}
      {currentMode === 'vertical-connections' && (
        <>
          <NodesRenderer positions={positions} colors={colors} />
          <VerticalConnectionsRenderer nodes={visibleNodes} />
        </>
      )}
      {/* ... other rendering modes ... */}
    </>
  );
}
```

**ViewControls Component:**

```typescript
export function ViewControls() {
  const { currentMode, setViewMode } = useViewMode();
  const { currentMetric, setColorMetric } = useColor();
  const { state: explodedState, toggleExploded } = useExplodedView();

  return (
    <div className="view-controls">
      {/* Existing controls */}

      {/* NEW: View Mode Selector */}
      <select value={currentMode} onChange={e => setViewMode(e.target.value)}>
        <option value="all-nodes">All Nodes</option>
        <option value="floor-slabs">Floor Slabs</option>
        <option value="exterior-only">Exterior Only</option>
        <option value="corners-only">Corners Only</option>
        <option value="vertical-connections">Vertical Connections</option>
      </select>

      {/* NEW: Color Metric Selector */}
      <select value={currentMetric} onChange={e => setColorMetric(e.target.value)}>
        <option value="displacement">Displacement</option>
        <option value="velocity">Velocity</option>
        <option value="acceleration">Acceleration</option>
        <option value="story-drift">Story Drift</option>
      </select>

      {/* NEW: Exploded View Toggle */}
      <button onClick={toggleExploded}>
        {explodedState.enabled ? 'Normal View' : 'Exploded View'}
      </button>

      {explodedState.enabled && (
        <ExplodedViewControls />
      )}

      {/* NEW: Slice Controls */}
      <SliceControls />
    </div>
  );
}
```

---

## 3. Rendering Components

### 3.1 Floor Slabs Renderer

```typescript
// components/renderers/FloorSlabsRenderer.tsx
export function FloorSlabsRenderer({ nodes }: { nodes: number[] }) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { getNodeColor } = useColor();

  // Group nodes by story
  const storiesByNodes = useMemo(() => {
    const grouped = new Map<string, number[]>();
    Object.entries(animationData.metadata.stories).forEach(([storyId, storyNodes]) => {
      grouped.set(storyId, storyNodes.filter(n => nodes.includes(n)));
    });
    return grouped;
  }, [nodes, animationData.metadata.stories]);

  return (
    <>
      {Array.from(storiesByNodes.entries()).map(([storyId, storyNodes]) => (
        <FloorSlab
          key={storyId}
          storyId={storyId}
          nodes={storyNodes}
          frameIndex={frameIndex}
          getColor={getNodeColor}
        />
      ))}
    </>
  );
}

function FloorSlab({ storyId, nodes, frameIndex, getColor }) {
  // Get positions of all nodes in this story
  const positions = useMemo(() => {
    return nodes.map(nodeId => {
      const pos = animationData.initialPositions.at(nodeId);
      const disp = animationData.displacementLin.atFrame(frameIndex).at(nodeId);
      return [pos[0] + disp[0], pos[1] + disp[1], pos[2] + disp[2]];
    });
  }, [nodes, frameIndex]);

  // Compute convex hull for floor outline
  const hullPoints = useMemo(() => {
    const points2D = positions.map(p => [p[0], p[1]]);
    return polygonHull(points2D); // Using existing utility
  }, [positions]);

  // Average color of all nodes in floor
  const floorColor = useMemo(() => {
    const colors = nodes.map(nodeId => getColor(nodeId, frameIndex));
    return averageColors(colors);
  }, [nodes, frameIndex, getColor]);

  return (
    <mesh>
      <shapeGeometry args={[createShape(hullPoints)]} />
      <meshBasicMaterial color={floorColor} transparent opacity={0.6} />
    </mesh>
  );
}
```

### 3.2 Vertical Connections Renderer

```typescript
// components/renderers/VerticalConnectionsRenderer.tsx
export function VerticalConnectionsRenderer({ nodes }: { nodes: number[] }) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();

  // Find vertical connections (same X, Y, different Z)
  const connections = useMemo(() => {
    const connections: Array<[number, number]> = [];
    const nodePositions = new Map<string, number[]>();

    // Group nodes by X, Y coordinates
    nodes.forEach(nodeId => {
      const pos = animationData.initialPositions.at(nodeId);
      const key = `${pos[0].toFixed(2)},${pos[1].toFixed(2)}`;
      if (!nodePositions.has(key)) {
        nodePositions.set(key, []);
      }
      nodePositions.get(key)!.push(nodeId);
    });

    // Create connections between vertically aligned nodes
    nodePositions.forEach(nodeIds => {
      // Sort by Z coordinate
      const sorted = nodeIds.sort((a, b) => {
        const posA = animationData.initialPositions.at(a);
        const posB = animationData.initialPositions.at(b);
        return posA[2] - posB[2];
      });

      // Connect adjacent nodes
      for (let i = 0; i < sorted.length - 1; i++) {
        connections.push([sorted[i], sorted[i + 1]]);
      }
    });

    return connections;
  }, [nodes, animationData]);

  return (
    <>
      {connections.map(([nodeA, nodeB], idx) => (
        <VerticalConnection
          key={idx}
          nodeA={nodeA}
          nodeB={nodeB}
          frameIndex={frameIndex}
        />
      ))}
    </>
  );
}
```

---

## 4. Implementation Priority & Phases

### Phase 1: Foundation (Week 1)

1. Create color scale system (`lib/colorScales.ts`)
2. Create ColorContext with displacement + velocity metrics
3. Refactor BuildingScene to use color context
4. Add color metric selector to ViewControls

**Deliverable:** Ability to switch between displacement and velocity coloring

### Phase 2: View Modes (Week 2)

1. Create ViewModeContext
2. Implement node filtering functions
3. Create FloorSlabsRenderer
4. Create VerticalConnectionsRenderer
5. Add view mode selector to UI

**Deliverable:** Switch between all-nodes, floor-slabs, and vertical-connections views

### Phase 3: Exploded View (Week 3)

1. Create ExplodedViewContext
2. Implement position explosion logic
3. Add exploded view controls to UI
4. Integrate with existing renderers

**Deliverable:** Toggle and control exploded view in all view modes

### Phase 4: Slice Selection (Week 4)

1. Create SliceSelectionContext
2. Implement slice detection on hover/click
3. Create SlicePanel component
4. Integrate with dockview system

**Deliverable:** Click on floors/planes to open detail panels

### Phase 5: Node Visibility & Selection (Week 5)

1. Create NodeVisibilityContext
2. Implement box selection tool
3. Create slice range controls
4. Add bounding box visibility controls

**Deliverable:** Advanced node selection and visibility filtering

### Phase 6: Polish & Optimization (Week 6)

1. Performance optimization (memoization, WebWorkers)
2. UI/UX refinement
3. Keyboard shortcuts
4. Documentation
5. Testing

---

## 5. File Structure

```
src/
├── contexts/
│   ├── visualization/
│   │   ├── VisualizationProvider.tsx   (wrapper)
│   │   ├── ViewModeContext.tsx
│   │   ├── ColorContext.tsx
│   │   ├── ExplodedViewContext.tsx
│   │   ├── SliceSelectionContext.tsx
│   │   └── NodeVisibilityContext.tsx
│   ├── CameraContext.tsx (existing)
│   ├── NodeSelectionContext.tsx (existing)
│   └── PlaybackContext.tsx (existing)
│
├── lib/
│   ├── colors/
│   │   ├── colorScales.ts              (color definitions)
│   │   ├── colorUtils.ts               (interpolation, conversion)
│   │   └── tailwindColors.ts           (tailwind color mappings)
│   ├── geometry/
│   │   ├── sliceDetection.ts
│   │   ├── lassoSelection.ts
│   │   └── explosionUtils.ts
│   └── filters/
│       └── viewFilters.ts              (node filtering functions)
│
├── components/
│   ├── renderers/
│   │   ├── NodesRenderer.tsx           (refactored from BuildingScene)
│   │   ├── FloorSlabsRenderer.tsx
│   │   ├── VerticalConnectionsRenderer.tsx
│   │   └── ExteriorRenderer.tsx
│   ├── panels/
│   │   ├── SlicePanel.tsx
│   │   └── NodePanel.tsx (existing)
│   ├── controls/
│   │   ├── ViewControls.tsx (enhanced)
│   │   ├── ColorControls.tsx
│   │   ├── ExplodedViewControls.tsx
│   │   ├── SliceControls.tsx
│   │   └── LassoSelector.tsx
│   └── BuildingScene.tsx (refactored)
│
└── hooks/
    ├── useViewMode.ts
    ├── useColor.ts
    ├── useExplodedView.ts
    ├── useSliceSelection.ts
    └── useNodeVisibility.ts
```

---

## 6. Key Design Decisions

### 6.1 Why Separate Contexts?

- **Modularity:** Each system is independent and can be developed/tested separately
- **Performance:** React can optimize re-renders for each context independently
- **Reusability:** Systems can be used in other views (not just 3D)

### 6.2 Why a Wrapper Provider?

- Simplifies imports (one hook instead of five)
- Enables cross-context communication if needed
- Provides single point for shared state initialization

### 6.3 Color System Design

- Use oklch color space for perceptually uniform interpolation
- Store Tailwind colors as oklch for consistency
- Pre-compute color scales on context initialization
- Cache color computations per frame

### 6.4 Performance Considerations

- Memoize expensive computations (hull, filtering, colors)
- Use Float32Arrays for positions/colors
- Batch similar operations
- Consider WebWorkers for heavy filtering operations

---

## 7. Open Questions & Decisions Needed

1. **Lasso Selection UI:**
   - Separate tool/mode or always active with modifier key?
   - Visual feedback style (rubber band, polygon outline)?

2. **Exploded View Presets:**
   - What preset configurations make sense?
   - Should explosion be animatable?

3. **Slice Interaction:**
   - Should slices be selectable via direct 3D picking or via UI controls?
   - Should multiple slices be selectable simultaneously?

4. **Node Limit Handling:**
   - Performance threshold for node count?
   - Should we auto-switch to floor-slabs view for large buildings?

5. **Color Metric Extensibility:**
   - Should users be able to define custom metrics?
   - Should we support loading color scales from config files?

---

## 8. Testing Strategy

### Unit Tests

- Color interpolation functions
- Node filtering functions
- Slice detection logic
- Explosion position calculation

### Integration Tests

- Context provider interactions
- Renderer switching
- Panel opening/closing

### Performance Tests

- Frame rate with different view modes
- Color computation benchmarks
- Selection operation latency

### User Testing

- Usability of controls
- Intuitiveness of interactions
- Visual clarity of different modes
