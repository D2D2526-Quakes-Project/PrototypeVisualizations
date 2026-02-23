/**
 * =============================================================================
 * ALL VALUES DEFINITION
 * =============================================================================
 *
 * Throughout this application, "all values" refers to the complete set of
 * simulation data available for analysis and visualization. These include:
 *
 * PRIMARY VALUES (from simulation data files):
 * - Displacement (linear): X, Y, Z components and magnitude - Units: inches
 * - Displacement (rotation): RX, RY, RZ components and magnitude - Units: radians
 * - Velocity (linear): X, Y, Z components and magnitude - Units: inches/second
 * - Velocity (rotation): RX, RY, RZ components and magnitude - Units: radians/second
 * - Acceleration (linear): X, Y, Z components and magnitude - Units: inches/second²
 * - Acceleration (rotation): RX, RY, RZ components and magnitude - Units: radians/second²
 *
 * DERIVED VALUES (computed from primary values):
 * - Interstory Drift (ISD): Per-story drift ratio for each corner (NW, NE, SW, SE)
 *   - Units: percentage (drift/height * 100)
 *   - Computed as relative displacement between adjacent floors
 * - ISD Ratio: Current drift / Peak drift for each corner
 *   - Unitless ratio, useful for threshold-based visualization
 *
 * GROUND MOTION:
 * - X, Y, Z components and magnitude - Units: inches
 * - Represents the input earthquake motion at the base
 *
 * When implementing features that show "all values", consider all of the above
 * metrics unless explicitly stated otherwise.
 * =============================================================================
 */

export type BuildingIndex = {
  size: number;
  buildings: Building[];
};

type BaseBuilding = {
  name: string;
  folder: string;
  size: number;
};

export type BinaryBuilding = BaseBuilding & {
  name: string;
  folder: string;
  size: number;
  /** Path to building data file (relative to /data/{folder}/) or full URL (http/https) */
  building_data: string;
  building_data_size: number;
  simulations: BinarySimulation[];
};

export type Building = BinaryBuilding;

type BaseSimulation = {
  name: string;
  folder: string;
  size: number;
};

export type BinarySimulation = BaseSimulation & {
  /** Path to displacement linear file (relative to /data/{folder}/{simulation.folder}/) or full URL (http/https) */
  displacementLin: string;
  /** Path to displacement rotation file (relative to /data/{folder}/{simulation.folder}/) or full URL (http/https) */
  displacementRot?: string;
  /** Path to velocity linear file (relative to /data/{folder}/{simulation.folder}/) or full URL (http/https) */
  velocityLin?: string;
  /** Path to velocity rotation file (relative to /data/{folder}/{simulation.folder}/) or full URL (http/https) */
  velocityRot?: string;
  /** Path to acceleration linear file (relative to /data/{folder}/{simulation.folder}/) or full URL (http/https) */
  accelerationLin?: string;
  /** Path to acceleration rotation file (relative to /data/{folder}/{simulation.folder}/) or full URL (http/https) */
  accelerationRot?: string;
  /** Path to ground motion file (relative to /data/{folder}/{simulation.folder}/) or full URL (http/https) */
  groundMotion: string;
  /** Path to hinge data file (relative to /data/{folder}/{simulation.folder}/) or full URL (http/https) */
  hingeData?: string;
};

export type Simulation = BinarySimulation;

// -----------------------------------------------------------------------------

export const CornerOrder = ["NW", "NE", "SW", "SE"] as const;

export interface BuildingMetadata {
  count_nodes: number;
  stories: Record<string, number[]>; // Map "15" -> [nodeIndex, nodeIndex...]
  corners: Record<string, number[]>; // Map "NW" -> [nodeIndex, nodeIndex...]
  /** Height of each story (story id -> height in inches) */
  story_heights: Record<string, number>; // Map "15" -> 156.0
  story_order: string[]; // Story order from bottom up
}

export interface SimulationMetadata {
  type: "displacement" | "velocity" | "acceleration";
  count_frames: number;
  count_nodes: number;
  dt: number;
}

export interface GroundMotionMetadata {
  count_frames: number;
  dt: number;
}

export interface HingeMetricSummary {
  count: number;
  min: number | null;
  max: number | null;
  mean: number | null;
  std: number | null;
  p50: number | null;
  p95: number | null;
  p99: number | null;
  histogram: {
    bin_edges: number[];
    counts: number[];
  };
}

export interface HingeSummary {
  counts: {
    rows: number;
    elements: number;
    element_components: number;
    step_types: Record<string, number>;
    performance_levels: Record<string, number>;
    step_type_by_performance_level: Record<string, Record<string, number>>;
  };
  null_counts: {
    m3: number;
    r3: number;
    max_pos_deform_dc_ratio: number;
    max_neg_deform_dc_ratio: number;
  };
  metrics: {
    m3: HingeMetricSummary;
    r3: HingeMetricSummary;
    max_pos_deform_dc_ratio: HingeMetricSummary;
    max_neg_deform_dc_ratio: HingeMetricSummary;
  };
}

export interface HingeMetadata {
  type: "hinge_data";
  version: number;
  count_rows: number;
  stride: number;
  fields: string[];
  step_types: string[];
  component_types: string[];
  component_names: string[];
  load_cases: string[];
  source_file?: string;
  source_format?: string;
  summary?: HingeSummary;
}

export interface AnimationMetadata {
  nodeCount: number;
  frameCount: number;
  dt: number; // Time step (usually 0.01)
  /** Height of each story (story id -> height in inches) */
  storyHeights: Record<string, number>;
  // Map from story id to a list of indices
  stories: Record<string, number[]>;
  corners: Record<string, number[]>;
  storyOrder: string[];
}

export interface BuildingAnimationData {
  // Metadata for UI and logic
  metadata: AnimationMetadata;

  // Precomputed stats for UI
  precomputed: ComputedStats;

  // The Heavy Data (Views on ArrayBuffers)

  /**
   * Static Node Positions (Rest State).
   * Layout: [x, y, z, x, y, z, ...]
   * Size: nodeCount * 3
   * Units: Inches
   */
  initialPositions: IndexAccessor;

  /**
   * Linear Displacement Data.
   * Layout: Frame -> Node -> [x, y, z]
   * Access: (frameIndex * nodeCount * 3) + (nodeIndex * 3) + componentIndex
   * Units: Inches
   */
  displacementLin: TimeIndexAccessor;

  /**
   * Rotational Displacement Data.
   * Layout: Frame -> Node -> [rx, ry, rz]
   * Units: Radians
   */
  displacementRot?: TimeIndexAccessor;

  /**
   * Linear Velocity Data.
   * Layout: Frame -> Node -> [x, y, z]
   * Units: Inches/s
   */
  velocityLin?: TimeIndexAccessor;

  /**
   * Rotational Velocity Data.
   * Layout: Frame -> Node -> [rx, ry, rz]
   * Units: Radians/s
   */
  velocityRot?: TimeIndexAccessor;

  /**
   * Linear Acceleration Data.
   * Layout: Frame -> Node -> [x, y, z]
   * Units: Inches/s²
   */
  accelerationLin?: TimeIndexAccessor;

  /**
   * Rotational Acceleration Data.
   * Layout: Frame -> Node -> [rx, ry, rz]
   * Units: Radians/s²
   */
  accelerationRot?: TimeIndexAccessor;

  /**
   * Ground Motion Data.
   * Layout: Frame -> [x, y, z]
   * Size: frameCount * 3
   * Units: Inches
   */
  groundMotion: IndexAccessor;

  /**
   * Hinge Data (non-time-series).
   * Layout per row:
   * [groupId, elementId, componentNo, stepTypeIndex, performanceLevel,
   *  m3, r3, maxPosDeformDCRatio, maxNegDeformDCRatio,
   *  componentTypeIndex, componentNameIndex, loadCaseIndex]
   */
  hingeData?: HingeDataAccessor;
}

export interface IndexAccessor {
  data: Float32Array;
  stride: number;
  at: (idx: number) => Float32Array;
  xAt: (idx: number) => number;
  yAt: (idx: number) => number;
  zAt: (idx: number) => number;
}

export interface TimeIndexAccessor {
  data: Float32Array;
  stride: number;
  atFrame: (idx: number) => IndexAccessor;
}

export interface HingeRow {
  groupId: number;
  elementId: number;
  componentNo: number;
  stepTypeIndex: number;
  performanceLevel: number;
  m3: number;
  r3: number;
  maxPosDeformDCRatio: number;
  maxNegDeformDCRatio: number;
  componentTypeIndex: number;
  componentNameIndex: number;
  loadCaseIndex: number;
}

export interface HingeDataAccessor {
  data: Float32Array;
  stride: number;
  count: number;
  metadata: HingeMetadata;
  at: (idx: number) => Float32Array;
  getRow: (idx: number) => HingeRow;
}

export interface ComputedStats {
  // GEOMETRY
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
    center: [number, number, number];
    radius: number; // Radius of bounding sphere (for camera zoom)
  };

  // STRUCTURAL
  /** Height of each story (story id -> height in inches) */
  storyHeights: Record<string, number>; // "15": 156.0 (inches)
  /** Elevation of each story from ground (story id -> elevation in inches) */
  storyElevations: Record<string, number>; // "15": 7194.0 (inches, cumulative from ground)

  // SIMULATION SCALARS
  maxDisplacement: number; // Max absolute displacement (inches)
  maxDisplacementX: number; // Max X component
  maxDisplacementY: number; // Max Y component
  maxDisplacementZ: number; // Max Z component

  maxVelocity?: number; // Max velocity magnitude
  maxVelocityX?: number; // Max velocity X component
  maxVelocityY?: number; // Max velocity Y component
  maxVelocityZ?: number; // Max velocity Z component

  maxAcceleration?: number; // Max acceleration magnitude
  maxAccelerationX?: number; // Max acceleration X component
  maxAccelerationY?: number; // Max acceleration Y component
  maxAccelerationZ?: number; // Max acceleration Z component

  // ROTATION VALUES (if displacementRot data exists)
  maxRotation?: number; // Max rotation magnitude (radians)
  maxRotationX?: number; // Max rotation about X
  maxRotationY?: number; // Max rotation about Y
  maxRotationZ?: number; // Max rotation about Z

  // ROTATION VELOCITY VALUES (if velocityRot data exists)
  maxRotationVelocity?: number; // Max rotation velocity magnitude
  maxRotationVelocityX?: number;
  maxRotationVelocityY?: number;
  maxRotationVelocityZ?: number;

  // ROTATION ACCELERATION VALUES (if accelerationRot data exists)
  maxRotationAcceleration?: number; // Max rotation acceleration magnitude
  maxRotationAccelerationX?: number;
  maxRotationAccelerationY?: number;
  maxRotationAccelerationZ?: number;

  // STORY DRIFT
  maxStoryDrift: number; // Max interstory drift across all stories/frames (%)
  avgStoryDrift: number; // Average interstory drift across all stories/frames (%)

  // GROUND MOTION
  groundMotion: {
    min: [number, number, number];
    max: [number, number, number];
    magnitude: Float32Array;
    maxMagnitude: number;
    minMagnitude: number;
  };

  // STORY DRIFT DATA
  cornerNodes: Record<string, { NW: number; NE: number; SW: number; SE: number }>; // Story ID -> corner node indices
  storyDrift: {
    // Layout: [story][frame][corner] where corners are ordered NW, NE, SW, SE
    data: Float32Array;
    storyCount: number;
    frameCount: number;
    cornerCount: number; // Always 4
    getStoryDrift: (storyIndex: number, frameIndex: number) => [number, number, number, number]; // [NW, NE, SW, SE]
  };
  peakStoryDrift: Record<string, { NW: number; NE: number; SW: number; SE: number }>; // Precomputed max values

  // PEAK NODE VALUES (precomputed for all nodes)
  /** Peak displacement magnitude for each node across all frames */
  peakNodeDisplacement: Float32Array;
  /** Peak velocity magnitude for each node (if velocity data available) */
  peakNodeVelocity?: Float32Array;
  /** Peak acceleration magnitude for each node (if acceleration data available) */
  peakNodeAcceleration?: Float32Array;
  /** Frame index where each node reached peak displacement */
  peakNodeDisplacementFrame: Uint32Array;
  /** For each node, the X component of peak displacement */
  peakNodeDisplacementX: Float32Array;
  /** For each node, the Y component of peak displacement */
  peakNodeDisplacementY: Float32Array;
  /** For each node, the Z component of peak displacement */
  peakNodeDisplacementZ: Float32Array;

  // PER-FRAME AGGREGATES (arrays of length frameCount)
  /** Average displacement per frame across all nodes */
  avgDisplacementPerFrame: {
    x: Float32Array;
    y: Float32Array;
    z: Float32Array;
    mag: Float32Array;
  };
  /** Average velocity per frame (if velocity data available) */
  avgVelocityPerFrame?: {
    x: Float32Array;
    y: Float32Array;
    z: Float32Array;
    mag: Float32Array;
  };
  /** Average acceleration per frame (if acceleration data available) */
  avgAccelerationPerFrame?: {
    x: Float32Array;
    y: Float32Array;
    z: Float32Array;
    mag: Float32Array;
  };

  // PER-STORY AGGREGATES
  /** Average displacement per story (array indexed by storyIndex * frameCount + frameIndex) */
  avgDisplacementPerStory: Float32Array;
  /** Average velocity per story (optional) */
  avgVelocityPerStory?: Float32Array;
  /** Average acceleration per story (optional) */
  avgAccelerationPerStory?: Float32Array;

  // PERCENTILES
  /** 90th percentile velocity across all nodes/frames */
  velocityPercentile90?: number;

  // HINGE SUMMARY (if hinge data exists)
  hinge?: HingeSummary;
}
