import pandas as pd
import numpy as np
import struct
import os
import re


class BuildingParser:
    def __init__(self):
        self.nodes = {}  # Map ID -> {x, y, z, floor, corner}
        self.elements = []  # List of {id, n1, n2}
        self.node_id_list = []  # Sorted list of IDs for matrix indexing
        self.node_id_to_index = {}  # Map ID -> Index in matrix

        # Dynamic Data
        self.time_steps = []
        self.displacements = None  # Will be (NumFrames, NumNodes, 6)

    def parse_geometry(self, node_file, element_file):
        """Parses Node_Data.xlsx and Beam_Element_Data.xlsx"""
        print("Parsing Geometry...")

        # 1. Parse Nodes
        # Assuming CSV format based on your input description
        df_nodes = pd.read_csv(node_file)

        # Clean up column names usually found in SAP2000/ETABS exports
        df_nodes.columns = df_nodes.columns.str.strip()

        for _, row in df_nodes.iterrows():
            nid = int(row["Node ID"])
            self.nodes[nid] = {"x": float(row["H1"]), "y": float(row["H2"]), "z": float(row["V"])}

        # Create indexed mapping
        self.node_id_list = sorted(list(self.nodes.keys()))
        self.node_id_to_index = {nid: i for i, nid in enumerate(self.node_id_list)}

        # 2. Parse Elements
        df_elems = pd.read_csv(element_file)
        df_elems.columns = df_elems.columns.str.strip()

        for _, row in df_elems.iterrows():
            self.elements.append({"id": int(row["Element ID"]), "n1": int(row["I-Node ID"]), "n2": int(row["J-Node ID"])})

        print(f"Geometry Loaded: {len(self.nodes)} nodes, {len(self.elements)} elements.")

    def parse_time_series_file(self, file_path, dof_index):
        """
        Parses the messy header of the Result files.
        dof_index: 0=X, 1=Y, 2=Z, 3=Rx, 4=Ry, 5=Rz
        """
        print(f"Parsing time series: {os.path.basename(file_path)}")

        with open(file_path, "r") as f:
            lines = f.readlines()

        # 1. Parse Header to map Column Index -> Node ID
        col_to_node = {}
        data_start_line = 0

        # Regex to find "Column, X, = node, Y"
        # Handling variations in spacing
        regex = re.compile(r"Column,\s*(\d+),\s*=\s*node,\s*(\d+)")

        for i, line in enumerate(lines):
            # Check if line contains column mapping
            match = regex.search(line)
            if match:
                col_idx = int(match.group(1)) - 1  # 0-based index (File implies Col 1 is time)
                node_id = int(match.group(2))
                col_to_node[col_idx] = node_id

            # Detect start of data (starts with number)
            # Your file usually has "0, ...." or ".01, ..."
            if line.strip() and (line[0].isdigit() or line.strip().startswith(".") or line.strip().startswith("-")):
                # Check if it's not the "Column" line
                if "Column" not in line:
                    data_start_line = i
                    break

        # 2. Parse Data Block
        # We assume the file is comma or space separated
        # Using pandas read_csv with skiprows is fastest
        try:
            # Re-read file using pandas from the data line
            df = pd.read_csv(file_path, skiprows=data_start_line, header=None)

            # Initialize main displacement matrix if first pass
            if self.displacements is None:
                num_frames = len(df)
                num_nodes = len(self.node_id_list)
                self.time_steps = df[0].values.astype(np.float32)  # Col 0 is Time
                # Shape: [Frames, Nodes, 6 DOFs]
                self.displacements = np.zeros((num_frames, num_nodes, 6), dtype=np.float32)

            # Map file columns to global matrix columns
            # df column 0 is time, col 1 in file corresponds to node map
            for file_col_idx in col_to_node:
                node_id = col_to_node[file_col_idx]

                # Check if node exists in our geometry
                if node_id in self.node_id_to_index:
                    global_idx = self.node_id_to_index[node_id]

                    # Ensure we don't go out of bounds if file col indices are offset
                    # The file says "Column 1 = time", "Column 2 = node X".
                    # Pandas index 0 = time, Pandas index 1 = Col 2 in text?
                    # Usually "Column 2" in text means the 2nd column, so index 1 in pandas.
                    pd_col_idx = file_col_idx - 1

                    if pd_col_idx > 0 and pd_col_idx < len(df.columns):
                        val = df.iloc[:, pd_col_idx].values
                        self.displacements[:, global_idx, dof_index] = val

        except Exception as e:
            print(f"Error parsing data block: {e}")

    def load_all_results(self, folder_path):
        """Expects files named D_H1T_Entire.txt, etc."""
        # Mapping filename patterns to DOF indices
        # 0:Tx, 1:Ty, 2:Tz, 3:Rx, 4:Ry, 5:Rz
        file_map = {"D_H1T": 0, "D_H2T": 1, "D_VT": 2, "D_H1R": 3, "D_H2R": 4, "D_VR": 5}  # Assuming VR is Z-rotation

        for f in os.listdir(folder_path):
            for key, dof in file_map.items():
                if key in f and f.endswith(".txt"):
                    self.parse_time_series_file(os.path.join(folder_path, f), dof)

    def write_binary(self, output_path):
        """Writes the optimized .bvis file"""
        print(f"Writing binary to {output_path}...")

        num_nodes = len(self.node_id_list)
        num_elems = len(self.elements)
        num_frames = len(self.time_steps)

        with open(output_path, "wb") as f:
            # 1. Header
            # Magic 'BVIS', Version 1, Counts
            f.write(b"BVIS")
            f.write(struct.pack("<I", 1))
            f.write(struct.pack("<I", num_nodes))
            f.write(struct.pack("<I", num_elems))
            f.write(struct.pack("<I", num_frames))

            # 2. Nodes Block
            # Write ID, X, Y, Z
            for nid in self.node_id_list:
                n = self.nodes[nid]
                f.write(struct.pack("<Ifff", nid, n["x"], n["y"], n["z"]))

            # 3. Elements Block
            # Write ID, Node1, Node2
            for el in self.elements:
                f.write(struct.pack("<III", el["id"], el["n1"], el["n2"]))

            # 4. Timing
            # Flatten and write time array
            f.write(self.time_steps.tobytes())

            # 5. Motion Matrix
            # Flatten the entire 3D numpy array
            # Layout: Frame 1 (Node 1 DOFs, Node 2 DOFs...), Frame 2...
            f.write(self.displacements.tobytes())

        print("Write complete.")
        file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"Final File Size: {file_size_mb:.2f} MB")


# --- Usage Example ---
if __name__ == "__main__":
    # You would adjust paths to where your CSVs represent the files provided
    parser = BuildingParser()

    # 1. Load Geometry (Using the filenames provided in prompt)
    parser.parse_geometry("Node_Data.csv", "Beam_Element_Data.csv")

    # 2. Load Results (Assumes files are in current dir)
    # Since I don't have the files on disk, I'm simulating the call
    # parser.load_all_results('./')

    # Example parsing specific files from prompt logic
    # parser.parse_time_series_file('D_H1T_Entire.txt', 0)
    # parser.parse_time_series_file('D_H2T_Entire.txt', 1)
    # parser.parse_time_series_file('D_VT_Entire.txt', 2)

    # 3. Export
    # parser.write_binary('simulation.bvis')
