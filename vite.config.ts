import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import path from "path";

const dataProxy: Plugin = {
  name: "data-proxy",
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url?.startsWith("/data/")) {
        const filePath = path.resolve(__dirname, "data/binary", req.url.replace(/^\/data\//, ""));
        try {
          const fs = await import("fs/promises");
          const stat = await fs.stat(filePath);
          if (stat.isFile()) {
            const data = await fs.readFile(filePath);
            res.setHeader("Content-Type", "application/octet-stream");
            res.setHeader("Content-Length", stat.size);
            return res.end(data);
          }
        } catch {
          // File not found, let other handlers try
        }
      }
      next();
    });
  },
};

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [
    tailwindcss(),
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    ...(!isSsrBuild ? [dataProxy] : []),
  ],
  resolve: {
    alias: {
      "@public": path.resolve(__dirname, "./public"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    watch: {
      ignored: ["**/*.ottotime", "data/**", "scripts/**", "**/*.md"],
    },
    fs: {
      allow: [".."],
    },
  },
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/core"],
  },
}));
