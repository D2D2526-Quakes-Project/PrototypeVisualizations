# df_disp_x = pd.read_csv("/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/station3138Entire/Displacements/D_H1T_Entire.txt", skiprows=4116, header=None)
# df_disp_y = pd.read_csv("/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/station3138Entire/Displacements/D_H2T_Entire.txt", skiprows=4116, header=None)
# df_disp_z = pd.read_csv("/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/station3138Entire/Displacements/D_VT_Entire.txt", skiprows=4116, header=None)
import pandas as pd
import numpy as np
import json
import struct
import gzip
import re
import os

# --- FILE CONFIGURATION ---
FILES = {
    "nodes": "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/node_data.csv",
    "node_map": "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/node_mapping.csv",
    "beams": "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/beam_data.csv",
    "components": "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/H_ST3138.csv",
    "disp": {
        "x": "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/station3138Entire/Displacements/D_H1T_Entire.txt",
        "y": "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/station3138Entire/Displacements/D_H2T_Entire.txt",
        "z": "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/station3138Entire/Displacements/D_VT_Entire.txt",
    },
    "rot": {
        "x": "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/station3138Entire/Displacements/D_H1R_Entire.txt",
        "y": "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/station3138Entire/Displacements/D_H2R_Entire.txt",
        "z": "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/public/data/15story/station3138Entire/Displacements/D_VR_Entire.txt",
    },
}

OUTPUTS = {"structure": "bin/structure_data.bin.gz", "disp": "bin/displacements.bin.gz", "rot": "bin/rotations.bin.gz", "components": "bin/components.bin.gz"}


def parse_ladwp_txt_header(filepath):
    """
    Parses the complex header of the LADWP text files to map CSV columns to Node IDs.
    Returns: (col_to_node_map, start_row_index)
    """
    col_map = {}
    data_start_line = 0

    with open(filepath, "r") as f:
        for i, line in enumerate(f):
            # Parse lines like: "Column, 2, = node, 1, at, 5292..."
            if "Column" in line and "= node" in line:
                # Regex to extract Column Index and Node ID
                # Looks for "Column, {digits}, = node, {digits}"
                match = re.search(r"Column,\s*(\d+),\s*=\s*node,\s*(\d+)", line)
                if match:
                    col_idx = int(match.group(1))
                    node_id = int(match.group(2))
                    # In the file, Column 1 is Time. Column 2 is the first data column.
                    # Pandas zero-indexed means Column 2 is index 1.
                    col_map[col_idx - 1] = node_id

            # Detect start of data (starts with a number or minus sign)
            if re.match(r"^\s*[\d.-]+,", line):
                data_start_line = i
                break

    return col_map, data_start_line


def write_gzipped_binary(filename, json_header, binary_blobs):
    """
    Writes a generic format: [Header Length (I)][JSON Header][Binary Data...]
    Compressed with GZIP.
    """
    header_str = json.dumps(json_header)
    header_bytes = header_str.encode("utf-8")

    print(f"Writing {filename}...")
    with gzip.open(filename, "wb") as f:
        # Write Header Length (4 bytes)
        f.write(struct.pack("I", len(header_bytes)))
        # Write Header
        f.write(header_bytes)
        # Write Blobs
        for blob in binary_blobs:
            f.write(blob)
    print(f"-> Done. Size: {os.path.getsize(filename) / 1024:.2f} KB")


def process_structure():
    print("--- Processing Structure (Nodes & Beams) ---")

    # 1. Load Nodes
    df_nodes = pd.read_csv(FILES["nodes"])
    # Map Node ID (e.g. 2072) to Dense Index (0, 1, 2...)
    unique_ids = df_nodes["Node ID"].unique()
    id_to_index = {uid: i for i, uid in enumerate(unique_ids)}

    # Create Float32 Buffer [x, y, z, x, y, z...]
    node_buffer = np.zeros(len(unique_ids) * 3, dtype=np.float32)
    for _, row in df_nodes.iterrows():
        idx = id_to_index.get(row["Node ID"])
        if idx is not None:
            node_buffer[idx * 3 + 0] = row["H1"]  # H1
            node_buffer[idx * 3 + 1] = row["H2"]  # H2
            node_buffer[idx * 3 + 2] = row["V"]  # V

    # 2. Load Node Metadata (Stories)
    df_map = pd.read_csv(FILES["node_map"])
    stories = {}
    for _, row in df_map.iterrows():
        n_id = row["Node"]
        story = str(row["Story Level"])
        if n_id in id_to_index:
            if story not in stories:
                stories[story] = []
            stories[story].append(id_to_index[n_id])

    # 3. Load Beams
    df_beams = pd.read_csv(FILES["beams"])
    beam_list = []
    for _, row in df_beams.iterrows():
        start = row["I-Node ID"]
        end = row["J-Node ID"]
        if start in id_to_index and end in id_to_index:
            beam_list.append(id_to_index[start])
            beam_list.append(id_to_index[end])

    beam_buffer = np.array(beam_list, dtype=np.uint32)

    # 4. Write Binary
    header = {"count_nodes": len(unique_ids), "count_beams": len(beam_list) // 2, "stories": stories, "offsets": {"nodes": 0, "beams": len(node_buffer) * 4}}  # Map of StoryName -> [NodeIndices]

    write_gzipped_binary(OUTPUTS["structure"], header, [node_buffer.tobytes(), beam_buffer.tobytes()])
    return id_to_index, len(unique_ids)


def process_time_series(file_map, id_to_index, num_nodes, output_name, result_type="displacement"):
    print(f"--- Processing {result_type.capitalize()} ---")

    # 1. Parse Headers to get mapping
    # We assume X file governs the structure, but we check all
    col_map_x, start_row = parse_ladwp_txt_header(file_map["x"])

    # 2. Read Data (Skip header rows, read as CSV)
    # Using 'header=None' because we handled it manually
    print(f"Reading {file_map['x']}...")
    df_x = pd.read_csv(file_map["x"], skiprows=start_row, header=None)
    print(f"Reading {file_map['y']}...")
    df_y = pd.read_csv(file_map["y"], skiprows=start_row, header=None)
    print(f"Reading {file_map['z']}...")
    df_z = pd.read_csv(file_map["z"], skiprows=start_row, header=None)

    # Filter out footer lines (Maximum/Minimum)
    if isinstance(df_x.iloc[-1, 0], str) and "Minimum" in df_x.iloc[-1, 0]:
        df_x = df_x.iloc[:-2]  # Drop Max and Min rows
        df_y = df_y.iloc[:-2]
        df_z = df_z.iloc[:-2]

    # Extract Time Vector (Column 0)
    time_vector = df_x.iloc[:, 0].astype(np.float32).values
    num_frames = len(time_vector)

    # 3. Flatten Data [Frame0_Node0_xyz, Frame0_Node1_xyz...]
    # Pre-allocate massive buffer
    # Size: Frames * Nodes * 3 (Dimensions)
    buffer_size = num_frames * num_nodes * 3
    data_buffer = np.zeros(buffer_size, dtype=np.float32)

    print("Flattening time series data (this may take a moment)...")

    # Optimization: Convert DataFrames to numpy arrays first
    # Note: Column indices in col_map_x align with df columns
    arr_x = df_x.values
    arr_y = df_y.values
    arr_z = df_z.values

    # Iterate over our known nodes (id_to_index) to populate buffer in strict order
    for node_id, node_idx in id_to_index.items():
        # Find which column in the CSV corresponds to this Node ID
        # We need to reverse lookup the col_map
        csv_col_idx = -1
        for col, nid in col_map_x.items():
            if nid == node_id:
                csv_col_idx = col
                break

        if csv_col_idx != -1:
            # Slicing: [All Frames, Specific Column]
            # Mapped to: [All Frames, Specific Node Index, 0/1/2]

            # X values
            # Target indices: Frame 0 -> (0 * N * 3) + (node_idx * 3) + 0
            # Target indices: Frame 1 -> (1 * N * 3) + (node_idx * 3) + 0

            # Vectorized assignment using stride slicing
            # data_buffer[start : end : step]

            # Offset for X coord of this node across all frames
            # Stride is (num_nodes * 3)

            start_x = (node_idx * 3) + 0
            start_y = (node_idx * 3) + 1
            start_z = (node_idx * 3) + 2

            stride = num_nodes * 3

            data_buffer[start_x::stride] = arr_x[:, csv_col_idx]
            data_buffer[start_y::stride] = arr_y[:, csv_col_idx]
            data_buffer[start_z::stride] = arr_z[:, csv_col_idx]

    # 4. Write Binary
    header = {"type": result_type, "count_frames": num_frames, "count_nodes": num_nodes, "times": time_vector.tolist()}  # Keep time in Header for easy parsing

    write_gzipped_binary(output_name, header, [data_buffer.tobytes()])


def process_components(id_to_index):
    print("--- Processing Component/GM Data ---")

    df = pd.read_csv(FILES["components"])

    # This file contains component summaries (Max/Min), not time series in the snippet.
    # We will map "Element ID" to the beam buffer index if possible,
    # but since elements might not map 1:1 to beams in order, we store raw data.

    # We will store: ElementID, MaxPosDeform, MaxNegDeform
    # Buffer format: [ElemID (float-cast), Max, Min, ElemID, Max, Min...]

    # Filter for "Max" and "Min" rows
    max_rows = df[df["Step Type"] == "Max"]
    min_rows = df[df["Step Type"] == "Min"]

    # Join on Element ID
    # This is a simple representation. You can expand based on need.
    merged = pd.merge(max_rows, min_rows, on="Element ID", suffixes=("_max", "_min"))

    count = len(merged)
    comp_buffer = np.zeros(count * 3, dtype=np.float32)

    for i, row in merged.iterrows():
        comp_buffer[i * 3 + 0] = float(row["Element ID"])
        comp_buffer[i * 3 + 1] = float(row["Max Pos Deform DCRatio_max"])
        comp_buffer[i * 3 + 2] = float(row["Max Neg Deform DCRatio_min"])  # Actually reading raw val

    header = {"type": "components_summary", "description": "Element ID, Max DCRatio, Min DCRatio", "count": count}

    write_gzipped_binary(OUTPUTS["components"], header, [comp_buffer.tobytes()])


# --- MAIN EXECUTION ---
if __name__ == "__main__":
    if not os.path.exists(FILES["nodes"]):
        print("Error: Files not found. Run this script in the folder containing the CSVs.")
    else:
        # 1. Structure (Nodes/Beams)
        node_map, num_nodes = process_structure()

        # 2. Displacements
        process_time_series(FILES["disp"], node_map, num_nodes, OUTPUTS["disp"], "displacement")

        # 3. Rotations
        process_time_series(FILES["rot"], node_map, num_nodes, OUTPUTS["rot"], "rotation")

        # 4. Components (Ground Motion / Forces)
        process_components(node_map)

        print("\nAll tasks complete.")
