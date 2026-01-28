# BLD Format Specification v1.0

**Project:** LADWP Building Simulation Visualization
**Encoding:** Binary (Little Endian)
**Compression:** GZIP (All files must be decompressed before reading)

## 1. Global Container Format

All files in this suite follow a standard "Header-Body" architecture.

| Byte Offset | Type     | Description                                                                                                                                           |
| :---------- | :------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0x00`      | `uint32` | **Header Length (`L`)**. The size of the JSON header in bytes.                                                                                        |
| `0x04`      | `utf-8`  | **JSON Header**. A JSON string of length `L`. Contains metadata and offsets.                                                                          |
| `0x04 + L`  | `binary` | **Binary Body**. Tightly packed numerical data. Offsets within this body are defined relative to the _start of the body_ (not the start of the file). |

---

## 2. File Definitions

### File A: Building Data

**Filename:** `building.bld`
**Purpose:** Defines the static geometry, topology, and semantic grouping of the building.

#### JSON Header Schema

```json
{
  "count_nodes": <integer>,
  "stories": {
    "15": [ <node_idx_0>, <node_idx_1>, ... ], // Array of indices mapped to "15th Floor"
    "Roof": [ ... ]
  },
  "corners": {
    "NW": [<node_idx_0>, ...],
    "NE": [...],
    "SW": [...],
    "SE": [...]
  }
}
```

#### Binary Body Layout

| Section   | Data Type | Structure                  | Size (Bytes)                | Description                               |
| :-------- | :-------- | :------------------------- | :-------------------------- | :---------------------------------------- |
| **Nodes** | `float32` | `[x0, y0, z0, x1, y1, z1]` | `count_nodes * 3 * 4` bytes | Static rest positions. Units: **Inches**. |

---

### File Simulation Time Series Data

**Filenames:** `displacement.bld`, `velocity.bld`, `acceleration.bld`
**Purpose:** Animation data per time-step.
**Units:**

- Displacements: **Inches** relative to rest position.

#### JSON Header Schema

```json
{
  "type": "displacement" | "velocity" | "acceleration",
  "count_frames": <integer>,
  "count_nodes": <integer>,
  "dt": <float>, // Time step size (seconds) ex. 0.01
}
```

#### Binary Body Layout

The body contains a single continuous buffer. Data is ordered **Frame-Major**.

**Structure:**

```
[ Frame 0 ]
  [ Node 0: x, y, z ]
  [ Node 1: x, y, z ]
[ Frame 1 ]
  ...
```

| Data Type | Stride per Frame (Bytes) | Total Size (Bytes)                   |
| :-------- | :----------------------- | :----------------------------------- |
| `float32` | `count_nodes * 3 * 4`    | `count_frames * count_nodes * 3 * 4` |

**Access Formula (Javascript):**
To find the `y` value for `NodeIndex` at `FrameIndex`:

```javascript
index = FrameIndex * count_nodes * 3 + NodeIndex * 3 + 1;
value = buffer[index];
```

---

### File D: Ground Motion

**Filename:** `ground_motion.bld`
**Purpose:** Time series data for the ground motion.

#### JSON Header Schema

```json
{
  "count_frames": <integer>,
  "dt": <float>, // Time step size (seconds) ex. 0.01
}
```

#### Binary Body Layout

| Data Type | Structure   | Size (Bytes)           | Description                            |
| :-------- | :---------- | :--------------------- | :------------------------------------- |
| `float32` | `[x, y, z]` | `count_frames * 3 * 4` | Ground motion data. Units: **inches**. |

---

## 3. Implementation Notes

### Byte Alignment

- All binary data is **Little Endian**.
- All Float32 values are IEEE 754 single-precision.
- All Uint32 values are unsigned 32-bit integers.

### Coordinate System

- **Up Axis:** Z
- **Horizontal Axes:** X (H1), Y (H2)
- _Note for WebGL:_ When rendering in Three.js (which defaults to Y-up), apply a root rotation of `-Math.PI / 2` on the X-axis.

### Node Indexing

- **Implicit ID Mapping:** The Binary arrays do _not_ store the original Node IDs (e.g., "2072"). They use a dense index `0...N`.
- The mapping between `Node ID` and `Index` is lost in the binary file to save space.
