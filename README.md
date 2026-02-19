# Quakes Visualization Project

## Project Overview

This is a comprehensive earthquake simulation visualization tool designed to extract maximum insight from structural analysis data. The project enables engineers and researchers to explore, analyze, and understand building behavior during seismic events through multiple synchronized views and visualization techniques.

## Core Philosophy

The goal of this project is **maximum insight extraction** from simulation data. This means:
- Calculating distributions of all values
- Inspecting individual values in detail
- Viewing time series data
- Narrowing down to cross sections or filtered node selections
- Watching everything play in real-time with synchronized timelines
- Viewing peak values and average values
- Selecting specific time ranges for analysis
- Different views for elevation and floor plan
- Thresholding data for targeted flagging and spatial pattern detection
- Many more creative visualization tools to show data in as many ways as possible

## Key Values System

The project tracks and visualizes numerous key values, each with threshold controls for targeted analysis:

### Displacement Values
| Value | Description | Unit |
|-------|-------------|------|
| Displacement X | Horizontal displacement in X direction | in |
| Displacement Y | Horizontal displacement in Y direction | in |
| Displacement Z | Vertical displacement (elevation) | in |
| Displacement Magnitude | Combined displacement magnitude | in |
| Rotation RX | Rotation about X axis | rad |
| Rotation RY | Rotation about Y axis | rad |
| Rotation RZ | Rotation about Z axis | rad |
| Rotation Magnitude | Combined rotation magnitude | rad |
| Displacement Peaks | Maximum displacement values | in |
| Displacement Average | Mean displacement across selection | in |

### Velocity Values
| Value | Description | Unit |
|-------|-------------|------|
| Velocity X | Velocity in X direction | in/s |
| Velocity Y | Velocity in Y direction | in/s |
| Velocity Z | Velocity in Z direction | in/s |
| Velocity Magnitude | Combined velocity magnitude | in/s |
| Velocity RX | Angular velocity about X axis | rad/s |
| Velocity RY | Angular velocity about Y axis | rad/s |
| Velocity RZ | Angular velocity about Z axis | rad/s |
| Velocity Magnitude | Combined angular velocity magnitude | rad/s |
| Velocity Peaks | Maximum velocity values | in/s |
| Velocity Average | Mean velocity across selection | in/s |

### Acceleration Values
| Value | Description | Unit |
|-------|-------------|------|
| Acceleration X | Acceleration in X direction | in/s² |
| Acceleration Y | Acceleration in Y direction | in/s² |
| Acceleration Z | Acceleration in Z direction | in/s² |
| Acceleration Magnitude | Combined acceleration magnitude | in/s² |
| Acceleration RX | Angular acceleration about X axis | rad/s² |
| Acceleration RY | Angular acceleration about Y axis | rad/s² |
| Acceleration RZ | Angular acceleration about Z axis | rad/s² |
| Acceleration Magnitude | Combined angular acceleration magnitude | rad/s² |
| Acceleration Peaks | Maximum acceleration values | in/s² |
| Acceleration Average | Mean acceleration across selection | in/s² |

### Interstory Drift Values
| Value | Description | Unit |
|-------|-------------|------|
| Interstory Drift Peaks | Maximum interstory drift ratios | % |
| Interstory Drift Average | Mean interstory drift across floors | % |

### Story Drift (Damage Threshold)
- Warning threshold for story drift ratio
- Per-corner tracking (NW, NE, SW, SE)
- Time to warning (when each corner crosses threshold)

## Context Synchronization

All values across the project must be synchronized through React context:

### Time Context
- Current frame index
- Playback state (playing, paused, speed)
- Time range selection for analysis
- Total simulation time

### Selection Context
- Floor/Story selection (visible floors)
- Node selection (individual nodes or groups)
- Cross-section selection (slice planes)

### View Context
- View mode (All Nodes, Floor Slabs, Corners Only, Vertical Connections, Damage Threshold)
- Color metric (what values to visualize on the 3D model)
- Camera position and orientation

### Threshold Context
- All threshold values for each key metric
- Color mappings for threshold visualization

### Data Context
- Animation data (positions, velocities, accelerations)
- Precomputed statistics (peaks, averages, distributions)
- Node metadata (stories, corners, connections)

## Current Features

### 3D Visualization
- Interactive 3D building model with orbit controls
- Multiple view modes:
  - All Nodes
  - Floor Slabs
  - Corners Only
  - Vertical Connections
  - Damage Threshold (color-coded drift visualization)
- Perspective and orthographic camera modes
- Exploded view for interior visibility
- Displacement visualization with scale controls
- Slice/clip planes for cross-section analysis

### Timeline & Playback
- Frame-by-frame navigation
- Play/pause controls
- Playback speed adjustment
- Time-based scrubbing
- Small timeline for quick navigation

### Data Panels
- Interstory Drift Chart
- Floor Displacement Chart
- Velocity Time Series
- Story Drift Heatmap
- Histogram distributions
- Peak Values display
- Data Table with detailed values
- Statistics Panel
- Correlation Matrix
- Damage Threshold Panel (floors, corners, warning times)

### Controls
- View preset buttons (North, East, South, West, Top, Bottom)
- Camera type toggle (Perspective/Orthographic)
- Smoothing toggle
- Floor visibility controls
- Node selection (click and box selection)

## Future Endeavors

### 1. Hinge/Beam Element Data
**Priority: High**

Parse and handle hinge and beam element data from the data folder. This requires:
- Python parsing scripts for binary format
- JavaScript parsing for web consumption
- Binary data construction for efficient storage
- Visualization of element forces, plastic hinges, yielding
- Connection behavior visualization

### 2. Multi-Simulation Comparison
**Priority: High**

Side-by-side comparison views enabling:
- Opening two simulation datasets simultaneously
- Synchronized timeline playback
- Difference visualization between simulations
- Parameter comparison (different earthquake inputs, different building configurations)
- Split-screen or overlay modes

### 3. Export Functionality
**Priority: Medium**

Export capabilities for sharing and publication:
- High-resolution image exports of all canvases
- Animated GIF exports of playback sequences
- Video recording (MP4/WebM) of animations
- Plot and chart exports (PNG, SVG, PDF)
- Data table exports (CSV, Excel)

## Scientific Visualization Standards

All visualizations must be designed for scientific accuracy and publication quality:

### Requirements
- **Detailed Keys**: All color maps must have legends with units
- **Axis Labels**: All charts must have labeled axes with units
- **Descriptions**: Each visualization should have a title and description
- **Color Bars**: Continuous value visualizations need color scale bars
- **Units**: All values must display appropriate units (in, in/s, in/s², rad, etc.)
- **Descriptions**: Tooltips and labels explaining what values represent

### Color Mapping Standards
- Use perceptually uniform color scales where possible
- Provide color bar legends for all continuous mappings
- Ensure accessibility (colorblind-friendly palettes)
- Maintain consistent color meanings across all views

### Plot Standards
- Proper axis scaling and ticks
- Grid lines where appropriate
- Clear legends for multi-series plots
- Descriptive titles
- Source/location metadata when applicable

## Architecture Notes

### Context Providers
- `ThresholdProvider`: Manages all threshold values
- `FloorVisibilityProvider`: Manages visible floors
- `ViewModeProvider`: Manages 3D view mode
- `ColorProvider`: Manages color metric selection
- `SliceSelectionProvider`: Manages cross-section planes
- `NodeSelectionProvider`: Manages node selection state
- `PlaybackContext`: Manages animation playback

### Data Flow
1. Animation data loaded from parsed simulation files
2. Precomputed statistics calculated during load
3. Context providers distribute data to all components
4. 3D view, charts, and panels all react to context changes
5. User interactions update context, triggering re-renders

### Panel System
The project uses a dockview-based panel system allowing:
- Flexible panel layouts
- Drag and drop positioning
- Multiple panels of the same type
- Panel minimize/maximize/close controls

## Routes

| Route | Description |
|-------|-------------|
| `/` | Main 3D View (View3d) |
| `/hamburger` | Hamburger view |
| `/texture` | Texture view |
| `/damage-threshold` | Damage threshold analysis view |

## Data Sources

Simulation data is expected in the data folder with:
- Node positions and connectivity
- Time series of displacements, velocities, accelerations
- Story and corner metadata
- Peak values and statistics
- (Future) Element data (hinges, beams, connections)

## Development Guidelines

1. **Context First**: All shared state should use React context
2. **Scientific Accuracy**: Always include units, labels, and legends
3. **Synchronization**: All views must sync to the same timeline/selection
4. **Performance**: Use memoization and efficient data structures
5. **Extensibility**: Design panels and views to be composable

---

*Last Updated: February 2026*
