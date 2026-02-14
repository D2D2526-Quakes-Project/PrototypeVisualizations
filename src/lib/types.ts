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
  maxDisplacement: number; // Max absolute drift (inches)
  maxVelocity?: number; // Max velocity
  maxAcceleration?: number; // Max acceleration (g)

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
}
