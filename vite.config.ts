import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type PluginOption, type ViteDevServer } from "vite";
import type { BinaryBuilding, BuildingIndex, CSVBuilding } from "./src/lib/types";

import fs from "fs";
import path from "path";

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

function getFolderDirectories(p: string) {
  const abs = path.resolve(process.cwd(), p);
  if (!fs.existsSync(abs)) return [];

  const files = fs.readdirSync(abs, { withFileTypes: true });
  return files.filter((f) => f.isDirectory()).map((f) => f.name);
}

function getFolderFiles(p: string, ext?: string) {
  const abs = path.resolve(process.cwd(), p);
  if (!fs.existsSync(abs)) return [];

  const files = fs.readdirSync(abs);
  if (ext) return files.filter((f) => f.endsWith(ext));
  return files;
}

// Source - https://stackoverflow.com/a
// Posted by jcalz
// Retrieved 2026-01-28, License - CC BY-SA 4.0

// type PartialAllExcept<T, R extends string> = Partial<Omit<T, "id" | R>> &
//   (R extends keyof T ? { [K in R]: PartialAllExcept<T, R> } : unknown);

// type MaybePartialAllExcept<T, R extends string> =
//   T extends Person ? PartialAllExcept<T, R> : T;

// type PartialBuildingIndex = PartialAllExcept<BuildingIndex, "folder" | "data_type">;

function folderStatsPlugin(options: { manifestFile: string }) {
  const { manifestFile } = options;

  return {
    name: "folder-stats-plugin",
    // apply: "build",
    buildStart() {
      console.log("Start build...");
      const manifestPath = path.resolve(process.cwd(), manifestFile);
      const raw = fs.readFileSync(manifestPath, "utf8");
      const manifest: BuildingIndex = JSON.parse(raw);

      const manifestDir = path.dirname(manifestPath);

      manifest.size = getFolderSize(manifestDir);
      manifest.buildings = getFolderDirectories(manifestDir)
        .map((f) => ({ folder: f }))
        .map((f) => {
          if (!manifest.buildings) return f as CSVBuilding;
          const existing = manifest.buildings.find((b) => b.folder === f.folder);
          if (existing) return existing;
          return f as CSVBuilding;
        });
      for (const building of manifest.buildings) {
        const buildingDir = path.resolve(manifestDir, building.folder);

        if (building.data_type === undefined) {
          const files = getFolderFiles(buildingDir);
          if (files.includes("building.bld")) {
            (building as BinaryBuilding).data_type = "binary";
          } else {
            (building as CSVBuilding).data_type = "csv";
          }
        }
        building.name = building.name ?? building.folder;
        building.size = getFolderSize(buildingDir);

        if (building.data_type === "csv") {
          building.height_map = building.height_map ?? "*building_height.csv";
          building.center_map = building.center_map ?? "*building_center.csv";
          building.node_map = building.node_map ?? "*node_mapping.csv";
          building.simulations = building.simulations ?? getFolderDirectories(buildingDir).map((f) => ({ folder: f }));

          building.simulations.forEach((sim) => {
            sim.name = sim.name ?? sim.folder;
            sim.displacementFiles = getFolderFiles(path.resolve(buildingDir, sim.folder, "Displacements"), ".txt");
            sim.accelerationFiles = getFolderFiles(path.resolve(buildingDir, sim.folder, "Accelerations"), ".txt");
            sim.velocityFiles = getFolderFiles(path.resolve(buildingDir, sim.folder, "Velocities"), ".txt");
            sim.groundMotion = sim.groundMotion ?? "*ground_motion.txt";
            sim.size = getFolderSize(path.resolve(buildingDir, sim.folder));
          });
        } else if (building.data_type === "binary") {
          building.building_data = building.building_data ?? "*building.bld";
          building.building_data_size = getFolderSize(path.resolve(buildingDir, building.building_data));
          building.simulations = building.simulations ?? getFolderDirectories(buildingDir).map((f) => ({ folder: f }));

          building.simulations.forEach((sim) => {
            sim.name = sim.name ?? sim.folder;
            sim.displacement = sim.displacement ?? "*displacement.bld";
            sim.velocity = sim.velocity ?? "*velocity.bld";
            sim.acceleration = sim.acceleration ?? "*acceleration.bld";
            sim.groundMotion = sim.groundMotion ?? "*ground_motion.bld";
            sim.size = getFolderSize(path.resolve(buildingDir, sim.folder));
          });
        }
      }

      fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
    },
  } as PluginOption;
}

function serveGzipHeaders() {
  return {
    name: "serve-gzip-headers",
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        if (req.url) {
          const url = new URL(req.url, `http://${req.headers.host}`);

          if (url.pathname.endsWith(".bld")) {
            res.setHeader("Content-Encoding", "gzip");
            res.setHeader("Content-Type", "application/octet-stream");
          }
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
    }),
    // binaryStatsPlugin({
    //   manifestFile: "public/data/index-binary.json",
    //   targetFile: "public/data/index-binary.ts",
    //   placeholder: "__BINARY_SIZES__",
    // }),
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
