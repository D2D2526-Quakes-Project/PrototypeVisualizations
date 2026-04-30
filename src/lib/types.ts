// ------------------------ JSON INDEX -----------------------------

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
  /** Path to beam connectivity data file (relative to /data/{folder}/) or full URL (http/https) */
  beamData?: string;
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

// ------------------------ FILE METADATA -----------------------------

export const CornerOrder = ["NW", "NE", "SW", "SE"] as const;

export interface BuildingMetadata {
  count_nodes: number;
  stories: Record<string, number[]>; // Map "15" -> [nodeIndex, nodeIndex...]
  corners: Record<string, number[]>; // Map "NW" -> [nodeIndex, nodeIndex...]
  /** Height of each story (story id -> height in inches) */
  story_heights: Record<string, number>; // Map "15" -> 156.0
  story_order: string[]; // Story order from bottom up
  /** Node-to-below mapping for ISD calculation: nodeIdx -> belowNodeIdx (-1 for ground or no match) */
  node_to_below: number[];
  /** Grouped nodes sharing an X-coordinate plane */
  cross_sections_x: Record<string, number[]>;
  /** Grouped nodes sharing a Y-coordinate plane */
  cross_sections_y: Record<string, number[]>;
  /** Floors that should be hidden by default */
  hidden_floors?: string[];
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

export interface BeamDataMetadata {
  count_rows: number;
  stride: number;
  groupNames: string[];
}

export interface HingeMetadata {
  count_rows: number;
  stride: number;
  fields: string[];
}

// -------------------------------- Animation Data ------------------------------

export interface AnimationMetadata {
  nodeCount: number;
  frameCount: number;
  dt: number; // Time step (usually 0.01)
  /** Height of each story (not elevation) (story id -> height in inches) */
  storyHeights: Record<string, number>;
  // Map from story id to a list of indices
  stories: Record<string, number[]>;
  corners: Record<string, number[]>;
  // Map from storyId to node index
  cornerNodes: Record<string, { NW: number; NE: number; SW: number; SE: number }>;
  // List of storyIds
  storyOrder: string[];
  /** Node-to-below mapping for ISD calculation: nodeIdx -> belowNodeIdx (-1 for ground or no match) */
  nodeToBelow: number[];
  /** Cross-section along X axis */
  crossSectionsX: Record<string, number[]>;
  /** Cross-section along Y axis */
  crossSectionsY: Record<string, number[]>;
  /** Floors that should be hidden by default */
  hiddenFloors?: string[];
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
   * Beam/member connectivity (building-level static topology).
   * Layout per row: [iNodeIndex, jNodeIndex, groupId]
   */
  beamData?: BeamDataAccessor;

  /**
   * Hinge Data (non-time-series), paired by beam/member.
   * Layout per row:
   * [beamIndex, endMask, iM3Max, iM3Min, iR3Max, iR3Min, jM3Max, jM3Min, jR3Max, jR3Min]
   */
  hingeData?: HingeDataAccessor;

  /**
   * Story Drift Data.
   * Layout: Frame -> Node -> [d]
   * Size: frameCount * nodeCount * 1
   * Units: Percent
   */
  storyDrift: NodeValueTimeAccessor;
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

export interface NodeValueTimeAccessor {
  data: Float32Array;
  frameCount: number;
  nodeCount: number;
  get: (frameIdx: number, nodeIdx: number) => number;
}

export interface BeamRow {
  iNodeIndex: number;
  jNodeIndex: number;
  groupId: number;
}

export interface BeamDataAccessor {
  data: Float32Array;
  stride: number;
  count: number;
  metadata: BeamDataMetadata;
  at: (idx: number) => Float32Array;
  getRow: (idx: number) => BeamRow;
}

export interface HingeRow {
  beamIndex: number;
  endMask: 0 | 1 | 2 | 3;
  iM3Max: number;
  iM3Min: number;
  iR3Max: number;
  iR3Min: number;
  jM3Max: number;
  jM3Min: number;
  jR3Max: number;
  jR3Min: number;
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
    span: [number, number, number];
    center: [number, number, number];
    radius: number; // Radius of bounding sphere (for camera zoom)
  };

  // STRUCTURAL
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
  maxStoryDrift: number; // Max interstory drift across all nodes/frames (%)

  // GROUND MOTION
  groundMotion: {
    min: [number, number, number];
    max: [number, number, number];
    magnitude: Float32Array;
    maxMagnitude: number;
    minMagnitude: number;
  };

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
  /** For each node, the peak story drift */
  peakStoryDrift: Float32Array;
  /** Frame index where each node reached peak displacement */
  peakStoryDriftFrame: Float32Array;

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

  // HINGE SUMMARY (if hinge data exists)
  hinge?: HingeComputedStats;
  hingeNodeMetrics?: HingeNodeMetrics;

  // CROSS-SECTIONS
  numCrossSectionsX: number;
  numCrossSectionsY: number;
}

export interface HingeNodeMetrics {
  maxRotationByNode: Float32Array;
  minRotationByNode: Float32Array;
  hingeEndCountByNode: Uint32Array;
  nodesWithHinges: number;
  maxRotationAbsMax: number;
  minRotationAbsMax: number;
}

export interface HingeComputedStats {
  counts: {
    source_rows: number;
    rows_performance_level_1: number;
    rows_paired: number;
    beams: number;
    beams_with_i: number;
    beams_with_j: number;
    step_types: Record<string, number>;
    component_numbers: Record<string, number>;
    sides: Record<string, number>;
  };
  metrics: {
    m3: { max: HingeMetricSummary; min: HingeMetricSummary };
    r3: { max: HingeMetricSummary; min: HingeMetricSummary };
  };
}

interface HingeMetricSummary {
  count: number;
  min: number | null;
  max: number | null;
}
