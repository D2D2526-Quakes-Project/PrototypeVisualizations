import { defineConfig, type PluginOption, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import fs from "fs";
import path from "path";

type Index = {
  size: number;
  buildings: Building[];
};

type Simulation = {
  name: string;
  folder: string;
  size: number;
  displacementFiles: string[];
  accelerationFiles: string[];
  velocityFiles: string[];
};

type Building = {
  name: string;
  folder: string;
  size: number;
  height_map: string;
  height_map_size: number;
  center_map: string;
  center_map_size: number;
  node_map: string;
  node_map_size: number;
  simulations: Simulation[];
};

function walkDir(dir: string) {
  let total = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const stat = fs.statSync(full);

    if (stat.isFile()) {
      total += stat.size;
    } else if (stat.isDirectory()) {
      total += walkDir(full);
    }
  }
  return total;
}

function getFolderSize(p: string) {
  const abs = path.resolve(process.cwd(), p);
  if (!fs.existsSync(abs)) return 0;

  const stat = fs.statSync(abs);
  if (stat.isFile()) return stat.size;
  if (stat.isDirectory()) return walkDir(abs);

  return 0;
}

function getFolderFiles(p: string) {
  const abs = path.resolve(process.cwd(), p);
  if (!fs.existsSync(abs)) return [];

  const files = fs.readdirSync(abs);
  return files.filter((f) => f.endsWith(".txt"));
}

function folderStatsPlugin(options: { manifestFile: string; targetFile: string; placeholder: string }) {
  const { manifestFile, targetFile, placeholder } = options;

  let _folderStats: Index | null = null;

  return {
    name: "folder-stats-plugin",
    // apply: "build",
    buildStart() {
      console.log("Start build...");
      const manifestPath = path.resolve(process.cwd(), manifestFile);
      const raw = fs.readFileSync(manifestPath, "utf8");
      const manifest: Index = JSON.parse(raw);

      const manifestDir = path.dirname(manifestPath);

      const resolveDataSet = (building: Building): Building => {
        const buildingDir = path.resolve(manifestDir, building.folder);
        return {
          name: building.name,
          folder: building.folder,
          size: getFolderSize(buildingDir),
          height_map: building.height_map,
          height_map_size: getFolderSize(path.resolve(buildingDir, building.height_map)),
          center_map: building.center_map,
          center_map_size: getFolderSize(path.resolve(buildingDir, building.center_map)),
          node_map: building.node_map,
          node_map_size: getFolderSize(path.resolve(buildingDir, building.node_map)),
          simulations: building.simulations.map((sim) => ({
            name: sim.name,
            folder: sim.folder,
            size: getFolderSize(path.resolve(buildingDir, sim.folder)),
            displacementFiles: getFolderFiles(path.resolve(buildingDir, sim.folder, "Displacements")),
            accelerationFiles: getFolderFiles(path.resolve(buildingDir, sim.folder, "Accelerations")),
            velocityFiles: getFolderFiles(path.resolve(buildingDir, sim.folder, "Velocities")),
          })),
        };
      };

      const result: Index = {
        size: getFolderSize(manifestDir),
        buildings: manifest.buildings.map(resolveDataSet),
      };

      _folderStats = result;
    },

    transform(code: string, id: string) {
      if (!id.endsWith(targetFile)) return null;

      const statsString = JSON.stringify(_folderStats, null, 2);
      const updated = code.replace(placeholder, statsString);

      return {
        code: updated,
        map: null,
      };
    },
  } as PluginOption;
}

function serveGzipHeaders() {
  return {
    name: "serve-gzip-headers",
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        if (req.url)
          if (req.url.endsWith(".gz")) {
            res.setHeader("Content-Encoding", "gzip");
            // Explicitly set the type so it's not treated as application/gzip
            if (req.url.endsWith(".js.gz")) res.setHeader("Content-Type", "application/javascript");
            if (req.url.endsWith(".css.gz")) res.setHeader("Content-Type", "text/css");
          }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    folderStatsPlugin({
      manifestFile: "public/data/index.json",
      targetFile: "public/data/index.ts",
      placeholder: "__FOLDER_SIZES__",
    }),
    tailwindcss(),
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    serveGzipHeaders(),
  ],
  resolve: {
    alias: {
      "@public": path.resolve(__dirname, "./public"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
