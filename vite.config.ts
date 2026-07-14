import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Load .env files for the current mode so we can read VITE_BASE_URL
  // in the config itself (before the browser bundle is built).
  const env = loadEnv(mode, process.cwd(), "");

  // Default to /picker/ (GitHub Pages sub-path).
  // .env.development overrides this to / for local dev.
  const base = env.VITE_BASE_URL ?? "/picker/";

  return {
    base,
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      outDir: "dist",
      assetsDir: "assets",
    },
  };
});
