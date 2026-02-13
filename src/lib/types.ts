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
  /** Path to displacement file (relative to /data/{folder}/{simulation.folder}/) or full URL (http/https) */
  displacement: string;
  /** Path to velocity file (relative to /data/{folder}/{simulation.folder}/) or full URL (http/https) */
  velocity?: string;
  /** Path to acceleration file (relative to /data/{folder}/{simulation.folder}/) or full URL (http/https) */
  acceleration?: string;
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
  story_heights: Record<string, number>; // Map "15" -> storyHeight
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
   * Displacement Data.
   * Layout: Frame -> Node -> [x, y, z, rx, ry, rz]
   * Access: (frameIndex * nodeCount * 6) + (nodeIndex * 6) + componentIndex
   * Units: Inches
   */
  displacement: TimeIndexAccessor;

  /**
   * Velocity Data.
   * Layout: Frame -> Node -> [x, y, z, rx, ry, rz]
   * Units: Inches
   */
  velocity?: TimeIndexAccessor;

  /**
   * Acceleration Data.
   * Layout: Frame -> Node -> [x, y, z, rx, ry, rz]
   * Units: Inches
   */
  acceleration?: TimeIndexAccessor;

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
  linAt: (idx: number) => IndexAccessor;
  rotAt: (idx: number) => IndexAccessor;
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
  storyHeights: Record<string, number>; // "15": 156.0 (inches)
  storyElevations: Record<string, number>; // "15": 7194.0

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
