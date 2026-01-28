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

### File A: Structure Data

**Filename:** `structure_data.bin`
**Purpose:** Defines the static geometry, topology, and semantic grouping of the building.

#### JSON Header Schema

```json
{
  "count_nodes": <integer>,
  "count_beams": <integer>,
  "stories": {
    "15": [ <node_idx_1>, <node_idx_2>, ... ], // Array of indices mapped to "15th Floor"
    "Roof": [ ... ]
  },
  "offsets": {
    "nodes": 0,          // Start of Node Buffer (relative to body start)
    "beams": <byte_pos>  // Start of Beam Buffer (relative to body start)
  }
}
```

#### Binary Body Layout

| Section   | Data Type | Structure               | Size (Bytes)       | Description                               |
| :-------- | :-------- | :---------------------- | :----------------- | :---------------------------------------- |
| **Nodes** | `float32` | `[x, y, z]` interleaved | `count_nodes * 12` | Static rest positions. Units: **Inches**. |
| **Beams** | `uint32`  | `[start_idx, end_idx]`  | `count_beams * 8`  | Topology pairs referencing Node Indices.  |

---

### File B & C: Time Series Data

**Filenames:** `displacements.bin`, `rotations.bin`
**Purpose:** Animation data per time-step.
**Units:**

- Displacements: **Inches** relative to rest position.
- Rotations: **Radians**.

#### JSON Header Schema

```json
{
  "type": "displacement" | "rotation",
  "count_frames": <integer>,
  "count_nodes": <integer>,
  "times": [0.0, 0.01, 0.02, ... ] // Array of float time stamps
}
```

#### Binary Body Layout

The body contains a single continuous buffer. Data is ordered **Frame-Major**.

**Structure:** `[Frame 0 Data] [Frame 1 Data] [Frame N Data]`

Inside a specific Frame, data is ordered by Node Index:
`[Node0_X, Node0_Y, Node0_Z, Node1_X, Node1_Y, Node1_Z, ...]`

| Data Type | Stride per Frame (Bytes) | Total Size (Bytes)                |
| :-------- | :----------------------- | :-------------------------------- |
| `float32` | `count_nodes * 3 * 4`    | `count_frames * count_nodes * 12` |

**Access Formula (Javascript):**
To find the `y` value for `NodeIndex` at `FrameIndex`:

```javascript
index = FrameIndex * count_nodes * 3 + NodeIndex * 3 + 1;
value = buffer[index];
```

---

### File D: Component Data

**Filename:** `components.bin`
**Purpose:** Static analysis results (e.g., max deformation ratios) for element color coding.

#### JSON Header Schema

```json
{
  "type": "components_summary",
  "count": <integer>,
  "description": "Element ID, Max DCRatio, Min DCRatio"
}
```

#### Binary Body Layout

A flat list of tuples. Note that `Element ID` is stored as a float to keep the buffer uniform, though it represents an integer ID.

| Data Type | Structure                  | Size (Bytes) | Description                                     |
| :-------- | :------------------------- | :----------- | :---------------------------------------------- |
| `float32` | `[ElemID, MaxVal, MinVal]` | `count * 12` | Element ID matches the ID in the original XLSX. |

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
- **Requirement:** If the UI needs to display the original ID (e.g., "Node 2072"), the JSON Header of `structure_data.bin` should be expanded to include an `id_map`: `["2072", "2073", ...]` where the array index corresponds to the binary index.
