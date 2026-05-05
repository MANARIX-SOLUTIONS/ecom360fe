import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: ["node_modules/", "src/test/", "**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/\/react(?:-dom|-router-dom)?\//.test(id)) return "vendor-react";
          if (/\/recharts\/|\/d3-/.test(id)) return "vendor-charts";
          if (/\/lucide-react\//.test(id)) return "vendor-icons";
          if (/\/@ant-design\/icons\//.test(id)) return "vendor-antd-icons";
          if (/\/rc-[^/]+\//.test(id)) return "vendor-rc";
          if (/\/antd\//.test(id)) return "vendor-antd";
        },
      },
    },
    chunkSizeWarningLimit: 1400,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/actuator": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
