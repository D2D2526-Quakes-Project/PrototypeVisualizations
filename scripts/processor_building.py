"""
processor_building.py
=====================
Building-level binary data processor.

This module is responsible for converting the per-building CSV files into
``building.bld`` (node geometry, story layout, corners, ISD mapping, cross-
sections) and ``beam_data.bld`` (member connectivity).

These outputs are written once per building and are shared across all of its
simulations.

Public functions
----------------
process_building(building)
    Main entry point.  Reads node_data.csv and building_height.csv, computes
    all derived geometry metadata, writes building.bld, optionally writes
    beam_data.bld, and returns the data structures that simulation processors
    need.

process_beam_data(building, id_to_index, building_output_dir)
    Read beam_data.csv, write beam_data.bld, and return lookup maps used by
    the hinge and BRB processors.

Required input files
--------------------
node_data.csv
    Columns: Node ID, H1, H2, V
    Description: Node IDs with XYZ coordinates. Coordinate units are auto-
    detected as inches or feet.

building_height.csv
    Columns: Story level, Story Height (ft)
    Description: One row per story (top to bottom). Heights must be in feet.

Optional input files
--------------------
beam_data.csv
    Columns: Group ID, Element ID, I-Node ID, J-Node ID, Group Name,
             Property Name (optional)
    Description: Member connectivity. Required for hinge and BRB processing.

corner_positions.csv
    Columns: Corner, Story (optional), X Pos, Y Pos
    Description: Custom NW/NE/SW/SE corner XY positions (in the same unit as
    node_data.csv). When "Story" column is absent, positions apply globally.
    Supports hierarchical fallback: if a story is not listed, the closest
    story below it is used.

hidden_floors.csv
    Columns: Story  OR  Story level
    Description: Story labels that should be hidden in the viewer.

Output files
------------
<BINARY_DIR>/<building_name>/building.bld
    Gzip-compressed file containing:
      - JSON header with count_nodes, stories, corners, story_heights,
        story_order, node_to_below, cross_sections_x, cross_sections_y,
        and optionally hidden_floors
      - Binary body: float32 [H1, H2, V, H1, H2, V, …] in inches, one
        triplet per node

<BINARY_DIR>/<building_name>/beam_data.bld  (when beam_data.csv is present)
    Gzip-compressed file containing:
      - JSON header with count_rows, stride (3), groupNames
      - Binary body: float32 rows of [i_node_index, j_node_index, group_idx]
"""

import os
from typing import TYPE_CHECKING

import numpy as np
import pandas as pd

from .shared import BINARY_DIR, BeamLookupMaps, BuildingInfo, write_bld_file

if TYPE_CHECKING:
    from .shared import Args

# ---------------------------------------------------------------------------
# Private geometry helpers
# ---------------------------------------------------------------------------


def _infer_node_to_inches_scale(node_elevations_in: pd.Series, story_elevations_in: np.ndarray) -> float:
    """
    Infer whether node elevations are in inches or feet by matching
    normalised story elevations.

    Tries scale factors of 1.0 (already inches) and 12.0 (feet → inches)
    and returns whichever produces the best alignment between node elevations
    and the known story elevations from building_height.csv.

    Parameters
    ----------
    node_elevations_in : array-like
        Raw "V" column values from node_data.csv.
    story_elevations_in : array-like
        Cumulative story elevations in inches (computed from building_height.csv).

    Returns
    -------
    float
        1.0 (nodes already in inches) or 12.0 (nodes in feet).
    """
    candidate_scales = [1.0, 12.0]
    tolerance_in = 0.5
    minV = float(node_elevations_in.min())
    node_elevations_in = node_elevations_in - minV

    node_elevations = np.asarray(node_elevations_in, dtype=np.float64)
    story_elevations = np.asarray(story_elevations_in, dtype=np.float64)
    story_elevations = story_elevations - np.min(story_elevations)

    if node_elevations.size == 0 or story_elevations.size == 0:
        return 1.0

    unique_node_elevations = np.unique(np.round(node_elevations, decimals=6))
    best_scale = 1.0
    best_matched = -1
    best_mean_delta = np.inf
    low_match_threshold = max(5, len(story_elevations) * 0.2)

    for scale in candidate_scales:
        scaled_elev = unique_node_elevations * scale
        normalized_elev = scaled_elev - np.min(scaled_elev)
        min_deltas = float(np.min(np.abs(normalized_elev[None, :] - story_elevations[:, None]), axis=1))
        matched_count = int(np.count_nonzero(min_deltas <= tolerance_in))
        mean_delta = float(np.mean(min_deltas))

        print(f"Scale check ({scale:.1f}): matched {matched_count}/{len(story_elevations)} " + f"story elevations (mean abs delta={mean_delta:.3f} in).")

        is_better = False
        if matched_count > best_matched:
            if matched_count >= low_match_threshold:
                is_better = True
            elif best_matched < low_match_threshold and mean_delta < best_mean_delta:
                is_better = True
        elif matched_count == best_matched and mean_delta < best_mean_delta:
            is_better = True

        if is_better:
            best_scale = scale
            best_matched = matched_count
            best_mean_delta = mean_delta

    print(f"Auto-selected node scale: {best_scale:.1f} " + f"(matched {best_matched}/{len(story_elevations)} story elevations)")
    return best_scale


def _assign_nodes_to_stories(
    df_nodes: pd.DataFrame, story_elevations: np.ndarray, story_levels: list[str], node_scale: float, min_v: float, tol: float = 0.5
) -> tuple[dict[str, list[int | None]], list[dict[str, object]]]:
    """
    Assign each node to a story by matching its scaled Z coordinate to the
    known story elevations within ``tol`` inches.

    Parameters
    ----------
    df_nodes : pd.DataFrame
        Node data with columns "Node ID", "H1", "H2", "V".
    story_elevations : np.ndarray
        Cumulative story elevations in inches (top-to-bottom CSV order).
    story_levels : list[str]
        Story label for each elevation (same order as story_elevations).
    node_scale : float
        Multiply raw node coordinates by this factor to convert to inches.
    min_v : float
        Minimum vertical coordinate (in inches) subtracted for grounding.
    tol : float
        Tolerance in inches for elevation matching.

    Returns
    -------
    stories : dict[str, list[int]]
        Story label → list of node IDs assigned to that story.
    unmatched_nodes : list[dict]
        Nodes that could not be matched to any story elevation.
    """
    stories: dict[str, list[int | None]] = {}
    unmatched_nodes: list[dict[str, object]] = []

    n = len(story_elevations)
    story_bottoms = np.zeros(n, dtype=np.float64)
    story_bottoms[:-1] = story_elevations[1:]

    for _, row in df_nodes.iterrows():
        x = row["H1"] * node_scale
        y = row["H2"] * node_scale
        z = row["V"] * node_scale - min_v

        exact_matches = np.where(np.isclose(story_elevations, z, atol=tol))[0]
        if len(exact_matches) == 0:
            unmatched_nodes.append(
                {
                    "node_id": row["Node ID"],
                    "x": float(x),
                    "y": float(y),
                    "z": float(z),
                }
            )
            continue

        stidx = int(exact_matches[0])
        story = story_levels[stidx]
        stories.setdefault(story, []).append(row["Node ID"] if pd.notna(row["Node ID"]) else None)

    stories = {story: [idx for idx in node_indices if idx is not None] for story, node_indices in stories.items()}
    unmatched_nodes = [n for n in unmatched_nodes if n["node_id"] is not None]
    return stories, unmatched_nodes


def _warn_unmatched_nodes(building_name: str, unmatched_nodes: list[dict[str, object]], total_nodes: int):
    """
    Print a diagnostic warning when nodes could not be matched to any story.

    Unmatched nodes often indicate non-floor nodes (hinges, connectors, etc.)
    or a unit-scale mismatch.  The first 20 unmatched nodes are listed with
    their coordinates.

    Parameters
    ----------
    building_name : str
    unmatched_nodes : list[dict]
    total_nodes : int
    story_elevations : array-like  (unused currently, kept for future use)
    """
    if not unmatched_nodes:
        print(f"✓ All nodes were assigned to story elevations for {building_name}.")
        return

    unmatched_count = len(unmatched_nodes)
    print(f"\n⚠ WARNING: {unmatched_count}/{total_nodes} nodes in {building_name} were not assigned to any story elevation.")
    print("      These nodes often indicate non-floor nodes (e.g., hinges, connectors, auxiliary points) or mismatched unit scale.")
    print("      node_id, x(in), y(in), z(in):")

    sample = unmatched_nodes[:20]
    for node in sample:
        print(f"      {node['node_id']}: ({node['x']:.3f}, {node['y']:.3f}, {node['z']:.3f})")

    if unmatched_count > len(sample):
        print(f"      ... and {unmatched_count - len(sample)} more.")


def _compute_node_to_below_mapping(
    stories: dict[str, list[int]],
    story_order: list[str],
    df_nodes: pd.DataFrame,
    id_to_index: dict[int, int],
    index_to_id: dict[int, int],
    node_to_inches_scale: float,
    xy_tolerance: float = 32,
) -> tuple[list[int], list[dict[str, object]]]:
    """
    Compute the node-to-below mapping used for inter-storey drift (ISD).

    For each node on each story (except the ground floor), this function
    finds the node directly below it: same XY position (within
    ``xy_tolerance`` inches) and the closest elevation below.

    Parameters
    ----------
    stories : dict[str, list[int]]
        Story → list of zero-based node indices.
    story_order : list[str]
        Stories ordered bottom-to-top.
    df_nodes : pd.DataFrame
    id_to_index : dict[int, int]
    index_to_id : dict[int, int]
    node_to_inches_scale : float
    xy_tolerance : float
        Maximum XY distance (inches) to consider two nodes "stacked".

    Returns
    -------
    node_to_below : list[int]
        Length = total node count.  ``node_to_below[i]`` is the index of
        the node directly below node ``i``, or -1 if none found.
    unmatched_nodes : list[dict]
        Nodes that could not find a target below.
    """
    print(f"\n--- Computing Node-to-Below Mapping (XY tolerance: {xy_tolerance} in) ---")

    node_to_below = [-1] * len(id_to_index)
    unmatched_nodes: list[dict[str, object]] = []

    story_positions: dict[str, list[tuple[float, float, float, int]]] = {}
    for story, node_indices in stories.items():
        positions: list[tuple[float, float, float, int]] = []
        for node_idx in node_indices:
            node_id = index_to_id[node_idx]
            row = df_nodes[df_nodes["Node ID"] == node_id].iloc[0]
            x = row["H1"] * node_to_inches_scale
            y = row["H2"] * node_to_inches_scale
            z = row["V"] * node_to_inches_scale
            positions.append((x, y, z, node_idx))
        story_positions[story] = positions

    for i, story in enumerate(story_order):
        if i == 0:
            continue  # Ground floor has no story below
        story_below = story_order[i - 1]

        current_positions = story_positions.get(story, [])
        below_positions = story_positions.get(story_below, [])

        if not current_positions:
            continue

        matched_count = 0
        for x, y, z, node_idx in current_positions:
            candidates = [(bz, bidx) for (bx, by, bz, bidx) in below_positions if abs(bx - x) < xy_tolerance and abs(by - y) < xy_tolerance and bz < z]

            if candidates:
                best = max(candidates, key=lambda c: c[0])
                node_to_below[node_idx] = best[1]
                matched_count += 1
            else:
                unmatched_nodes.append(
                    {
                        "node_idx": node_idx,
                        "story": story,
                        "x": x,
                        "y": y,
                        "z": z,
                    }
                )

        print(f"  Story {story}: {matched_count}/{len(current_positions)} nodes matched to story {story_below}")

    if unmatched_nodes:
        print(f"\n⚠ WARNING: {len(unmatched_nodes)} nodes could not find a match below:")
        sample = unmatched_nodes[:15]
        for node in sample:
            print(f"      Node {node['node_idx']} at story {node['story']}: ({node['x']:.3f}, {node['y']:.3f}, z={node['z']:.3f})")
        if len(unmatched_nodes) > len(sample):
            print(f"      ... and {len(unmatched_nodes) - len(sample)} more")

    print(f"✓ Node-to-below mapping complete: {sum(1 for x in node_to_below if x >= 0)}/{len(node_to_below)} nodes mapped")

    return node_to_below, unmatched_nodes


def _compute_cross_sections(df_nodes: pd.DataFrame, id_to_index: dict[int, int], node_scale: float, tol: float = 6.0) -> tuple[dict[str, list[int]], dict[str, list[int]]]:
    """
    Group nodes into cross-sections (slices) along the X and Y axes.

    Nodes within ``tol`` inches of each other along a given axis are placed
    into the same cross-section group.  The group key is the average
    coordinate of the group, formatted to one decimal place.

    Parameters
    ----------
    df_nodes : pd.DataFrame
    id_to_index : dict[int, int]
    node_scale : float
    tol : float
        Grouping tolerance in inches.

    Returns
    -------
    cross_sections_x : dict[str, list[int]]
        Averaged X coordinate (in) → list of node indices in that X slice.
    cross_sections_y : dict[str, list[int]]
        Averaged Y coordinate (in) → list of node indices in that Y slice.
    """
    print(f"\n--- Computing X/Y cross_sections (tolerance: {tol} in) ---")
    x_nodes: list[tuple[float, int]] = []
    y_nodes: list[tuple[float, int]] = []

    for _, row in df_nodes.iterrows():
        idx = id_to_index.get(row["Node ID"])
        if idx is None:
            continue
        x = row["H1"] * node_scale
        y = row["H2"] * node_scale
        x_nodes.append((x, idx))
        y_nodes.append((y, idx))

    def group_1d(val_idx_list: list[tuple[float, int]]) -> dict[str, list[int]]:
        val_idx_list.sort(key=lambda item: item[0])
        groups: dict[str, list[int]] = {}
        if not val_idx_list:
            return groups

        current_group_nodes = []
        current_group_vals = []
        current_group_val = val_idx_list[0][0]

        for val, idx in val_idx_list:
            if abs(val - current_group_val) <= tol:
                current_group_nodes.append(idx)
                current_group_vals.append(val)
            else:
                avg_val = sum(current_group_vals) / len(current_group_vals)
                groups[f"{avg_val:.1f}"] = current_group_nodes

                current_group_val = val
                current_group_nodes = [idx]
                current_group_vals = [val]

        if current_group_nodes:
            avg_val = sum(current_group_vals) / len(current_group_vals)
            groups[f"{avg_val:.1f}"] = current_group_nodes

        return groups

    cross_sections_x = group_1d(x_nodes)
    cross_sections_y = group_1d(y_nodes)

    print(f"✓ Found {len(cross_sections_x)} X-cross_sections and {len(cross_sections_y)} Y-cross_sections")
    return cross_sections_x, cross_sections_y


# ---------------------------------------------------------------------------
# Public processors
# ---------------------------------------------------------------------------


def process_building(building: BuildingInfo, *, args: Args) -> tuple[dict[int, int], BeamLookupMaps | None, str, list[str]]:
    """
    Process a building's CSV files and write building.bld (and beam_data.bld).

    Steps
    -----
    1. Load node_data.csv and building_height.csv.
    2. Load optional corner_positions.csv and hidden_floors.csv.
    3. Auto-detect whether node coordinates are in inches or feet.
    4. Assign nodes to stories.
    5. Determine corner nodes per story (custom positions or bounding-box).
    6. Compute node-to-below mapping for ISD.
    7. Compute X/Y cross-section groupings.
    8. Write building.bld.
    9. If beam_data.csv exists, call process_beam_data and write beam_data.bld.

    Parameters
    ----------
    building : dict
        Building metadata dict as returned by ``discover_buildings()``.

    Returns
    -------
    id_to_index : dict[int, int]
        Node ID → zero-based node index.
    beam_lookup_maps : dict or None
        Lookup maps for hinge/BRB processors, or None when beam_data.csv is
        absent.
    building_output_dir : str
        Absolute path to the output directory for this building.
    storyOrder : list[str]
        Story labels ordered bottom-to-top.
    """
    building_name = building["name"]
    building_output_dir = os.path.join(BINARY_DIR, building_name)

    print(f"\n{'='*60}")
    print(f"Processing Building: {building_name}")
    print(f"{'='*60}")

    if not os.path.exists(building_output_dir):
        os.makedirs(building_output_dir)

    # 1. Load Nodes + Story Heights
    df_nodes = pd.read_csv(building["node_data"])
    df_height = pd.read_csv(building["height"])

    # 1b. Load optional corner positions and hidden floors
    corner_positions: dict[str, dict[str, dict[str, float]]] | None = None
    hidden_floors: list[str] = []

    if "corner_positions" in building:
        corner_csv = building["corner_positions"]
        print(f"    Loading corner positions from: {corner_csv}")
        df_corners = pd.read_csv(corner_csv)

        corner_positions = {"NW": {}, "NE": {}, "SW": {}, "SE": {}}
        has_story_col = "Story" in df_corners.columns

        for _, row in df_corners.iterrows():
            corner_name = row["Corner"]
            if has_story_col:
                story = str(row["Story"]).strip() if pd.notna(row["Story"]) else "Ground"
                if story == "" or story.lower() == "nan":
                    story = "Ground"
            else:
                story = "Ground"
            if corner_name in corner_positions:
                corner_positions[corner_name][story] = {
                    "x": float(row["X Pos"]),
                    "y": float(row["Y Pos"]),
                }
        print(f"    Corner positions loaded: {corner_positions}")

    if "hidden_floors" in building:
        hidden_floors_csv = building["hidden_floors"]
        print(f"    Loading hidden floors from: {hidden_floors_csv}")
        df_hidden = pd.read_csv(hidden_floors_csv)
        if "Story" in df_hidden.columns:
            hidden_floors = df_hidden["Story"].tolist()
        elif "Story level" in df_hidden.columns:
            hidden_floors = df_hidden["Story level"].tolist()
        print(f"    Hidden floors: {hidden_floors}")

    unique_ids = df_nodes["Node ID"].unique()
    id_to_index = {uid: i for i, uid in enumerate(unique_ids)}
    index_to_id = {i: uid for i, uid in enumerate(unique_ids)}
    count_nodes = len(unique_ids)

    # 2. Load Stories & Corners
    storiesElevations = {}
    for i, row in df_height.iterrows():
        story = row["Story level"]
        elevation = row["Story Height (ft)"]
        for j, row2 in df_height[i:].iterrows():
            if i == j:
                continue
            elevation += row2["Story Height (ft)"]
        storiesElevations[story] = elevation * 12

    # 3. Infer unit scale and prepare node binary buffer
    story_elevations_array = np.array(list(storiesElevations.values()), dtype=np.float64)
    node_to_inches_scale = _infer_node_to_inches_scale(df_nodes["V"], story_elevations_array)

    min_v = df_nodes["V"].min() * node_to_inches_scale
    buffer = np.zeros(count_nodes * 3, dtype=np.float32)
    for _, row in df_nodes.iterrows():
        idx = id_to_index.get(row["Node ID"])
        if idx is not None:
            buffer[idx * 3 + 0] = row["H1"] * node_to_inches_scale
            buffer[idx * 3 + 1] = row["H2"] * node_to_inches_scale
            buffer[idx * 3 + 2] = row["V"] * node_to_inches_scale - min_v

    story_levels = list(storiesElevations.keys())
    story_elevations = story_elevations_array

    stories, unmatched_nodes = _assign_nodes_to_stories(
        df_nodes,
        story_elevations,
        story_levels,
        node_to_inches_scale,
        min_v,
    )
    _warn_unmatched_nodes(building_name, unmatched_nodes, len(df_nodes))

    # Convert discovered floor Node IDs to zero-based geometry indices
    stories = {story: [id_to_index[nid] for nid in node_indices if nid in id_to_index] for story, node_indices in stories.items()}

    # 4. Find corners per story
    story_order_list = df_height["Story level"].tolist()
    story_order_list = list(reversed(story_order_list))

    def get_corner_xy_for_story(corner_name: str, target_story: str) -> tuple[float, float] | None:
        """Hierarchical lookup: if target story is absent, use closest story below."""
        if not corner_positions:
            return None
        corner_specs = corner_positions.get(corner_name, {})
        if not corner_specs:
            return None
        if target_story not in story_order_list:
            return None
        target_idx = story_order_list.index(target_story)
        for i in range(target_idx, -1, -1):
            story = story_order_list[i]
            if story in corner_specs:
                return (corner_specs[story]["x"], corner_specs[story]["y"])
        return None

    storiesCorners = {}
    for story, node_indices in stories.items():
        story_nodes = df_nodes[df_nodes["Node ID"].isin([index_to_id[idx] for idx in node_indices])]
        xs = story_nodes["H1"].values * node_to_inches_scale
        ys = story_nodes["H2"].values * node_to_inches_scale

        target_corners = {}

        if corner_positions:
            for corner_name in ["NW", "NE", "SW", "SE"]:
                xy = get_corner_xy_for_story(corner_name, story)
                if xy:
                    target_corners[corner_name] = (xy[0], xy[1])

            if len(target_corners) < 4:
                max_x, min_x_story = xs.max(), xs.min()
                max_y, min_y_story = ys.max(), ys.min()
                fallback_corners = {
                    "NW": (min_x_story, max_y),
                    "NE": (max_x, max_y),
                    "SW": (min_x_story, min_y_story),
                    "SE": (max_x, min_y_story),
                }
                for corner_name in ["NW", "NE", "SW", "SE"]:
                    if corner_name not in target_corners:
                        target_corners[corner_name] = fallback_corners[corner_name]
        else:
            max_x, min_x_story = xs.max(), xs.min()
            max_y, min_y_story = ys.max(), ys.min()
            target_corners = {
                "NW": (min_x_story, max_y),
                "NE": (max_x, max_y),
                "SW": (min_x_story, min_y_story),
                "SE": (max_x, min_y_story),
            }

        corners = {}
        for corner_name, (target_x, target_y) in target_corners.items():
            distances = np.sqrt((xs - target_x) ** 2 + (ys - target_y) ** 2)
            closest_idx = distances.argmin()
            corners[corner_name] = {
                "index": node_indices[closest_idx],
                "x": xs[closest_idx],
                "y": ys[closest_idx],
            }

        storiesCorners[story] = corners

    corners = {"NW": [], "NE": [], "SW": [], "SE": []}
    for story, storyCorners in storiesCorners.items():
        for corner, cornerData in storyCorners.items():
            corners[corner].append(cornerData["index"])

    # 5. Per-story heights
    storyHeights = {}
    for i, row in df_height.iterrows():
        story = row["Story level"]
        storyHeights[story] = row["Story Height (ft)"] * 12

    storyOrder = list(storyHeights.keys())
    storyOrder.reverse()
    print(f"Story order: {storyOrder}")

    # 6. Node-to-below mapping for ISD
    node_to_below, unmatched_nodes = _compute_node_to_below_mapping(stories, storyOrder, df_nodes, id_to_index, index_to_id, node_to_inches_scale)

    # 7. X/Y cross-sections
    cross_sections_x, cross_sections_y = _compute_cross_sections(df_nodes, id_to_index, node_to_inches_scale, tol=6.0)

    # 8. Write building.bld
    header = {
        "count_nodes": count_nodes,
        "stories": stories,
        "corners": corners,
        "story_heights": storyHeights,
        "story_order": storyOrder,
        "node_to_below": node_to_below,
        "cross_sections_x": cross_sections_x,
        "cross_sections_y": cross_sections_y,
    }

    if hidden_floors:
        header["hidden_floors"] = hidden_floors
        print(f"    Added hidden floors to metadata: {hidden_floors}")

    write_bld_file("building.bld", header, buffer.tobytes(), building_output_dir, args.dryrun)

    # 9. Beam data (optional)
    if "beam_data" in building:
        beam_lookup_maps = process_beam_data(building, id_to_index, building_output_dir, args=args)
    else:
        print(f"    Skipping beam_data.bld: beam_data.csv not available")
        beam_lookup_maps = None

    return id_to_index, beam_lookup_maps, building_output_dir, storyOrder


def process_beam_data(building: BuildingInfo, id_to_index: dict[int, int], building_output_dir: str, *, args: Args) -> BeamLookupMaps:
    """
    Process building-level beam connectivity and write beam_data.bld.

    Reads beam_data.csv, validates all node references against id_to_index,
    encodes each beam as a 3-float row (i_node_index, j_node_index,
    group_idx), and writes the result.

    Also returns two lookup maps used downstream by the hinge and BRB
    processors:

    - ``hinge_by_group2_element_id``:
      ``{element_id: beam_index}`` for Group ID 2 beams only (the frame
      elements that can have hinges).

    - ``by_group_id_element_id``:
      ``{(group_id, element_id): {"beamIndex": int, "propertyName": str,
      "groupId": int}}`` for all beams.

    Parameters
    ----------
    building : dict
        Building metadata dict.  Must contain a ``"beam_data"`` key.
    id_to_index : dict[int, int]
        Node ID → zero-based node index (from process_building).
    building_output_dir : str
        Directory to write beam_data.bld into.

    Returns
    -------
    dict
        ``{"hinge_by_group2_element_id": ..., "by_group_id_element_id": ...}``

    Raises
    ------
    FileNotFoundError
        When beam_data.csv is missing.
    ValueError
        When required columns are absent, or when node/element IDs are
        duplicated or unresolvable.

    Required CSV columns
    --------------------
    beam_data.csv: Group ID, Element ID, I-Node ID, J-Node ID, Group Name
    Optional column: Property Name (used by BRB processor)

    Output file
    -----------
    beam_data.bld
        Header: {"count_rows": N, "stride": 3, "groupNames": [...]}
        Binary: float32 rows of [i_node_index, j_node_index, group_idx]
    """
    beam_file = building.get("beam_data")
    if not beam_file or not os.path.exists(beam_file):
        raise FileNotFoundError(f"beam_data.csv not found for building {building['name']}: {beam_file}")

    df_beams = pd.read_csv(beam_file)
    df_beams.columns = [str(c).strip() for c in df_beams.columns]

    required_columns = ["Group ID", "Element ID", "I-Node ID", "J-Node ID"]
    missing_columns = [column for column in required_columns if column not in df_beams.columns]
    if missing_columns:
        raise ValueError(f"beam_data.csv missing required columns: {missing_columns}")

    for column in required_columns:
        df_beams[column] = pd.to_numeric(df_beams[column], errors="coerce")

    invalid_rows = df_beams[required_columns].isna().any(axis=1)
    invalid_count = int(invalid_rows.sum())
    if invalid_count > 0:
        print(f"⚠ Dropping {invalid_count} invalid beam rows with missing numeric fields")
        df_beams = df_beams.loc[~invalid_rows].copy()

    if df_beams.empty:
        raise ValueError(f"beam_data.csv has no valid rows after normalization: {beam_file}")

    for column in required_columns:
        df_beams[column] = df_beams[column].round().astype(np.int32)

    row_count = len(df_beams)
    stride = 3
    encoded = np.zeros((row_count, stride), dtype=np.float32)

    beam_index_by_group2_element_id = {}
    beam_info_by_group_id_element_id = {}
    missing_node_refs = []
    unique_group_names = sorted(df_beams["Group Name"].unique().tolist())
    unique_group_ids = sorted(df_beams["Group ID"].unique().tolist())

    for beam_index, (_, row) in enumerate(df_beams.iterrows()):
        element_id = int(row["Element ID"])
        group_id = int(row["Group ID"])
        group_idx = unique_group_ids.index(group_id)
        i_node_id = int(row["I-Node ID"])
        j_node_id = int(row["J-Node ID"])

        i_node_index = id_to_index.get(i_node_id)
        j_node_index = id_to_index.get(j_node_id)
        if i_node_index is None or j_node_index is None:
            missing_node_refs.append((beam_index, element_id, group_id, i_node_id, j_node_id))
            continue

        encoded[beam_index, 0] = np.float32(i_node_index)
        encoded[beam_index, 1] = np.float32(j_node_index)
        encoded[beam_index, 2] = np.float32(group_idx)

        if group_id == 2:
            if element_id in beam_index_by_group2_element_id:
                existing_index = beam_index_by_group2_element_id[element_id]
                raise ValueError(f"Duplicate beam Element ID within Group ID 2: {element_id} " + f"(rows {existing_index} and {beam_index})")
            beam_index_by_group2_element_id[element_id] = beam_index

        property_name = str(row["Property Name"]).strip() if "Property Name" in df_beams.columns and pd.notna(row.get("Property Name")) else ""
        brb_key = (group_id, element_id)
        if brb_key in beam_info_by_group_id_element_id:
            existing = beam_info_by_group_id_element_id[brb_key]["beamIndex"]
            raise ValueError(f"Duplicate beam row for Group ID + Element ID {brb_key}: rows {existing} and {beam_index}")
        beam_info_by_group_id_element_id[brb_key] = {
            "beamIndex": beam_index,
            "propertyName": property_name,
            "groupId": group_id,
        }

    if missing_node_refs:
        raise ValueError(f"beam_data.csv contains {len(missing_node_refs)} row(s) referencing unknown node IDs. " + f"Sample: {missing_node_refs[:5]}")

    header = {
        "count_rows": row_count,
        "stride": stride,
        "groupNames": unique_group_names,
    }

    write_bld_file("beam_data.bld", header, encoded.flatten().tobytes(), building_output_dir, args.dryrun)
    return {
        "hinge_by_group2_element_id": beam_index_by_group2_element_id,
        "by_group_id_element_id": beam_info_by_group_id_element_id,
    }
