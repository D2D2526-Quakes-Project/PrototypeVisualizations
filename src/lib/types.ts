export type BuildingIndex = {
  size: number;
  buildings: Building[];
};

type BaseBuilding = {
  name: string;
  folder: string;
  size: number;
};

export type CSVBuilding = BaseBuilding & {
  data_type: "csv";
  height_map: string;
  center_map: string;
  node_map: string;
  simulations: CSVSimulation[];
};

export type BinaryBuilding = BaseBuilding & {
  data_type: "binary";
  name: string;
  folder: string;
  size: number;
  building_data: string;
  building_data_size: number;
  simulations: BinarySimulation[];
};

export type Building = CSVBuilding | BinaryBuilding;

type BaseSimulation = {
  name: string;
  folder: string;
  size: number;
};

export type CSVSimulation = BaseSimulation & {
  displacementFiles: string[];
  accelerationFiles: string[];
  velocityFiles: string[];
  groundMotion: string;
};

export type BinarySimulation = BaseSimulation & {
  displacement: string;
  velocity: string;
  acceleration: string;
  groundMotion: string;
};

export type Simulation = CSVSimulation | BinarySimulation;

// -----------------------------------------------------------------------------

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
  at: (idx: number) => IndexAccessor;
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
}
