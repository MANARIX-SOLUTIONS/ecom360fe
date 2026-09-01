import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { isPosRuntimeCacheUrl } from "./src/pwaCache";

const apiProxy = {
  "/api": {
    target: "http://localhost:8080",
    changeOrigin: true,
  },
  "/actuator": {
    target: "http://localhost:8080",
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: ["favicon.svg", "logo/*.png", "images/payments/*"],
      manifest: false,
      filename: "sw.js",
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/actuator/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2,webp,json}"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => isPosRuntimeCacheUrl(url),
            handler: "NetworkFirst",
            method: "GET",
            options: {
              cacheName: "ecom360-pos-api",
              networkTimeoutSeconds: 3,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
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
          // antd, rc-* and @ant-design/* share circular deps — keep together
          if (/\/antd\/|\/rc-[^/]+\/|\/@ant-design\//.test(id)) return "vendor-antd";
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 5173,
    proxy: apiProxy,
  },
  preview: {
    port: 5173,
    proxy: apiProxy,
  },
});
