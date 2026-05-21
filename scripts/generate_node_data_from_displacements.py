#!/usr/bin/env python3
"""
Generate node_data.csv and building_height.csv from displacement file headers.

Useful when these CSVs are missing for a building (e.g., the 73story building).
Parses D_*.txt file headers across all simulation directories to extract
node IDs and initial positions, then writes the CSV files in the format
expected by generate_binary_data.py.

Usage:
    python scripts/generate_node_data_from_displacements.py --building 73story
"""

import argparse
import os
import re
import sys
from collections import defaultdict

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
DEFAULT_CSV_DIR = os.path.join(PROJECT_ROOT, "data", "csv")


def parse_args():
    parser = argparse.ArgumentParser(
        description="Generate node_data.csv and building_height.csv from displacement file headers"
    )
    parser.add_argument("--building", required=True, help="Building folder name (e.g., 73story)")
    parser.add_argument("--csv-dir", default=DEFAULT_CSV_DIR, help="CSV data directory (default: data/csv)")
    parser.add_argument("--dryrun", action="store_true", help="Print actions without writing files")
    return parser.parse_args()


def discover_simulations(building_path):
    """Find simulation subdirectories that have a Displacements/ folder."""
    sims = []
    if not os.path.isdir(building_path):
        return sims
    for item in sorted(os.listdir(building_path)):
        item_path = os.path.join(building_path, item)
        disp_path = os.path.join(item_path, "Displacements")
        if os.path.isdir(item_path) and os.path.isdir(disp_path):
            sims.append({"name": item, "displacements_path": disp_path})
    return sims


def parse_displacement_header(filepath):
    """
    Parse a displacement file header to extract node data.

    Looks for lines like:
        Column, 2, = node, 1, at,  5292,  3337.5,  7806

    Returns dict: node_id -> (h1, h2, v)
    """
    results = {}
    node_pattern = re.compile(
        r"Column,\s*(\d+),\s*=\s*node,\s*(\d+),\s*at,\s*"
        r"(-?[\d.]+(?:e[+-]?\d+)?),\s*"
        r"(-?[\d.]+(?:e[+-]?\d+)?),\s*"
        r"(-?[\d.]+(?:e[+-]?\d+)?)"
    )
    data_started = False

    with open(filepath, "r") as f:
        for line in f:
            if data_started:
                break
            m = node_pattern.search(line)
            if m:
                node_id = int(m.group(2))
                h1 = float(m.group(3))
                h2 = float(m.group(4))
                v = float(m.group(5))
                results[node_id] = (h1, h2, v)
            elif re.match(r"^\s*[\d.eE+\-]+,", line):
                data_started = True

    return results


def count_decimal_places(val):
    s = str(val)
    if "." in s:
        return len(s.split(".")[1])
    return 0


def collect_nodes_from_displacements(simulations):
    """
    Collect all unique nodes from displacement files across all simulations.

    For nodes appearing in multiple files, keeps the entry with the
    most decimal places (highest coordinate precision).

    Returns dict: node_id -> (h1, h2, v)
    """
    all_nodes = {}
    total_files = 0

    for sim in simulations:
        disp_path = sim["displacements_path"]
        if not os.path.isdir(disp_path):
            continue

        files = sorted(os.listdir(disp_path))
        for fname in files:
            if not fname.endswith(".txt"):
                continue
            if fname.startswith("D_ST") or fname.startswith("D_ST "):
                print(f"  Skip drift file: {sim['name']}/{fname}")
                continue
            if not fname.startswith("D_"):
                continue

            total_files += 1
            filepath = os.path.join(disp_path, fname)
            print(f"  Parse: {sim['name']}/{fname}")
            nodes = parse_displacement_header(filepath)

            for node_id, (h1, h2, v) in nodes.items():
                prec = count_decimal_places(h1) + count_decimal_places(h2) + count_decimal_places(v)
                if node_id not in all_nodes or prec > all_nodes[node_id][3]:
                    all_nodes[node_id] = (h1, h2, v, prec)

    print(f"  Parsed {total_files} displacement file(s)")
    return {nid: (vals[0], vals[1], vals[2]) for nid, vals in all_nodes.items()}


def infer_story_heights(node_positions, z_tolerance=12, merge_count_ratio=0.3, merge_gap_ratio=0.55, min_nodes_pct=0.04):
    """
    Infer story levels and heights from node Z coordinates.

    Strategy:
      1. Cluster Z values within a small tolerance (same-story grouping).
      2. Compute weighted center and node count per cluster.
      3. Sort clusters by elevation.
      4. Compute the typical floor-to-floor height (median gap).
      5. Merge small, nearby clusters into adjacent larger clusters using
         relative comparisons (count < neighbor * merge_count_ratio AND
         gap < typical_gap * merge_gap_ratio).  This catches intermediate
         node elevations (beam-column connections, etc.).
      6. Apply a final count threshold based on a percentage of the maximum
         cluster node count to remove any remaining sparse clusters.

    Args:
        node_positions:  dict of node_id -> (h1, h2, v)
        z_tolerance:     inches for grouping Z values into same story cluster
        merge_count_ratio:  merge if count < neighbor_count * this
        merge_gap_ratio:    merge if gap < typical_gap * this
        min_nodes_pct:      final filter: keep clusters with count >=
                            max(5, max_count * this)

    Returns:
        (story_heights, ground_z)
        story_heights: list of (story_name, story_height_ft) top-to-bottom
        ground_z: Z coordinate (inches) of the ground floor (for node exclusion)
    """
    z_values = sorted({v for _, _, v in node_positions.values()})
    if len(z_values) < 2:
        return [], 0.0

    z_counts = defaultdict(int)
    for _, _, v in node_positions.values():
        z_counts[v] += 1

    # --- Step 1: Cluster consecutive Z values within tolerance ---
    clusters = []
    current = [z_values[0]]
    for z in z_values[1:]:
        if z - current[-1] <= z_tolerance:
            current.append(z)
        else:
            clusters.append(current)
            current = [z]
    clusters.append(current)

    # --- Step 2: Compute weighted centers and total node counts ---
    levels = []  # [center, count]
    for cl in clusters:
        total = sum(z_counts[z] for z in cl)
        center = sum(z * z_counts[z] for z in cl) / total
        levels.append([center, total])

    if len(levels) < 2:
        return [], 0.0

    levels.sort(key=lambda x: x[0])

    # --- Step 3: Compute typical floor-to-floor height (median gap) ---
    gaps = [levels[i + 1][0] - levels[i][0] for i in range(len(levels) - 1)]
    typical_gap = sorted(gaps)[len(gaps) // 2]
    max_gap_allowed = typical_gap * merge_gap_ratio

    # --- Step 4: Merge small, nearby clusters into neighbors ---
    # Forward pass: merge small clusters upward
    merged = []
    i = 0
    while i < len(levels):
        center, count = levels[i]
        if i + 1 < len(levels):
            next_center, next_count = levels[i + 1]
            gap = next_center - center
            if count < next_count * merge_count_ratio and gap < max_gap_allowed:
                total = count + next_count
                wc = (center * count + next_center * next_count) / total
                levels[i + 1] = [wc, total]
                i += 1
                continue
        merged.append([center, count])
        i += 1

    # Backward pass: merge small trailing clusters into previous (lower) cluster
    i = len(merged) - 1
    while i > 0:
        center, count = merged[i]
        prev_center, prev_count = merged[i - 1]
        gap = center - prev_center
        if count < prev_count * merge_count_ratio and gap < max_gap_allowed:
            total = count + prev_count
            wc = (prev_center * prev_count + center * count) / total
            merged[i - 1] = [wc, total]
            merged.pop(i)
        i -= 1

    # --- Step 5: Final filter by count threshold ---
    max_count = max(s[1] for s in merged)
    count_threshold = max(5, max_count * min_nodes_pct)
    merged = [[c, cnt] for c, cnt in merged if cnt >= count_threshold]

    if len(merged) < 2:
        return [], 0.0

    # --- Step 6: Determine ground reference Z for node exclusion ---
    # The ground cluster may contain outlier Z values (e.g., foundation nodes at
    # slightly lower elevation).  We find the lowest Z value within the cluster
    # that carries the majority of node mass, so after excluding sub-ground
    # foundation nodes, the remaining CSV min_v aligns with story elevation 0.
    # Re-fetch the raw Z values and frequencies for the ground cluster.
    ground_raw_zs = [z for z in z_values if abs(z - merged[0][0]) <= z_tolerance]
    ground_zs_with_counts = [(z, z_counts[z]) for z in ground_raw_zs]
    ground_zs_with_counts.sort(key=lambda x: -x[1])  # highest count first
    # Use the Z with the highest node count as the ground reference
    ground_cluster_z = ground_zs_with_counts[0][0]
    # Adjust merged Ground cluster center to match the actual min V in the CSV
    merged[0][0] = ground_cluster_z

    # --- Step 7: Compute story heights, top-to-bottom order ---
    result = []
    n = len(merged)
    for i in range(n - 1, -1, -1):
        elev = merged[i][0]
        if i == 0:
            name = "Ground"
            height_ft = 0.0
        else:
            height_inches = elev - merged[i - 1][0]
            height_ft = round(height_inches / 12, 4)
            name = str(i + 1)
        result.append((name, height_ft))

    return result, ground_cluster_z


def write_node_csv(filepath, nodes, ground_z, dryrun=False):
    """Write node_data.csv with all 11 columns, excluding nodes below ground_z (foundation)."""
    header = "Node Name,Node ID,H1,H2,V,Restraint UH1,Restraint UH2,Restraint UV,Restraint RH1,Restraint RH2,Restraint RV"

    # Filter out foundation nodes (below ground cluster center)
    filtered = {nid: (h1, h2, v) for nid, (h1, h2, v) in nodes.items() if v >= ground_z}
    excluded = len(nodes) - len(filtered)

    if dryrun:
        print(f"  [DRYRUN] Would write: {filepath} ({len(filtered)} nodes, excluded {excluded} foundation nodes)")
        return

    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", newline="") as f:
        f.write(header + "\n")
        for node_id in sorted(filtered.keys()):
            h1, h2, v = filtered[node_id]
            f.write(f"{node_id},{node_id},{h1},{h2},{v},Free,Free,Free,Free,Free,Free\n")
    print(f"  Wrote: {filepath} ({len(filtered)} nodes, excluded {excluded} foundation nodes below z={ground_z})")


def write_height_csv(filepath, story_heights, dryrun=False):
    """Write building_height.csv (Story level, Story Height (ft))."""
    header = "Story level,Story Height (ft)"

    if dryrun:
        print(f"  [DRYRUN] Would write: {filepath} ({len(story_heights)} stories)")
        return

    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", newline="") as f:
        f.write(header + "\n")
        for name, height_ft in story_heights:
            f.write(f"{name},{height_ft}\n")
    print(f"  Wrote: {filepath} ({len(story_heights)} stories)")


def main():
    args = parse_args()
    building_name = args.building
    building_path = os.path.join(args.csv_dir, building_name)

    print(f"{'=' * 60}")
    print(f"GENERATE NODE DATA FROM DISPLACEMENTS")
    print(f"{'=' * 60}")
    print(f"Building: {building_name}")
    print(f"Path: {building_path}")

    if not os.path.isdir(building_path):
        print(f"\nERROR: Building folder not found: {building_path}")
        sys.exit(1)

    # --- Discover simulations ---
    print(f"\nDiscovering simulations...")
    simulations = discover_simulations(building_path)
    if not simulations:
        print(f"ERROR: No simulations with Displacements/ folder found in {building_path}")
        sys.exit(1)
    print(f"Found {len(simulations)} simulation(s): {[s['name'] for s in simulations]}")

    # --- Collect nodes from displacement files ---
    print(f"\nCollecting nodes from displacement files...")
    all_nodes = collect_nodes_from_displacements(simulations)
    if not all_nodes:
        print(f"ERROR: No nodes found in any displacement file")
        sys.exit(1)
    print(f"\nCollected {len(all_nodes)} unique node(s)")

    # --- Infer story heights ---
    print(f"\nInferring story heights from Z coordinates...")
    story_heights, ground_z = infer_story_heights(all_nodes)
    if len(story_heights) < 2:
        print(f"ERROR: Could not infer story heights. Only found {len(story_heights)} distinct level(s). "
              f"Check that displacement files contain multi-floor nodes.")
        sys.exit(1)

    num_floors = len(story_heights) - 1  # -1 for Ground
    print(f"Inferred {len(story_heights)} level(s) ({num_floors} floor(s) above Ground, "
          f"ground cluster at z={ground_z:.1f} in):")
    for name, height_ft in story_heights:
        label = f"  {name}"
        if name == "Ground":
            label += " (base)"
        else:
            label += f" (height: {height_ft} ft)"
        print(label)

    # --- Write outputs ---
    node_csv_path = os.path.join(building_path, "node_data.csv")
    height_csv_path = os.path.join(building_path, "building_height.csv")

    print(f"\nWriting outputs...")
    write_node_csv(node_csv_path, all_nodes, ground_z, args.dryrun)
    write_height_csv(height_csv_path, story_heights, args.dryrun)

    if not args.dryrun:
        print(f"\nSummary:")
        print(f"  node_data.csv:      {node_csv_path}")
        print(f"  building_height.csv: {height_csv_path}")

    print(f"\nDone!")


if __name__ == "__main__":
    main()
