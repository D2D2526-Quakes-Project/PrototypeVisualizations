export interface NodeData {
  story: string;
  corner: string;
  initial_pos: [number, number, number];
  disp_H1: number[];
  disp_H2: number[];
  disp_V: number[];
}

interface NodeCoordinates {
  [nodeId: string]: [number, number, number];
}

interface DisplacementData {
  [nodeId: string]: number[];
}

export interface ParsedDisplacementFile {
  timeSteps: number[];
  displacementData: DisplacementData;
  nodeCoords: NodeCoordinates;
}

export interface AnimationFrame {
  frame: number;
  time: number;
  nodePositions: Map<string, [number, number, number]>;
  averageDisplacement: [number, number, number];
}

export interface BuildingAnimationData {
  nodes: Map<string, NodeData>;
  timeSteps: number[];
  frames: AnimationFrame[];
  frameRate: number;
  minCoord: [number, number, number];
  maxCoord: [number, number, number];
}

type Directions = "H1" | "H2" | "V";

export class BuildingDataParser {
  private INCH_TO_METER = 0.0254;
  private minCoord: [number, number, number] = [Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE];
  private maxCoord: [number, number, number] = [Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE];

  parseNodeMapping(csvData: string): Map<string, NodeData> {
    const nodes = new Map<string, NodeData>();
    const lines = csvData.trim().split("\n");

    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const row = line.split(",").map((cell) => cell.trim());
      if (!row[0]) continue;

      const [nodeId, story, corner] = row;
      nodes.set(nodeId, {
        story,
        corner,
        initial_pos: [0, 0, 0],
        disp_H1: [],
        disp_H2: [],
        disp_V: [],
      });
    }

    return nodes;
  }

  parseDisplacementFile(fileContent: string, direction: Directions): ParsedDisplacementFile {
    const lines = fileContent.trim().split("\n");

    const colToNode: { [colIdx: number]: string } = {};
    const nodeCoords: NodeCoordinates = {};
    let dataStarted = false;
    const timeSteps: number[] = [];
    const tempNodeData: DisplacementData = {};

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Parse column header lines
      if (trimmedLine.toLowerCase().startsWith("column,")) {
        const parts = trimmedLine.split(",").map((p) => p.trim());
        try {
          const colIdx = parseInt(parts[1]);
          const nodeId = parts[3];
          const x = parseFloat(parts[5]);
          const y = parseFloat(parts[6]);
          const z = parseFloat(parts[7]);

          colToNode[colIdx] = nodeId;
          nodeCoords[nodeId] = [x, y, z];
          tempNodeData[nodeId] = [];
        } catch (e) {
          continue;
        }
      }
      // Check if data rows have started
      else if (trimmedLine[0] && (/^\d/.test(trimmedLine) || (/^\./.test(trimmedLine) && /^\d/.test(trimmedLine[1] || "")) || (/^-/.test(trimmedLine) && /^\d/.test(trimmedLine[1] || "")))) {
        dataStarted = true;
      }

      if (dataStarted) {
        // Skip summary lines
        if (trimmedLine.toLowerCase().startsWith("maximum") || trimmedLine.toLowerCase().startsWith("minimum")) {
          continue;
        }

        // Parse data values
        const values = trimmedLine
          .replace(/,/g, " ")
          .split(/\s+/)
          .filter((v) => v);
        try {
          timeSteps.push(parseFloat(values[0]));

          for (const [colIdx, nodeId] of Object.entries(colToNode)) {
            const dataIdx = parseInt(colIdx) - 1;
            if (dataIdx < values.length) {
              const dispVal = parseFloat(values[dataIdx]);
              tempNodeData[nodeId].push(dispVal);
            }
          }
        } catch (e) {
          continue;
        }
      }
    }

    return {
      timeSteps,
      displacementData: tempNodeData,
      nodeCoords,
    };
  }

  buildAnimationData(nodeMappingCsv: string, dataFiles: { [filename: string]: string }): BuildingAnimationData {
    // Parse node mapping
    const nodeData = this.parseNodeMapping(nodeMappingCsv);
    let timeSteps: number[] = [];

    // Parse displacement files
    for (const [filename, content] of Object.entries(dataFiles)) {
      const parts = filename.split("_");
      const direction = parts[1] as Directions; // H1, H2, or V

      const { timeSteps: tSteps, displacementData, nodeCoords } = this.parseDisplacementFile(content, direction);

      if (timeSteps.length === 0 && tSteps.length > 0) {
        timeSteps = tSteps;
      }

      // Merge displacement data into node data
      for (const [nodeId, displacements] of Object.entries(displacementData)) {
        const node = nodeData.get(nodeId);
        if (node) {
          // disp_H1
          // disp_H2
          // disp_V
          const key: `disp_${Directions}` = `disp_${direction}`;
          node[key] = displacements;
          node.initial_pos = nodeCoords[nodeId];
        }
      }
    }

    // Pre-calculate frame data
    const frames = this.calculateFrames(nodeData, timeSteps);

    return {
      nodes: nodeData,
      timeSteps,
      frames,
      frameRate: 100, // TODO: Calculate this from the data
      // constants: {
      //   INCH_TO_METER: this.INCH_TO_METER,
      //   DISPLACEMENT_SCALE: this.DISPLACEMENT_SCALE,
      // },
      // ! Swap the Y and Z axes
      // ThreeJS is a Y up coordinate system, and the data is in a Z up coordinate system
      minCoord: [this.minCoord[0], this.minCoord[2], this.minCoord[1]],
      maxCoord: [this.maxCoord[0], this.maxCoord[2], this.maxCoord[1]],
    };
  }

  private calculateFrames(nodeData: Map<string, NodeData>, timeSteps: number[]): AnimationFrame[] {
    const frames: AnimationFrame[] = [];

    for (let tIdx = 0; tIdx < timeSteps.length; tIdx++) {
      const nodePositions = new Map<string, [number, number, number]>();
      const nodeDisplacements = new Map<string, [number, number, number]>();

      let averageDisplacement: [number, number, number] = [0, 0, 0];

      for (const [nodeId, node] of nodeData.entries()) {
        if (!node.initial_pos) continue;

        const [ix, iy, iz] = node.initial_pos;

        const dx = node.disp_H1[tIdx] ?? 0;
        const dy = node.disp_H2[tIdx] ?? 0;
        const dz = node.disp_V[tIdx] ?? 0;

        averageDisplacement[0] += dx;
        averageDisplacement[1] += dy;
        averageDisplacement[2] += dz;

        // const finalX = (ix + dx * this.DISPLACEMENT_SCALE) * this.INCH_TO_METER;
        // const finalY = (iy + dy * this.DISPLACEMENT_SCALE) * this.INCH_TO_METER;
        // const finalZ = (iz + dz * this.DISPLACEMENT_SCALE) * this.INCH_TO_METER;
        const finalX = (ix + dx) * this.INCH_TO_METER;
        const finalY = (iy + dy) * this.INCH_TO_METER;
        const finalZ = (iz + dz) * this.INCH_TO_METER;

        if (finalX < this.minCoord[0]) this.minCoord[0] = finalX;
        if (finalY < this.minCoord[1]) this.minCoord[1] = finalY;
        if (finalZ < this.minCoord[2]) this.minCoord[2] = finalZ;
        if (finalX > this.maxCoord[0]) this.maxCoord[0] = finalX;
        if (finalY > this.maxCoord[1]) this.maxCoord[1] = finalY;
        if (finalZ > this.maxCoord[2]) this.maxCoord[2] = finalZ;

        // ! Swap the Y and Z axes
        // ThreeJS is a Y up coordinate system, and the data is in a Z up coordinate system
        nodePositions.set(nodeId, [finalX, finalZ, finalY]);
      }

      averageDisplacement[0] /= nodePositions.size;
      averageDisplacement[1] /= nodePositions.size;
      averageDisplacement[2] /= nodePositions.size;

      frames.push({
        frame: tIdx + 1,
        time: timeSteps[tIdx],
        nodePositions,
        averageDisplacement,
      });
    }

    return frames;
  }
}
