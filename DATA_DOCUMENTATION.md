# Data Documentation - Quake Visualization Project

## Overview

This document describes the structure, format, and types of values in the `public/data` folder, which contains seismic simulation data for building response analysis.

## Directory Structure

```
public/data/
├── index.json                 # Master index file
├── index.schema.json          # JSON schema for index
├── index.ts                   # TypeScript import file
├── 15story/                   # Main 15-story building data (CSV format)
│   ├── building_height.csv
│   ├── building_center.csv
│   ├── node_mapping.csv
│   ├── node_data.csv
│   ├── beam_data.csv
│   ├── station3138Corners/    # Station 3138 corner data
│   └── station3138Entire/     # Station 3138 entire structure data
│   └── station3139Entire/     # Station 3139 entire structure data
├── Binary15Story/             # Binary format data
│   ├── building.bld
│   └── station3139Entire/
└── old15/                     # Legacy data
```

## Units Reference

### Overview

All measurements in the binary format use **inches** for consistency. Source CSV files are mixed-unit by file type and, for some building exports, by dataset as well.

### Unit Conversions

| Data Type            | CSV Source Units | Binary Format Units | Conversion Factor               | Notes                             |
| :------------------- | :--------------- | :------------------ | :------------------------------ | :-------------------------------- |
| **Node Coordinates** | Inches or Feet   | Inches              | Auto-detected (`× 1` or `× 12`) | `node_data.csv` H1, H2, V columns |
| **Story Heights**    | Feet             | Inches              | × 12                            | `building_height.csv`             |
| **Story Elevations** | Feet             | Inches              | × 12                            | Cumulative height calculations    |
| **Displacements**    | Inches           | Inches              | × 1                             | Already in inches in source files |
| **Velocity**         | Inches/second    | Inches/second       | × 1                             | Already in correct units          |
| **Acceleration**     | Inches/second²   | Inches/second²      | × 1                             | Already in correct units          |
| **Ground Motion**    | G (acceleration) | G (acceleration)    | × 1                             | Acceleration values               |
| **Time**             | Seconds          | Seconds             | × 1                             | No conversion needed              |

### Coordinate System

- **H1 (X-axis)**: First horizontal direction
- **H2 (Y-axis)**: Second horizontal direction
- **V (Z-axis)**: Vertical direction (Up)
- **Origin**: Building coordinates use large values (e.g., 5000+ inches) in a global coordinate system
- **WebGL/Three.js**: Apply root rotation of `-π/2` on X-axis for proper orientation (Y-up convention)

### Important Notes

- `node_data.csv` may store building node coordinates in **inches** or **feet** depending on the building export
- `building_height.csv` stores story heights in **feet**
- Simulation response files (Displacements, Velocities, Accelerations) store values in **inch-based units**
- The binary conversion script (`scripts/generate_binary_data.py`) converts story heights/elevations to inches for binary metadata and auto-detects whether node coordinates need a feet-to-inches conversion
- Always verify units when working directly with CSV source files vs. binary output

## Data Types

### 1. CSV Format Data (15story folder)

#### Building Metadata Files

**building_height.csv**

- **Purpose**: Defines floor heights for the 15-story building
- **Format**: CSV with header row
- **Columns**:
  - `Story level`: Floor name (Ground, 2, 3, ..., 15, Roof, Penthouse, Mezzanine, Helipad)
  - `Story Height (ft)`: Height of each floor in feet (decimal values)
- **Sample Values**:
  - Ground: 0 ft
  - Floors 3-15: 13 ft each
  - Floor 2: 28 ft (taller floor)
  - Roof: 13 ft
  - Penthouse: 18.3333333333 ft
  - Mezzanine: 9.1666666667 ft
  - Helipad: 10.5 ft

**building_center.csv**

- **Purpose**: Defines center node coordinates for each floor
- **Format**: CSV with header row
- **Columns**:
  - `Node ID`: Unique node identifier (integer)
  - `Story level`: Floor name
  - `x-coord.`: X coordinate in decimal
  - `y-coord.`: Y coordinate in decimal
  - `z-coord.`: Z coordinate (elevation) in decimal

**node_mapping.csv**

- **Purpose**: Maps nodes to corners and floors
- **Format**: CSV with header row
- **Columns**:
  - `Node`: Node ID (integer, many empty rows in file)
  - `Story Level`: Floor name
  - `Corner`: Corner designation (NW, SW, NE, SE)
- **Usage**: Used for corner-based displacement analysis

**node_data.csv**

- **Purpose**: Complete node coordinate and restraint information
- **Format**: CSV with header row
- **Columns**:
  - `Node Name`: Node identifier
  - `Node ID`: Numeric node ID
  - `H1`, `H2`, `V`: 3D coordinates in inches (horizontal 1, horizontal 2, vertical)
  - `Restraint UH1`, `Restraint UH2`, `Restraint UV`: Translational restraints (Free/Fixed)
  - `Restraint RH1`, `Restraint RH2`, `Restraint RV`: Rotational restraints (Free/Fixed)

**beam_data.csv**

- **Purpose**: Structural element connectivity and properties
- **Format**: CSV with header row
- **Columns**:
  - `Group Name`: Element group classification
  - `Group ID`: Group identifier
  - `Element Name`: Element identifier
  - `Element ID`: Numeric element ID
  - `Property Type`: Type of structural property
  - `Property Name`: Specific property designation
  - `I-Node Name`, `I-Node ID`: Start node connection
  - `J-Node Name`, `J-Node ID`: End node connection

#### Simulation Data

**Station 3138 Corners** (`station3138Corners/`)

_File Structure_:

- `ground_motion.txt`: Ground motion acceleration data
- `Displacements/`: 6 displacement files for different directions and grid points

**ground_motion.txt**

- **Purpose**: Ground acceleration time history
- **Format**: Space-separated values
- **Columns**:
  - Column 1: Time in seconds (0.000 to 59.990, 0.010s intervals)
  - Columns 2-4: Ground acceleration values (likely X, Y, Z components)
- **Value Range**: Small decimal values (e.g., -0.000415 to 0.000005)

**Displacement Files** (e.g., `D_H1_Grid_11.txt`, `D_H2_Grid_36.txt`, `D_V_Grid_11.txt`)

_Naming Convention_:

- `D_`: Displacement data
- `H1`, `H2`, `V`: Horizontal 1, Horizontal 2, Vertical directions
- `Grid_11`, `Grid_36`: Grid point sets (11: NW/SW corners, 36: NE/SE corners)

_File Structure_:

1. **Header Section** (lines 1-~60): Metadata including:
   - Analysis description
   - Structure information
   - Load case details
   - Node coordinates for each column
   - Column mappings to specific nodes and floor levels

2. **Data Section** (lines ~60+): Time history data
   - **Format**: Time-prefixed lines with comma-separated values
   - **Column 1**: Time in seconds (e.g., `.22`, `.23`, `.24`)
   - **Columns 2-N**: Displacement values for each node in inches
   - **Value Range**: Typically -0.003 to 0.003 inches, with scientific notation for very small values (e.g., `9.2955e-4`)

**Station 3138 Entire & Station 3139 Entire**

_Additional Data Types_:

- `Displacements/`: 6 files (H1R, H1T, H2R, H2T, VR, VT)
- `Velocities/`: 6 files (same naming pattern with V\_ prefix)
- `Accelerations/`: 6 files (same naming pattern with A\_ prefix)
- `Hinge results/`: Element-level hinge response summaries (`hinge_data.csv` or `.xlsx`)

_Naming Convention_:

- `H1`, `H2`: Horizontal directions
- `V`: Vertical direction
- `R`, `T`: Likely "Right" and "Left" or different structural orientations
- `Entire`: Full structure analysis (not just corners)

#### Hinge Results Data (Non-Time-Series)

`Hinge results/` contains element-level summaries used for thresholding and distribution analysis.

- Typical files:
  - `hinge_data.csv` (preferred and directly parsed)
  - `.xlsx` exports (parsed when `openpyxl` is installed)
- This data is **not frame/time indexed**.
- Primary metrics:
  - `M3` (moment demand)
  - `R3` (rotation demand)
  - `Max Pos Deform DCRatio`
  - `Max Neg Deform DCRatio`
- Key dimensions:
  - `Element ID`
  - `Component No.`
  - `Step Type` (usually `Max` / `Min`)
  - `Performance Level`

#### Shear Results Data (Non-Time-Series)

`Shears/` contains static per-floor column shear force summaries.

- Typical files:
  - `V_ST3138_H1M.txt` / `V_ST3139_H1M.txt`
  - `V_ST3138_H2M.txt` / `V_ST3139_H2M.txt`
- This data is **not frame/time indexed**.
- Units are `kip`.
- Parser behavior:
  - Reads the `Column` header mappings plus the final `Maximum` and `Minimum` rows.
  - Keeps only exact column-only sections named `Story <floor> Bottom - C`.
  - Excludes wall, brace, and combined sections such as `- W`, `- B`, `- C+W`, and `- C+B`.
  - Normalizes source story labels to building metadata labels, including `Int Mezz` → `Mezzanine`.
  - Emits missing floor values as `NaN`; simulations without a complete H1/H2 file pair do not produce `shear_data.bld`.

### 2. Binary Format Data (Binary15Story folder)

**File Extension**: `.bld` (binary format)
**Encoding**: Little Endian
**Compression**: GZIP (all files must be decompressed before reading)

**Structure**:

- `building.bld`: Binary building geometry data (22,677 bytes)
- `station3139Entire/`: Binary simulation data
  - `ground_motion.bld`
  - `acceleration.bld`
  - `velocity.bld`
  - `displacement.bld`

#### Global Container Format

All `.bld` files follow a "Header-Body" architecture:

| Byte Offset | Type     | Description                                                                                 |
| :---------- | :------- | :------------------------------------------------------------------------------------------ |
| `0x00`      | `uint32` | **Header Length (`L`)**. Size of JSON header in bytes                                       |
| `0x04`      | `utf-8`  | **JSON Header**. JSON string of length `L` with metadata and offsets                        |
| `0x04 + L`  | `binary` | **Binary Body**. Tightly packed numerical data. Offsets relative to start of body, not file |

#### File Types

**A. Building Data (`building.bld`)**

- **Purpose**: Static geometry, topology, and semantic grouping
- **JSON Schema**:
  ```json
  {
    "count_nodes": <integer>,
    "stories": {"15": [node_indices], "Roof": [...], ...},
    "corners": {"NW": [...], "NE": [...], "SW": [...], "SE": [...]},
    "story_heights": {"15": <float>, "Roof": <float>, ...},
    "story_order": ["Ground", ...],
    "node_to_below": [<integer>, <integer>, ...],  // nodeIdx -> belowNodeIdx (-1 for ground/no match)
    "cross_sections_x": {"0.0": [node_indices], "300.0": [...], ...}, // Nodes grouped by matching X-axis plane (6-inch tolerance)
    "cross_sections_y": {"0.0": [node_indices], "600.0": [...], ...}  // Nodes grouped by matching Y-axis plane (6-inch tolerance)
  }
  ```
- **Binary Body**: `float32` array `[x0, y0, z0, x1, y1, z1, ...]`
- **Size**: `count_nodes * 3 * 4` bytes
- **Units**: Inches

**B. Simulation Time Series Data** (`displacement.bld`, `velocity.bld`, `acceleration.bld`)

- **Purpose**: Animation data per timestep
- **JSON Schema**:
  ```json
  {
    "type": "displacement" | "velocity" | "acceleration",
    "count_frames": <integer>,
    "count_nodes": <integer>,
    "dt": <float>  // Time step in seconds (e.g., 0.01)
  }
  ```
- **Binary Body**: Frame-major ordering
  ```
  [Frame 0: Node 0(x,y,z), Node 1(x,y,z), ...]
  [Frame 1: Node 0(x,y,z), Node 1(x,y,z), ...]
  ```
- **Size**: `count_frames * count_nodes * 3 * 4` bytes
- **Units**:
  - Displacement: Inches (relative to rest position)
  - Velocity: Inches/second
  - Acceleration: Inches/second²

**C. Ground Motion Data (`ground_motion.bld`)**

- **Purpose**: Ground motion time series
- **JSON Schema**:
  ```json
  {
    "count_frames": <integer>,
    "dt": <float>  // Time step in seconds
  }
  ```
- **Binary Body**: `float32` array `[x, y, z]` per frame
- **Size**: `count_frames * 3 * 4` bytes
- **Units**: Inches

**D. Beam Connectivity Data (`beam_data.bld`)**

- **Purpose**: Building-level member connectivity using dense node indices (for cross-sections / overlays)
- **JSON Schema (summary)**:
  ```json
  {
    "count_rows": <integer>,
    "stride": 2,
  }
  ```
- **Binary Body**: `float32` array of `[iNodeIndex, jNodeIndex]` per beam index
- **Size**: `count_rows * stride` bytes

**E. Hinge Data (`hinge_data.bld`)**

- **Purpose**: Non-time-series hinge demand summaries paired by beam/member (PL1 only)
- **Source Reduction**:
  - Keeps only `Performance Level == 1`
  - Resolves component numbers (`2/3 -> I`, `4/5 -> J`) during generation
  - Stores one row per beam (`beamIndex`) with both `Max` and `Min` values in the same row
- **JSON Schema (summary)**:
  ```json
  {
    "count_rows": <integer>,
    "stride": 10,
    "fields": [
      "beamIndex",
      "endMask",
      "iM3Max",
      "iM3Min",
      "iR3Max",
      "iR3Min",
      "jM3Max",
      "jM3Min",
      "jR3Max",
      "jR3Min",
    ],
  }
  ```
- **Binary Body**: `float32` array of `[beamIndex, endMask, iM3Max, iM3Min, iR3Max, iR3Min, jM3Max, jM3Min, jR3Max, jR3Min]` per row
- **Size**: `count_rows * stride` bytes
- **Units**:
  - `endMask`: Bitmask (`1 = I present`, `2 = J present`, `3 = both`)
  - `M3`: model output moment units from source export
  - `R3`: radians (rotation demand)

#### Technical Specifications

- **Byte Alignment**: Little Endian
- **Float Format**: IEEE 754 single-precision (32-bit)
- **Integer Format**: Unsigned 32-bit integers
- **Coordinate System**:
  - Z-axis: Up
  - X-axis: H1 (Horizontal 1)
  - Y-axis: H2 (Horizontal 2)
- **WebGL Note**: Apply root rotation of `-π/2` on X-axis for Three.js (Y-up default)

#### Data Access Formula

To access data in simulation files:

```javascript
// Get Y-component of NodeIndex at FrameIndex
index = FrameIndex * count_nodes * 3 + NodeIndex * 3 + 1;
value = buffer[index];
```

#### Node Indexing

- Binary files use dense indexing `0...N` instead of original Node IDs
- Original Node ID to Index mapping is not stored in binary files
- Index mapping must be maintained separately if needed

#### Binary Format Specification

**File Structure**:

```
┌─────────────────┐
│  Header Length  │  uint32 (4 bytes) - Little Endian
│    (4 bytes)    │
├─────────────────┤
│  JSON Header    │  UTF-8 encoded JSON string
│    (N bytes)    │  Length specified by Header Length
├─────────────────┤
│  Padding        │  Space characters (' ') to align to 4-byte boundary
│  (0-3 bytes)    │
├─────────────────┤
│  Binary Body    │  float32 array - Little Endian IEEE 754
│   (variable)    │
└─────────────────┘
```

**Alignment Rules**:

- Header Length field: 4-byte aligned
- JSON Header: No alignment requirement
- Padding: Added to ensure Binary Body starts at 4-byte boundary
- Binary Body: 4-byte aligned (each float32 is 4 bytes)

**Sample Header**:

```json
{
  "count_nodes": 1737,
  "stories": {"15": [0, 1, 2, ...], "Roof": [...]},
  "corners": {"NW": [0, 4, 8, ...], "NE": [...], "SW": [...], "SE": [...]},
  "story_heights": {"15": 156.0, "Roof": 156.0},
  "story_order": ["Ground", "2", "3", ..., "Roof"],
  "cross_sections_x": {"0.0": [0, 5, 12, ...], "300.5": [1, 6, 13, ...]},
  "cross_sections_y": {"0.0": [0, 1, 2, ...], "120.0": [5, 6, 7, ...]}
}
```

### 3. Legacy Data (old15 folder)

Contains older format data with similar structure to main 15story data but with different file naming conventions (prefixed with `*` in index.json).

## Index System

**index.json**: Master catalog with:

- Building metadata
- File sizes
- Simulation configurations
- Data type indicators (CSV vs Binary)
- File path mappings

**index.schema.json**: JSON schema defining the structure of index.json

## Key Characteristics

### Coordinate System

- **Axes**: H1 (X), H2 (Y), V (Z-vertical)
- **Origin**: Global coordinate system with large base values (~5000 inches)
- **Orientation**: Z-up in source data, requires rotation for WebGL/Three.js (Y-up)

### Time Series Data

- **Duration**: 60 seconds (0.000 to 59.990 seconds)
- **Interval**: 0.010 seconds (100 Hz sampling rate)
- **Format**: Decimal seconds with 3 decimal places

### Node Organization

- **Total Nodes**: Thousands of nodes across the structure
- **Floor Coverage**: Each floor has 4 corner nodes (NW, NE, SW, SE)
- **Elevation Range**: Ground (0 ft story height reference) to Helipad (~7806 in node coordinate)

### Data Precision

- **Displacements**: High precision (up to 7 decimal places)
- **Coordinates**: Decimal precision for building geometry
- **Scientific Notation**: Used for very small values in displacement files

## Data Generation

### Binary Conversion Script

**Location**: `scripts/generate_binary_data.py`

**Purpose**: Converts CSV simulation data to optimized binary format for visualization

**Features**:

- Automatic discovery of buildings and simulations
- Supports both "Entire" and "Grid" file patterns
- Parallel processing for faster conversion
- Handles unit conversions (story heights/elevations in feet → inches for binary metadata)
- Creates compressed `.bld` files with JSON headers

**Input Requirements**:

- Building folder with `node_data.csv` and `building_height.csv`
- Simulation folders with response data files
- Ground motion files (`ground_motion.txt`)
- Optional hinge summary files in `Hinge results/` (`hinge_data.csv` preferred, `.xlsx` supported with `openpyxl`)
- Optional shear summary file pairs in `Shears/` (`*_H1M.txt` and `*_H2M.txt`)

**Output**:

- `building.bld`: Static geometry with node positions
- `displacement_lin.bld` / `displacement_rot.bld`: Time-series displacement data
- `velocity_lin.bld` / `velocity_rot.bld`: Time-series velocity data
- `acceleration_lin.bld` / `acceleration_rot.bld`: Time-series acceleration data
- `ground_motion.bld`: Ground motion acceleration data
- `hinge_data.bld`: Non-time-series hinge summary data with metadata distributions
- `shear_data.bld`: Non-time-series story-aligned shear summary data (`h1Max`, `h1Min`, `h2Max`, `h2Min`, `kip`)

**Running the Script**:

```bash
cd scripts
python generate_binary_data.py
```

If parsing `.xlsx` hinge files, install Python dependencies including `openpyxl`:

```bash
pip install -r requirements.txt
```

### File Naming Conventions

**Source Files (CSV)**:

- `D_H1T_Entire.txt`: Displacement (D), H1 direction, Translation (T), Entire structure
- `D_H1R_Entire.txt`: Displacement (D), H1 direction, Rotation (R), Entire structure
- `V_H2T_Grid_11.txt`: Velocity (V), H2 direction, Translation (T), Grid subset 11
- `A_VT_Entire.txt`: Acceleration (A), Vertical direction (V), Translation (T), Entire structure

**Suffixes**:

- `T`: Translation/Linear component
- `R`: Rotational component
- `Entire`: Complete structure data
- `Grid_XX`: Partial grid subset data

**Binary Output Files**:

- `{type}_lin.bld`: Linear/translation components
- `{type}_rot.bld`: Rotational components (when available)

## File Size Information

- **15story total**: ~15.8 GB
- **Station 3138 Corners**: ~21.6 MB
- **Station 3138 Entire**: ~8.4 GB
- **Station 3139 Entire**: ~7.4 GB
- **Binary15Story total**: ~2.8 GB

## Usage Notes

1. **Large Files**: Station 3138/3139 Entire files are extremely large (multi-GB) and should be processed carefully
2. **Memory Considerations**: Full time series loading requires significant RAM (8+ GB recommended for entire structure files)
3. **Binary Files**: Require specialized parsers for `.bld` format (see binary format specification below)
4. **Node Mapping**: Use `node_mapping.csv` to understand corner node assignments
5. **Coordinate System**: Building uses large coordinate values in a global coordinate system
6. **Unit Consistency**: Always verify units per CSV file (`node_data.csv` in inches, `building_height.csv` in feet) versus binary output (inches)
7. **Time Step**: All time series use consistent 0.01s (10ms) time step (100 Hz sampling)
