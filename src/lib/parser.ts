export interface NodeData {
  story: string;
  corner: Corner;
  initial_pos: [number, number, number]; // meters
  disp_H1: number[];
  disp_H2: number[];
  disp_V: number[];
  nodeId: string;
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
  stories: Map<
    string,
    {
      nodeIds: string[];
      averageDisplacement: [number, number, number];
    }
  >;
}

export interface BuildingAnimationData {
  nodes: Map<string, NodeData>;
  timeSteps: number[];
  frames: AnimationFrame[];
  frameRate: number;
  minPos: [number, number, number]; // meters
  maxPos: [number, number, number]; // meters
  minInitialPos: [number, number, number]; // meters
  maxInitialPos: [number, number, number]; // meters
  maxAverageDisplacement: number; // meters
  maxAverageStoryDisplacement: number; // meters
  maxDisplacement: number; // meters
  minDisplacement: number; // meters
}

export type Directions = "H1" | "H2" | "V";
export type Corner = "NW" | "NE" | "SW" | "SE";

export class BuildingDataParser {
  private INCH_TO_METER = 0.0254;

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
        corner: corner as Corner,
        initial_pos: [0, 0, 0],
        disp_H1: [],
        disp_H2: [],
        disp_V: [],
        nodeId,
      });
    }

    return nodes;
  }

  parseDisplacementFile(fileContent: string, _direction: Directions): ParsedDisplacementFile {
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

  buildAnimationData(nodeMappingCsv: string, dataFiles: { [filename: string]: string }, onProgress: (progress: number) => void): BuildingAnimationData {
    onProgress(0);

    // Parse node mapping
    const nodeData = this.parseNodeMapping(nodeMappingCsv);
    let timeSteps: number[] = [];

    onProgress(5);

    /* Z UP COORDINATE SYSTEM */
    const minInitialPos: [number, number, number] = [Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE];
    /* Z UP COORDINATE SYSTEM */
    const maxInitialPos: [number, number, number] = [Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE];

    // Parse displacement files
    const fileEntries = Object.entries(dataFiles);
    for (let i = 0; i < fileEntries.length; i++) {
      const [filename, content] = fileEntries[i];
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
          node[key] = displacements.map((d) => d * this.INCH_TO_METER);
          node.initial_pos = [nodeCoords[nodeId][0] * this.INCH_TO_METER, nodeCoords[nodeId][1] * this.INCH_TO_METER, nodeCoords[nodeId][2] * this.INCH_TO_METER];
          if (node.initial_pos[0] < minInitialPos[0]) minInitialPos[0] = node.initial_pos[0];
          if (node.initial_pos[1] < minInitialPos[1]) minInitialPos[1] = node.initial_pos[1];
          if (node.initial_pos[2] < minInitialPos[2]) minInitialPos[2] = node.initial_pos[2];
          if (node.initial_pos[0] > maxInitialPos[0]) maxInitialPos[0] = node.initial_pos[0];
          if (node.initial_pos[1] > maxInitialPos[1]) maxInitialPos[1] = node.initial_pos[1];
          if (node.initial_pos[2] > maxInitialPos[2]) maxInitialPos[2] = node.initial_pos[2];
        }
      }
      onProgress(5 + ((i + 1) / fileEntries.length) * 45);
    }

    // Pre-calculate frame data
    onProgress(50);
    const { frames, maxAverageDisplacement, maxAverageStoryDisplacement, maxDisplacement, minDisplacement, minPos, maxPos } = this.calculateFrames(nodeData, timeSteps, onProgress);

    // ! Swap the Y and Z axes
    // ThreeJS is a Y up coordinate system, and the data is in a Z up coordinate system
    nodeData.forEach((node) => {
      node.initial_pos = [node.initial_pos[0], node.initial_pos[2], node.initial_pos[1]];
    });

    onProgress(100);

    return {
      nodes: nodeData,
      timeSteps,
      frames,
      frameRate: 100, // TODO: Calculate this from the data
      // ! Swap the Y and Z axes
      // ThreeJS is a Y up coordinate system, and the data is in a Z up coordinate system
      minPos: [minPos[0], minPos[2], minPos[1]],
      maxPos: [maxPos[0], maxPos[2], maxPos[1]],
      minInitialPos: [minInitialPos[0], minInitialPos[2], minInitialPos[1]],
      maxInitialPos: [maxInitialPos[0], maxInitialPos[2], maxInitialPos[1]],
      maxAverageDisplacement: maxAverageDisplacement,
      maxAverageStoryDisplacement: maxAverageStoryDisplacement,
      maxDisplacement: maxDisplacement,
      minDisplacement: minDisplacement,
    };
  }

  /* RETURNS Z UP COORDINATE SYSTEM */
  private calculateFrames(nodeData: Map<string, NodeData>, timeSteps: number[], onProgress: (progress: number) => void) {
    const frames: AnimationFrame[] = [];

    /* Z UP COORDINATE SYSTEM */
    let maxAverageDisplacement: number = 0;
    /* Z UP COORDINATE SYSTEM */
    let maxAverageStoryDisplacement: number = 0;
    /* Z UP COORDINATE SYSTEM */
    let maxDisplacement: number = Number.MIN_VALUE;
    /* Z UP COORDINATE SYSTEM */
    let minDisplacement: number = Number.MAX_VALUE;
    /* Z UP COORDINATE SYSTEM */
    const minPos: [number, number, number] = [Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE];
    /* Z UP COORDINATE SYSTEM */
    const maxPos: [number, number, number] = [Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE];

    for (let tIdx = 0; tIdx < timeSteps.length; tIdx++) {
      const nodePositions = new Map<string, [number, number, number]>();
      const stories = new Map<
        string,
        {
          nodeIds: string[];
          averageDisplacement: [number, number, number];
        }
      >();

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

        const displacementDistance = Math.hypot(dx, dy, dz);
        if (displacementDistance > maxDisplacement) {
          maxDisplacement = displacementDistance;
        }

        if (displacementDistance < minDisplacement) {
          minDisplacement = displacementDistance;
        }

        const finalX = ix + dx;
        const finalY = iy + dy;
        const finalZ = iz + dz;

        if (finalX < minPos[0]) minPos[0] = finalX;
        if (finalY < minPos[1]) minPos[1] = finalY;
        if (finalZ < minPos[2]) minPos[2] = finalZ;
        if (finalX > maxPos[0]) maxPos[0] = finalX;
        if (finalY > maxPos[1]) maxPos[1] = finalY;
        if (finalZ > maxPos[2]) maxPos[2] = finalZ;

        // ! Swap the Y and Z axes
        // ThreeJS is a Y up coordinate system, and the data is in a Z up coordinate system
        nodePositions.set(nodeId, [finalX, finalZ, finalY]);

        //* Floor

        const storyId = node.story;
        const story = stories.get(storyId) ?? {
          nodeIds: [],
          averageDisplacement: [0, 0, 0],
        };
        story.nodeIds.push(nodeId);
        story.averageDisplacement[0] += dx;
        story.averageDisplacement[1] += dy;
        story.averageDisplacement[2] += dz;
        stories.set(storyId, story);
      }

      averageDisplacement[0] = averageDisplacement[0] / nodePositions.size;
      averageDisplacement[1] = averageDisplacement[1] / nodePositions.size;
      averageDisplacement[2] = averageDisplacement[2] / nodePositions.size;

      if (Math.hypot(...averageDisplacement) > maxAverageDisplacement) {
        maxAverageDisplacement = Math.hypot(...averageDisplacement);
      }

      for (const [_storyId, story] of stories.entries()) {
        story.averageDisplacement[0] = story.averageDisplacement[0] / story.nodeIds.length;
        story.averageDisplacement[1] = story.averageDisplacement[1] / story.nodeIds.length;
        story.averageDisplacement[2] = story.averageDisplacement[2] / story.nodeIds.length;

        if (Math.hypot(...story.averageDisplacement) > maxAverageStoryDisplacement) {
          maxAverageStoryDisplacement = Math.hypot(...story.averageDisplacement);
        }
      }

      frames.push({
        frame: tIdx + 1,
        time: timeSteps[tIdx],
        nodePositions,
        averageDisplacement,
        stories,
      });

      if (tIdx % 100 === 0) {
        onProgress(50 + (tIdx / timeSteps.length) * 50);
      }
    }

    return { frames, maxAverageDisplacement, maxAverageStoryDisplacement, maxDisplacement, minDisplacement, minPos, maxPos };
  }
}
