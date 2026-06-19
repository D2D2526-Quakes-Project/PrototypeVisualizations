"""
processor_hinge.py
==================
Processor for non-time-series plastic hinge data.

This module reads the hinge_data.csv from a simulation's "Hinge results/"
folder, validates and normalises the table, resolves each hinge to a beam
index and end side (I or J), and writes a compact binary table to
hinge_data.bld.

Public functions
----------------
process_hinge_data(files_config, simulation_output_dir, beam_index_by_group2_element_id)
    Main entry point.  Loads, validates, and writes hinge data.

load_hinge_dataframe(hinge_file)
    Load hinge_data.csv into a pandas DataFrame.

normalize_hinge_dataframe(df_hinge, hinge_file)
    Validate column presence, coerce numeric columns, and drop invalid rows.

build_hinge_side_lookup_by_beam(normalized_hinge_rows)
    Determine the "I" or "J" end for each (beamIndex, componentNo) pair.

Required input file
-------------------
Hinge results/hinge_data.csv
    Required columns (see config.HINGE_REQUIRED_COLUMNS):
        Group ID, Element ID, Step Type, Component No., Performance Level,
        M3, R3, Max Pos Deform DCRatio, Max Neg Deform DCRatio

    Only rows with Performance Level == 1 are processed.
    Only Step Type values "Max" and "Min" are supported.
    Group ID must be 2 for all retained rows.

Output file
-----------
<simulation_output_dir>/hinge_data.bld
    Header:
        count_rows : int   — number of beam-end records written
        stride     : int   — number of float32 values per row (currently 9)
        fields     : list  — field names in binary order

    Binary body:
        float32 rows, one per beam that has at least one hinge.
        Fields (stride = 9):
            beamIndex, endMask,
            iM3Max, iM3Min, iR3Max, iR3Min,
            jM3Max, jM3Min, jR3Max, jR3Min

        endMask bit layout:
            bit 0 (0b01) = I-end has hinge data
            bit 1 (0b10) = J-end has hinge data

    Note: MaxPosDCRatio / MaxNegDCRatio fields are computed but currently
    commented out of the output fields list; add them back if needed.

Dependency
----------
Requires beam_data.csv (processed by processor_building.process_beam_data).
beam_index_by_group2_element_id is the hinge-specific lookup map returned
by that function.
"""

import os
from pathlib import Path

import numpy as np
import pandas as pd

from .shared import HINGE_REQUIRED_COLUMNS, HINGE_NUMERIC_COLUMNS, HINGE_COMPONENT_TO_SIDE, write_bld_file


def load_hinge_dataframe(hinge_file):
    """
    Load hinge_data.csv into a DataFrame.

    Only CSV format is supported.  Other extensions are logged and skipped.

    Parameters
    ----------
    hinge_file : str
        Absolute path to the hinge results file.

    Returns
    -------
    pd.DataFrame or None
        Loaded DataFrame, or None when the format is unsupported.
    """
    suffix = Path(hinge_file).suffix.lower()

    if suffix == ".csv":
        return pd.read_csv(hinge_file)

    print(f"⚠ Skipping unsupported hinge file format: {hinge_file}")
    return None


def normalize_hinge_dataframe(df_hinge, hinge_file):
    """
    Validate and normalise a hinge DataFrame to canonical schema.

    Steps:
    1. Strip whitespace from column names.
    2. Check that all HINGE_REQUIRED_COLUMNS are present.
    3. Coerce HINGE_NUMERIC_COLUMNS to numeric (invalid → NaN).
    4. Drop rows with empty Step Type or NaN key fields.
    5. Reject the file if duplicate (Element ID, Component No., Step Type,
       Performance Level) combinations exist, because deterministic results
       require unique keys.
    6. Cast integer key columns to int32.

    Parameters
    ----------
    df_hinge : pd.DataFrame
        Raw DataFrame from load_hinge_dataframe.
    hinge_file : str
        Path used in error messages only.

    Returns
    -------
    pd.DataFrame or None
        Normalised DataFrame with only HINGE_REQUIRED_COLUMNS retained, or
        None on validation failure.
    """
    normalized = df_hinge.copy()
    normalized.columns = [str(c).strip() for c in normalized.columns]

    missing_columns = [column for column in HINGE_REQUIRED_COLUMNS if column not in normalized.columns]
    if missing_columns:
        print(f"❌ Hinge file missing required columns: {missing_columns}")
        print(f"   Source: {hinge_file}")
        return None

    normalized = normalized[HINGE_REQUIRED_COLUMNS].copy()

    for column in HINGE_NUMERIC_COLUMNS:
        normalized[column] = pd.to_numeric(normalized[column], errors="coerce")

    normalized["Step Type"] = normalized["Step Type"].fillna("").astype(str).str.strip()

    invalid_key_rows = normalized["Step Type"].eq("") | normalized[["Group ID", "Element ID", "Component No.", "Performance Level"]].isna().any(axis=1)
    invalid_count = int(invalid_key_rows.sum())
    if invalid_count > 0:
        print(f"⚠ Dropping {invalid_count} hinge rows with invalid key fields from: {hinge_file}")
        normalized = normalized.loc[~invalid_key_rows].copy()

    if normalized.empty:
        print(f"❌ Hinge file has no valid rows after normalization: {hinge_file}")
        return None

    key_columns = ["Element ID", "Component No.", "Step Type", "Performance Level"]
    duplicate_count = int(normalized.duplicated(subset=key_columns).sum())
    if duplicate_count > 0:
        print(f"❌ Hinge data has {duplicate_count} duplicate key row(s): {hinge_file}")
        print(f"   Key columns: {key_columns}")
        return None

    for column in ["Group ID", "Element ID", "Component No.", "Performance Level"]:
        normalized[column] = normalized[column].round().astype(np.int32)

    return normalized


def build_hinge_side_lookup_by_beam(normalized_hinge_rows):
    """
    Resolve the hinge end side (I or J) for each (beamIndex, componentNo) pair.

    Uses the per-beam set of Component No. values to disambiguate:
    - Singleton sets: component 2 → I, components 3/4/5 → J (single-end beams).
    - Multi-component sets: each component is mapped via HINGE_COMPONENT_TO_SIDE.

    Raises ValueError when a component pattern is ambiguous or unsupported.

    Parameters
    ----------
    normalized_hinge_rows : pd.DataFrame
        Must have columns "beamIndex" and "Component No.".

    Returns
    -------
    dict[tuple[int, int], str]
        ``{(beam_index, component_no): "I" or "J"}``
    """
    side_lookup = {}
    component_sets_by_beam = normalized_hinge_rows.groupby("beamIndex")["Component No."].agg(lambda values: tuple(sorted({int(value) for value in values.dropna().tolist()})))

    pattern_counts = component_sets_by_beam.value_counts().sort_index()
    print("Resolved hinge component patterns by beam:")
    for component_pattern, count in pattern_counts.items():
        print(f"  Components {component_pattern}: {int(count)} beam(s)")

    for beam_index, component_pattern in component_sets_by_beam.items():
        if len(component_pattern) == 1:
            component_no = component_pattern[0]
            if component_no == 2:
                side_lookup[(int(beam_index), component_no)] = "I"
            elif component_no in (3, 4, 5):
                side_lookup[(int(beam_index), component_no)] = "J"
            else:
                raise ValueError(f"Unsupported singleton hinge component pattern for beam {beam_index}: {component_pattern}")
            continue

        resolved_sides = []
        for component_no in component_pattern:
            side = HINGE_COMPONENT_TO_SIDE.get(component_no)
            if side is None:
                raise ValueError(f"Unsupported hinge Component No. value in beam {beam_index}: {component_no}")
            side_lookup[(int(beam_index), component_no)] = side
            resolved_sides.append(side)

        if len(set(resolved_sides)) != len(component_pattern):
            raise ValueError(f"Ambiguous multi-component hinge pattern for beam {beam_index}: " f"{component_pattern} resolves to sides {tuple(resolved_sides)}")

    return side_lookup


def process_hinge_data(files_config, simulation_output_dir, beam_index_by_group2_element_id, *, args):
    """
    Process non-time-series hinge data and write hinge_data.bld.

    Workflow:
    1. Load hinge_data.csv.
    2. Normalise and validate the DataFrame.
    3. Filter to Group ID == 2 and Performance Level == 1.
    4. Map each row to a beam index via beam_index_by_group2_element_id.
    5. Resolve end sides (I/J) using build_hinge_side_lookup_by_beam.
    6. Accumulate one record per beam, storing Max/Min M3 and R3 for each end.
    7. Encode and write hinge_data.bld.

    Parameters
    ----------
    files_config : dict
        Simulation file-path dict; the ``"hinge"`` key must point to
        ``hinge_data.csv``.
    simulation_output_dir : str
        Directory to write ``hinge_data.bld`` into.
    beam_index_by_group2_element_id : dict[int, int]
        ``{element_id: beam_index}`` for Group ID 2 beams, returned by
        ``processor_building.process_beam_data()``.
    """
    print("\n--- Processing Hinge Data ---")
    hinge_file = files_config.get("hinge")
    if not hinge_file or not os.path.exists(hinge_file):
        print("Hinge data file not found, skipping.")
        return

    df_hinge = load_hinge_dataframe(hinge_file)
    if df_hinge is None:
        return

    normalized = normalize_hinge_dataframe(df_hinge, hinge_file)
    if normalized is None:
        return

    unique_group_ids = sorted(normalized["Group ID"].dropna().astype(int).unique().tolist())
    if unique_group_ids != [2]:
        raise ValueError(f"Expected hinge Group ID to be [2], got {unique_group_ids}")

    source_row_count = int(len(normalized))
    normalized = normalized.loc[normalized["Performance Level"] == 1].copy()
    if normalized.empty:
        print("⚠ No hinge rows remain after filtering Performance Level == 1; skipping.")
        return

    unsupported_steps = sorted(set(normalized["Step Type"].unique().tolist()) - {"Max", "Min"})
    if unsupported_steps:
        raise ValueError(f"Unsupported Step Type values in hinge data: {unsupported_steps}")

    normalized["beamIndex"] = normalized["Element ID"].map(beam_index_by_group2_element_id)
    missing_beam_rows = normalized["beamIndex"].isna()
    missing_beam_count = int(missing_beam_rows.sum())
    if missing_beam_count > 0:
        sample_ids = normalized.loc[missing_beam_rows, "Element ID"].dropna().astype(int).unique().tolist()[:10]
        raise ValueError(f"{missing_beam_count} hinge row(s) could not map to beam_data.bld rows. " f"Sample Element IDs: {sample_ids}")
    normalized["beamIndex"] = normalized["beamIndex"].round().astype(np.int32)

    hinge_side_lookup = build_hinge_side_lookup_by_beam(normalized)
    normalized["hingeSide"] = [
        hinge_side_lookup.get((int(beam_index), int(component_no))) for beam_index, component_no in zip(normalized["beamIndex"].tolist(), normalized["Component No."].tolist(), strict=False)
    ]
    invalid_component_rows = normalized["hingeSide"].isna()
    if bool(invalid_component_rows.any()):
        sample_pairs = normalized.loc[invalid_component_rows, ["beamIndex", "Component No."]].drop_duplicates().head(10).to_dict("records")
        raise ValueError(f"Unsupported hinge beam/component combinations: {sample_pairs}")

    duplicate_same_side = int(normalized.duplicated(subset=["beamIndex", "Step Type", "hingeSide"]).sum())
    if duplicate_same_side > 0:
        raise ValueError(f"Hinge data has {duplicate_same_side} duplicate row(s) for the same " f"(beamIndex, Step Type, hingeSide) after PL=1 filtering")

    records_by_beam = {}

    def init_record(beam_index):
        return {
            "beamIndex": int(beam_index),
            "endMask": 0,
            "iM3Max": np.float32(np.nan),
            "iM3Min": np.float32(np.nan),
            "iR3Max": np.float32(np.nan),
            "iR3Min": np.float32(np.nan),
            "iMaxPosDcrMax": np.float32(np.nan),
            "iMaxPosDcrMin": np.float32(np.nan),
            "iMaxNegDcrMax": np.float32(np.nan),
            "iMaxNegDcrMin": np.float32(np.nan),
            "jM3Max": np.float32(np.nan),
            "jM3Min": np.float32(np.nan),
            "jR3Max": np.float32(np.nan),
            "jR3Min": np.float32(np.nan),
            "jMaxPosDcrMax": np.float32(np.nan),
            "jMaxPosDcrMin": np.float32(np.nan),
            "jMaxNegDcrMax": np.float32(np.nan),
            "jMaxNegDcrMin": np.float32(np.nan),
        }

    target_fields = {
        ("I", "Max"): ("iM3Max", "iR3Max", "iMaxPosDcrMax", "iMaxNegDcrMax"),
        ("I", "Min"): ("iM3Min", "iR3Min", "iMaxPosDcrMin", "iMaxNegDcrMin"),
        ("J", "Max"): ("jM3Max", "jR3Max", "jMaxPosDcrMax", "jMaxNegDcrMax"),
        ("J", "Min"): ("jM3Min", "jR3Min", "jMaxPosDcrMin", "jMaxNegDcrMin"),
    }

    ordered = normalized.sort_values(["beamIndex", "Step Type", "hingeSide"], kind="stable")
    for _, row in ordered.iterrows():
        beam_index = int(row["beamIndex"])
        side = str(row["hingeSide"])
        step_type = str(row["Step Type"])

        record = records_by_beam.get(beam_index)
        if record is None:
            record = init_record(beam_index)
            records_by_beam[beam_index] = record

        if side == "I":
            record["endMask"] |= 0b01
        elif side == "J":
            record["endMask"] |= 0b10
        else:
            raise ValueError(f"Unexpected hinge side value: {side}")

        m3_field, r3_field, pos_field, neg_field = target_fields[(side, step_type)]
        record[m3_field] = np.float32(row["M3"])
        record[r3_field] = np.float32(row["R3"])
        record[pos_field] = np.float32(row["Max Pos Deform DCRatio"])
        record[neg_field] = np.float32(row["Max Neg Deform DCRatio"])

    sorted_beam_indices = sorted(records_by_beam.keys())
    row_count = len(sorted_beam_indices)
    fields = [
        "beamIndex",
        "endMask",
        "iM3Max",
        "iM3Min",
        "iR3Max",
        "iR3Min",
        # "iMaxPosDcrMax",
        # "iMaxPosDcrMin",
        # "iMaxNegDcrMax",
        # "iMaxNegDcrMin",
        "jM3Max",
        "jM3Min",
        "jR3Max",
        "jR3Min",
        # "jMaxPosDcrMax",
        # "jMaxPosDcrMin",
        # "jMaxNegDcrMax",
        # "jMaxNegDcrMin",
    ]
    stride = len(fields)

    encoded = np.full((row_count, stride), np.nan, dtype=np.float32)
    for row_idx, beam_index in enumerate(sorted_beam_indices):
        record = records_by_beam[beam_index]
        encoded[row_idx, :] = np.array([record[field] for field in fields], dtype=np.float32)

    header = {
        "count_rows": row_count,
        "stride": stride,
        "fields": fields,
    }

    write_bld_file("hinge_data.bld", header, encoded.flatten().tobytes(), simulation_output_dir, args.dryrun)
