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

## Data Types

### 1. CSV Format Data (15story folder)

#### Building Metadata Files

**building_height.csv**
- **Purpose**: Defines floor heights for the 15-story building
- **Format**: CSV with header row
- **Columns**:
  - `Story level`: Floor name (Ground, 2, 3, ..., 15, Roof, Penthouse, Internal Mezzanine, Helipad)
  - `Story Height (ft)`: Height of each floor in feet (decimal values)
- **Sample Values**:
  - Ground: 0 ft
  - Floors 3-15: 13 ft each
  - Floor 2: 28 ft (taller floor)
  - Roof: 13 ft
  - Penthouse: 18.3333333333 ft
  - Internal Mezzanine: 9.1666666667 ft
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
  - `H1`, `H2`, `V`: 3D coordinates (horizontal 1, horizontal 2, vertical)
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

*File Structure*:
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

*Naming Convention*:
- `D_`: Displacement data
- `H1`, `H2`, `V`: Horizontal 1, Horizontal 2, Vertical directions
- `Grid_11`, `Grid_36`: Grid point sets (11: NW/SW corners, 36: NE/SE corners)

*File Structure*:
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

*Additional Data Types*:
- `Displacements/`: 6 files (H1R, H1T, H2R, H2T, VR, VT)
- `Velocities/`: 6 files (same naming pattern with V_ prefix)
- `Accelerations/`: 6 files (same naming pattern with A_ prefix)

*Naming Convention*:
- `H1`, `H2`: Horizontal directions
- `V`: Vertical direction
- `R`, `T`: Likely "Right" and "Left" or different structural orientations
- `Entire`: Full structure analysis (not just corners)

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

| Byte Offset | Type     | Description                                                                                                                                           |
| :---------- | :------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0x00`      | `uint32` | **Header Length (`L`)**. Size of JSON header in bytes                                                                                                 |
| `0x04`      | `utf-8`  | **JSON Header**. JSON string of length `L` with metadata and offsets                                                                                   |
| `0x04 + L`  | `binary` | **Binary Body**. Tightly packed numerical data. Offsets relative to start of body, not file                                                          |

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
    "story_order": ["Ground", ...]
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
- **Units**: Feet for building geometry, inches for displacements
- **Axes**: H1, H2 (horizontal), V (vertical)
- **Origin**: Building coordinates use large values (5000+ range)

### Time Series Data
- **Duration**: 60 seconds (0.000 to 59.990 seconds)
- **Interval**: 0.010 seconds (100 Hz sampling rate)
- **Format**: Decimal seconds with 3 decimal places

### Node Organization
- **Total Nodes**: Thousands of nodes across the structure
- **Floor Coverage**: Each floor has 4 corner nodes (NW, NE, SW, SE)
- **Elevation Range**: Ground (0 ft) to Helipad (~7806 ft coordinate)

### Data Precision
- **Displacements**: High precision (up to 7 decimal places)
- **Coordinates**: Decimal precision for building geometry
- **Scientific Notation**: Used for very small values in displacement files

## File Size Information

- **15story total**: ~15.8 GB
- **Station 3138 Corners**: ~21.6 MB
- **Station 3138 Entire**: ~8.4 GB  
- **Station 3139 Entire**: ~7.4 GB
- **Binary15Story total**: ~2.8 GB

## Usage Notes

1. **Large Files**: Station 3138/3139 Entire files are extremely large (multi-GB) and should be processed carefully
2. **Memory Considerations**: Full time series loading requires significant RAM
3. **Binary Files**: Require specialized parsers for `.bld` format
4. **Node Mapping**: Use `node_mapping.csv` to understand corner node assignments
5. **Coordinate System**: Building uses large coordinate values, likely in a global coordinate system