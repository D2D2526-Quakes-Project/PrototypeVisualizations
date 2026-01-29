import pandas as pd
import numpy as np
import json
import struct
import gzip
import re
import os

# --- CONFIGURATION ---
# Update these paths to match your actual file locations
FILES = {
    "building": {
        "nodes": "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/node_data.csv",
        "height": "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/building_height.csv",
    },
    "simulation": {
        # Define the files for ONE simulation here
        "displacement": {
            "lin": [
                "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/station3138Entire/Displacements/D_H1T_Entire.txt",
                "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/station3138Entire/Displacements/D_H2T_Entire.txt",
                "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/station3138Entire/Displacements/D_VT_Entire.txt",
            ],
            "rot": [
                "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/station3138Entire/Displacements/D_H1R_Entire.txt",
                "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/station3138Entire/Displacements/D_H2R_Entire.txt",
                "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/station3138Entire/Displacements/D_VR_Entire.txt",
            ],
        },
        # Assuming similar naming for Vel/Accel. Update these filenames!
        "velocity": {
            "lin": [
                "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/station3138Entire/Velocities/V_H1T_Entire.txt",
                "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/station3138Entire/Velocities/V_H2T_Entire.txt",
                "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/station3138Entire/Velocities/V_VT_Entire.txt",
            ],
            "rot": [
                "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/station3138Entire/Velocities/V_H1R_Entire.txt",
                "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/station3138Entire/Velocities/V_H2R_Entire.txt",
                "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/station3138Entire/Velocities/V_VR_Entire.txt",
            ],
        },
        "acceleration": {
            "lin": [
                "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/station3138Entire/Accelerations/A_H1T_Entire.txt",
                "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/station3138Entire/Accelerations/A_H2T_Entire.txt",
                "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/station3138Entire/Accelerations/A_VT_Entire.txt",
            ],
            "rot": [
                "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/station3138Entire/Accelerations/A_H1R_Entire.txt",
                "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/station3138Entire/Accelerations/A_H2R_Entire.txt",
                "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/station3138Entire/Accelerations/A_VR_Entire.txt",
            ],
        },
        "ground_motion": "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/station3138Entire/ground_motion.txt",
    },
}

OUTPUT_DIR = "bin"

# --- HELPERS ---


def write_bld_file(filename, header, binary_data):
    """Writes JSON Header + Binary Body to GZIP."""
    header_str = json.dumps(header)
    header_bytes = header_str.encode("utf-8")

    # Calculate current position after writing 4-byte length + header bytes
    current_pos = 4 + len(header_bytes)

    padding_len = (4 - (current_pos % 4)) % 4
    padding_bytes = b" " * padding_len

    out_path = os.path.join(OUTPUT_DIR, filename)
    print(f"Writing {out_path} (Header: {len(header_bytes)}b, Pad: {padding_len}b)...")

    with gzip.open(out_path, "wb") as f:
        # 1. Header Length (4 bytes)
        f.write(struct.pack("<I", len(header_bytes)))
        # 2. JSON Header
        f.write(header_bytes)
        # 3. Padding (Alignment)
        f.write(padding_bytes)
        # 4. Binary Body
        f.write(binary_data)

    size_kb = os.path.getsize(out_path) / 1024
    print(f"-> Saved. Size: {size_kb:.2f} KB")


def parse_ladwp_header(filepath):
    """Extracts column-to-node mapping from LADWP text files."""
    col_map = {}  # CSV Column Index -> Node ID
    start_row = 0
    with open(filepath, "r") as f:
        for i, line in enumerate(f):
            if "Column" in line and "= node" in line:
                # Regex: Column, 2, = node, 1
                m = re.search(r"Column,\s*(\d+),\s*=\s*node,\s*(\d+)", line)
                if m:
                    # CSV Col 2 is Index 1 in 0-based array
                    col_map[int(m.group(1)) - 1] = int(m.group(2))
            if re.match(r"^\s*[\d.-]+,", line):
                start_row = i
                break
    return col_map, start_row


def load_ladwp_data(filepath, col_map, num_frames_expected=None):
    """Loads a single component file into a structured array."""
    _, start_row = parse_ladwp_header(filepath)
    # Read CSV, skipping footer (Min/Max rows)
    df = pd.read_csv(filepath, skiprows=start_row, header=None)

    # Simple footer check
    if isinstance(df.iloc[-1, 0], str):
        df = df.iloc[:-2]  # Remove Max/Min rows

    vals = df.values.astype(np.float32)

    if num_frames_expected and len(vals) != num_frames_expected:
        print(f"Warning: Frame count mismatch in {filepath}")

    return vals, col_map


# --- PROCESSORS ---


def process_building():
    print("--- Processing Building Data ---")

    # 1. Load Nodes
    df_nodes = pd.read_csv(FILES["building"]["nodes"])
    unique_ids = df_nodes["Node ID"].unique()
    id_to_index = {uid: i for i, uid in enumerate(unique_ids)}
    count_nodes = len(unique_ids)

    # 2. Prepare Binary Buffer (Only XYZ)
    buffer = np.zeros(count_nodes * 3, dtype=np.float32)
    for _, row in df_nodes.iterrows():
        idx = id_to_index.get(row["Node ID"])
        if idx is not None:
            buffer[idx * 3 + 0] = row["H1"]
            buffer[idx * 3 + 1] = row["H2"]
            buffer[idx * 3 + 2] = row["V"]

    # 3. Load Stories & Corners
    df_height = pd.read_csv(FILES["building"]["height"])

    storiesElevations = {}
    for i, row in df_height.iterrows():
        story = row["Story level"]

        elevation = row["Story Height (ft)"]
        for j, row2 in df_height[i:].iterrows():
            if i == j:
                continue
            elevation += row2["Story Height (ft)"]

        storiesElevations[story] = elevation * 12

    stories = {}
    storiesCorners = {}

    min_x = df_nodes["H1"].min()
    min_y = df_nodes["H2"].min()
    min_v = df_nodes["V"].min()

    for _, row in df_nodes.iterrows():
        nid = row["Node ID"]
        idx = id_to_index.get(nid)
        if idx is not None:
            x, y, z = row["H1"] - min_x, row["H2"] - min_y, row["V"] - min_v
            # Find story elevation closest to node
            stidx = list(storiesElevations.values()).index(z) if z in storiesElevations else None
            if stidx == None:
                continue
            story = list(storiesElevations.keys())[stidx]
            if story not in stories:
                stories[story] = []
            stories[story].append(idx)

            # Put node in corners
            corners = storiesCorners.get(story)
            if corners is None:
                corners = {
                    "NW": {
                        "index": idx,
                        "x": row["H1"],
                        "y": row["H2"],
                    },
                    "NE": {
                        "index": idx,
                        "x": row["H1"],
                        "y": row["H2"],
                    },
                    "SW": {
                        "index": idx,
                        "x": row["H1"],
                        "y": row["H2"],
                    },
                    "SE": {
                        "index": idx,
                        "x": row["H1"],
                        "y": row["H2"],
                    },
                }
            else:
                nw = corners["NW"]
                # Check if node is more northwest
                if x <= nw["x"] and y >= nw["y"]:
                    nw["index"] = idx
                    nw["x"] = x
                    nw["y"] = y

                ne = corners["NE"]
                # Check if node is more northeast
                if x >= ne["x"] and y >= ne["y"]:
                    ne["index"] = idx
                    ne["x"] = x
                    ne["y"] = y

                sw = corners["SW"]
                # Check if node is more southwest
                if x <= sw["x"] and y <= sw["y"]:
                    sw["index"] = idx
                    sw["x"] = x
                    sw["y"] = y

                se = corners["SE"]
                # Check if node is more southeast
                if x >= se["x"] and y <= se["y"]:
                    se["index"] = idx
                    se["x"] = x
                    se["y"] = y

    corners = {
        "NW": [],
        "NE": [],
        "SW": [],
        "SE": [],
    }

    for story, storyCorners in storiesCorners.items():
        for corner, cornerData in storyCorners.items():
            corners[corner].append(cornerData["index"])

    # 4. Write
    header = {"count_nodes": count_nodes, "stories": stories, "corners": corners}

    write_bld_file("building.bld", header, buffer.tobytes())
    return id_to_index


def process_response_file(file_key, type_name, id_to_index):
    """
    Generic processor for Displacement, Velocity, Acceleration.
    Expects 6 files (Lin X, Y, Z and Rot X, Y, Z).
    """
    file_list = FILES["simulation"].get(file_key)
    if not file_list:
        print(f"Skipping {type_name}: Files not defined in config.")
        return

    print(f"--- Processing {type_name} ---")

    # Files
    f_lx, f_ly, f_lz = file_list["lin"]
    f_rx, f_ry, f_rz = file_list["rot"]

    # 1. Parse Header Map (Assume X file governs)
    col_map_x, _ = parse_ladwp_header(f_lx)

    # 2. Load Data
    # Note: This loads all 6 files into memory. ensure you have RAM.
    print(f"Loading Linear Data...")
    d_lx, _ = load_ladwp_data(f_lx, col_map_x)
    d_ly, _ = load_ladwp_data(f_ly, col_map_x)
    d_lz, _ = load_ladwp_data(f_lz, col_map_x)

    print(f"Loading Rotational Data...")
    d_rx, _ = load_ladwp_data(f_rx, col_map_x)
    d_ry, _ = load_ladwp_data(f_ry, col_map_x)
    d_rz, _ = load_ladwp_data(f_rz, col_map_x)

    num_frames = len(d_lx)
    num_nodes = len(id_to_index)

    # 3. Interleave Data
    # Target: [Node0_X, Node0_Y, Node0_Z, Node0_RX, Node0_RY, Node0_RZ, Node1_...]
    print("Interleaving data...")
    buffer = np.zeros(num_frames * num_nodes * 6, dtype=np.float32)

    # Values arrays (Frames x Columns)
    # We need to map CSV Column -> Buffer Node Index

    # Pre-calculate column indices for every node index 0..N
    # This avoids searching the map inside the loop
    csv_cols = [-1] * num_nodes
    for col, nid in col_map_x.items():
        if nid in id_to_index:
            csv_cols[id_to_index[nid]] = col

    # Vectorized Fill
    # buffer[start::stride] selects specific component for specific node across all frames
    # But here we want Frame-Major.
    # Actually, flattening (Frames * Nodes * 6) is easiest done by
    # reshaping inputs to (Frames, Nodes) first.

    # Create temp arrays aligned to Node Index 0..N
    aligned_lx = np.zeros((num_frames, num_nodes), dtype=np.float32)
    aligned_ly = np.zeros((num_frames, num_nodes), dtype=np.float32)
    aligned_lz = np.zeros((num_frames, num_nodes), dtype=np.float32)
    aligned_rx = np.zeros((num_frames, num_nodes), dtype=np.float32)
    aligned_ry = np.zeros((num_frames, num_nodes), dtype=np.float32)
    aligned_rz = np.zeros((num_frames, num_nodes), dtype=np.float32)

    for n_idx, c_idx in enumerate(csv_cols):
        if c_idx != -1:
            aligned_lx[:, n_idx] = d_lx[:, c_idx]
            aligned_ly[:, n_idx] = d_ly[:, c_idx]
            aligned_lz[:, n_idx] = d_lz[:, c_idx]
            aligned_rx[:, n_idx] = d_rx[:, c_idx]
            aligned_ry[:, n_idx] = d_ry[:, c_idx]
            aligned_rz[:, n_idx] = d_rz[:, c_idx]

    # Stack: (Frames, Nodes, 6)
    # This creates the interleaved structure [x, y, z, rx, ry, rz] per node
    stacked = np.stack([aligned_lx, aligned_ly, aligned_lz, aligned_rx, aligned_ry, aligned_rz], axis=2)

    # Flatten: Frame 0 (Node 0..N), Frame 1...
    buffer = stacked.flatten()

    # dt = float(d_lx[1, 0] - d_lx[0, 0])

    # 4. Write
    header = {"type": type_name, "count_frames": num_frames, "count_nodes": num_nodes, "dt": 0.01}

    write_bld_file(f"{file_key}.bld", header, buffer.tobytes())


def process_ground_motion():
    print("--- Processing Ground Motion ---")
    motion_file = FILES["simulation"]["ground_motion"]

    # Check if files exist (placeholder logic)
    if not os.path.exists(motion_file):
        print("Ground Motion files not found, skipping.")
        return

    # Load 3 components (assuming headerless or simple CSV)
    # Adjust parsing logic if GM files have complex headers like LADWP
    # time, x, y, z
    motion = pd.read_csv(motion_file, header=None, delim_whitespace=True)

    num_frames = len(motion)

    # time = motion.iloc[:, 0].values.astype(np.float32)

    # dt = float(time[1] - time[0])

    # Interleave [x, y, z, x, y, z...]
    buffer = np.zeros(num_frames * 3, dtype=np.float32)
    buffer[0::3] = motion.iloc[:, 1]
    buffer[1::3] = motion.iloc[:, 2]
    buffer[2::3] = motion.iloc[:, 3]

    header = {"count_frames": num_frames, "dt": 0.01}

    write_bld_file("ground_motion.bld", header, buffer.tobytes())


# --- MAIN ---
if __name__ == "__main__":
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    # 1. Building Data
    id_map = process_building()

    # 2. Simulation Data
    process_response_file("displacement", "displacement", id_map)
    process_response_file("velocity", "velocity", id_map)
    process_response_file("acceleration", "acceleration", id_map)

    # 3. Ground Motion
    process_ground_motion()

    print("\nBatch processing complete.")
