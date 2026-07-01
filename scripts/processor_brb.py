"""
processor_brb.py
================
Processor for non-time-series Buckling Restrained Brace (BRB) demand data.

This module reads BRB_data.csv from a simulation's "BRB/" folder, cross-
references each element against the building's beam connectivity and BRB
property deformation capacities, computes demand ratios, and writes a compact
binary table to brb_data.bld.

Public functions
----------------
load_brb_properties(building)
    Load BRB_properties.csv for a building and return a dict keyed by
    property name.

process_brb_data(files_config, simulation_output_dir, beam_lookup, brb_properties)
    Main entry point.  Loads, validates, resolves, and writes BRB data.

Required input files
--------------------
BRB/BRB_data.csv  (per simulation)
    Required columns (see config.BRB_REQUIRED_COLUMNS):
        Group ID, Element ID, Step Type, Component Type,
        Axial Force, Axial Deformation

    Only rows where Component Type == "Buckling Restrained Brace" are kept.
    Only Step Type values "Max" and "Min" are supported.

<building_folder>/BRB_properties.csv  (per building)
    Required columns (see config.BRB_PROPERTIES_REQUIRED_COLUMNS):
        Name, Tension Dy (in), Compression Dy (in)

    "Name" must match the "Property Name" stored in beam_data.csv for BRB
    elements.  This is the cross-reference used to look up yield deformation.

Output file
-----------
<simulation_output_dir>/brb_data.bld
    Header:
        count_rows : int   — number of BRB beam records written
        stride     : int   — 8 (number of float32 values per row)
        fields     : list  — field names in binary order
        units      : dict  — unit labels per field group

    Binary body:
        float32 rows, one per BRB element that appears in BRB_data.csv.
        Fields (stride = 8):
            beamIndex, axialForceMax, axialForceMin,
            axialDeformationMax, axialDeformationMin,
            tensionRatio, compressionRatio, ratioAbs

        Ratios are computed as:
            tensionRatio     = (axialDeformationMax / Tension Dy)    × 100
            compressionRatio = (axialDeformationMin / Compression Dy) × 100
            ratioAbs         = max(|tensionRatio|, |compressionRatio|)

Dependency
----------
Requires beam_data.csv to have been processed by
processor_building.process_beam_data().  The ``beam_lookup`` argument
(by_group_id_element_id) is the second lookup map returned by that function.
"""

import os
from typing import cast

import numpy as np
import pandas as pd

from .shared import BRB_REQUIRED_COLUMNS, BRB_NUMERIC_COLUMNS, BRB_PROPERTIES_REQUIRED_COLUMNS, CSV_DIR, BuildingInfo, SimulationFilesConfig, write_bld_file, Args


def load_brb_properties(building: BuildingInfo) -> dict[str, dict[str, float]] | None:
    """
    Load BRB_properties.csv for a building.

    Reads the building-level BRB property file, validates required columns,
    drops invalid rows, and returns a dict mapping property name to yield
    deformation capacities.

    Parameters
    ----------
    building : dict
        Building metadata dict with at least a ``"folder"`` key.

    Returns
    -------
    dict or None
        ``{property_name: {"tensionDy": float, "compressionDy": float}}``
        Returns None when the file is absent (BRB processing will be skipped).

    Raises
    ------
    ValueError
        When required columns are missing or when duplicate Name rows exist.

    Required CSV columns
    --------------------
    BRB_properties.csv: Name, Tension Dy (in), Compression Dy (in)
    """
    building_path = os.path.join(CSV_DIR, building["folder"])
    properties_file = os.path.join(building_path, "BRB_properties.csv")
    if not os.path.exists(properties_file):
        print(f"BRB properties file not found, skipping BRB data: {properties_file}")
        return None

    df_props = pd.read_csv(properties_file)
    df_props.columns = [str(c).strip() for c in df_props.columns]
    missing_columns = [column for column in BRB_PROPERTIES_REQUIRED_COLUMNS if column not in df_props.columns]
    if missing_columns:
        raise ValueError(f"BRB_properties.csv missing required columns: {missing_columns}")

    df_props = df_props[BRB_PROPERTIES_REQUIRED_COLUMNS].copy()
    df_props["Name"] = df_props["Name"].fillna("").astype(str).str.strip()
    for column in ["Tension Dy (in)", "Compression Dy (in)"]:
        df_props[column] = pd.to_numeric(df_props[column], errors="coerce")

    invalid_rows = df_props["Name"].eq("") | df_props[["Tension Dy (in)", "Compression Dy (in)"]].isna().any(axis=1)
    invalid_count = int(invalid_rows.sum())
    if invalid_count > 0:
        print(f"⚠ Dropping {invalid_count} invalid BRB property row(s)")
        df_props = df_props.loc[~invalid_rows].copy()

    duplicate_count = int(df_props.duplicated(subset=["Name"]).sum())
    if duplicate_count > 0:
        raise ValueError(f"BRB_properties.csv has {duplicate_count} duplicate Name row(s)")

    return {
        str(row["Name"]): {
            "tensionDy": float(row["Tension Dy (in)"]),
            "compressionDy": float(row["Compression Dy (in)"]),
        }
        for _, row in df_props.iterrows()
    }


def process_brb_data(
    files_config: SimulationFilesConfig, simulation_output_dir: str, beam_lookup: dict[tuple[int, int], dict[str, object]], brb_properties: dict[str, dict[str, float]] | None, *, args: Args
):
    """
    Process BRB demand data and write brb_data.bld.

    Workflow:
    1. Read BRB_data.csv.
    2. Validate required columns and drop invalid/unsupported rows.
    3. Filter to Component Type == "Buckling Restrained Brace".
    4. Map each element to a beam index via beam_lookup.
    5. Look up yield deformation capacities from brb_properties.
    6. Compute tension/compression demand ratios (%).
    7. Derive ratioAbs = max of absolute tension and compression ratios.
    8. Encode and write brb_data.bld.

    Parameters
    ----------
    files_config : dict
        Simulation file-path dict; the ``"brb"`` key must point to
        ``BRB/BRB_data.csv``.
    simulation_output_dir : str
        Directory to write ``brb_data.bld`` into.
    beam_lookup : dict
        ``{(group_id, element_id): {"beamIndex": int, "propertyName": str,
        "groupId": int}}`` returned by
        ``processor_building.process_beam_data()`` as
        ``"by_group_id_element_id"``.
    brb_properties : dict or None
        Property-name → yield deformation dict from ``load_brb_properties()``.
        If None, processing is skipped.
    """
    print("\n--- Processing BRB Data ---")
    brb_file = files_config.get("brb")
    if not brb_file or not os.path.exists(brb_file):
        print("BRB data file not found, skipping.")
        return
    if not beam_lookup:
        print("BRB data requires beam_data.csv, skipping.")
        return
    if not brb_properties:
        print("BRB data requires BRB_properties.csv, skipping.")
        return

    df_brb = pd.read_csv(brb_file)
    df_brb.columns = [str(c).strip() for c in df_brb.columns]

    missing_columns = [column for column in BRB_REQUIRED_COLUMNS if column not in df_brb.columns]
    if missing_columns:
        raise ValueError(f"BRB data file missing required columns: {missing_columns}")

    normalized = df_brb[BRB_REQUIRED_COLUMNS].copy()
    normalized["Group ID"] = normalized["Group ID"].fillna("").astype(str).str.strip()
    normalized["Step Type"] = normalized["Step Type"].fillna("").astype(str).str.strip()
    normalized["Component Type"] = normalized["Component Type"].fillna("").astype(str).str.strip()
    for column in BRB_NUMERIC_COLUMNS:
        normalized[column] = pd.to_numeric(normalized[column], errors="coerce")

    invalid_rows = normalized["Step Type"].eq("") | normalized[BRB_NUMERIC_COLUMNS].isna().any(axis=1)
    invalid_count = int(invalid_rows.sum())
    if invalid_count > 0:
        print(f"⚠ Dropping {invalid_count} invalid BRB row(s) from: {brb_file}")
        normalized = normalized.loc[~invalid_rows].copy()

    normalized = normalized.loc[normalized["Component Type"] == "Buckling Restrained Brace"].copy()
    if normalized.empty:
        print("⚠ No Buckling Restrained Brace rows found; skipping BRB data.")
        return

    unsupported_steps = sorted(set(normalized["Step Type"].unique().tolist()) - {"Max", "Min"})
    if unsupported_steps:
        raise ValueError(f"Unsupported Step Type values in BRB data: {unsupported_steps}")

    normalized["Element ID"] = normalized["Element ID"].round().astype(np.int32)

    duplicate_count = int(normalized.duplicated(subset=["Group ID", "Element ID", "Step Type"]).sum())
    if duplicate_count > 0:
        raise ValueError(f"BRB data has {duplicate_count} duplicate row(s) for the same " + f"(Group ID, Element ID, Step Type)")

    records_by_beam: dict[int, dict[str, int | np.float32]] = {}
    missing_beams: list[tuple[int, int]] = []
    missing_properties: list[str] = []

    for _, row in normalized.sort_values(["Group ID", "Element ID", "Step Type"], kind="stable").iterrows():
        group_id = int(row["Group ID"])
        element_id = int(row["Element ID"])
        step_type = str(row["Step Type"])
        beam_info = beam_lookup.get((group_id, element_id))
        if beam_info is None:
            missing_beams.append((group_id, element_id))
            continue

        property_name = str(beam_info.get("propertyName", ""))
        property_info = brb_properties.get(property_name)
        if property_info is None:
            missing_properties.append(property_name)
            continue

        beam_index = cast("int", beam_info["beamIndex"])
        record = records_by_beam.get(beam_index)
        if record is None:
            record = {
                "beamIndex": beam_index,
                "axialForceMax": np.float32(np.nan),
                "axialForceMin": np.float32(np.nan),
                "axialDeformationMax": np.float32(np.nan),
                "axialDeformationMin": np.float32(np.nan),
                "tensionRatio": np.float32(np.nan),
                "compressionRatio": np.float32(np.nan),
                "ratioAbs": np.float32(np.nan),
            }
            records_by_beam[beam_index] = record

        axial_force = float(row["Axial Force"])
        axial_deformation = float(row["Axial Deformation"])
        if step_type == "Max":
            tension_dy = float(property_info["tensionDy"])
            if tension_dy == 0:
                raise ValueError(f"BRB property {property_name} has zero Tension Dy")
            record["axialForceMax"] = np.float32(axial_force)
            record["axialDeformationMax"] = np.float32(axial_deformation)
            record["tensionRatio"] = np.float32(axial_deformation / tension_dy) * 100.0
        elif step_type == "Min":
            compression_dy = float(property_info["compressionDy"])
            if compression_dy == 0:
                raise ValueError(f"BRB property {property_name} has zero Compression Dy")
            record["axialForceMin"] = np.float32(axial_force)
            record["axialDeformationMin"] = np.float32(axial_deformation)
            record["compressionRatio"] = np.float32(axial_deformation / compression_dy) * 100.0

    if missing_beams:
        unique_missing = sorted(set(missing_beams))[:10]
        raise ValueError(f"{len(missing_beams)} BRB row(s) could not map to beam_data.csv rows. " + f"Sample: {unique_missing}")
    if missing_properties:
        unique_missing = sorted({name for name in missing_properties if name})[:10]
        raise ValueError(f"{len(missing_properties)} BRB row(s) could not map to BRB_properties.csv rows. " + f"Sample: {unique_missing}")

    if not records_by_beam:
        print("⚠ No BRB records were mapped; skipping.")
        return

    # Compute ratioAbs = max of |tensionRatio| and |compressionRatio|
    for record in records_by_beam.values():
        ratios = [record["tensionRatio"], record["compressionRatio"]]
        finite_ratios = [float(ratio) for ratio in ratios if np.isfinite(ratio)]
        if finite_ratios:
            record["ratioAbs"] = np.float32(max(abs(value) for value in finite_ratios))

    fields = [
        "beamIndex",
        "axialForceMax",
        "axialForceMin",
        "axialDeformationMax",
        "axialDeformationMin",
        "tensionRatio",
        "compressionRatio",
        "ratioAbs",
    ]
    stride = len(fields)
    sorted_beam_indices = sorted(records_by_beam.keys())
    encoded = np.full((len(sorted_beam_indices), stride), np.nan, dtype=np.float32)
    for row_idx, beam_index in enumerate(sorted_beam_indices):
        record = records_by_beam[beam_index]
        encoded[row_idx, :] = np.array([record[field] for field in fields], dtype=np.float32)

    header = {
        "count_rows": len(sorted_beam_indices),
        "stride": stride,
        "fields": fields,
        "units": {
            "axialForce": "source",
            "axialDeformation": "in",
            "ratio": "dimensionless",
        },
    }

    write_bld_file("brb_data.bld", header, encoded.flatten().tobytes(), simulation_output_dir, args.dryrun)
