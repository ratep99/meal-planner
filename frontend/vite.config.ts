import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

/** In Docker Compose the dev server proxies to the backend service; on the host use localhost. */
const proxyTarget = process.env.VITE_PROXY_API ?? "http://localhost:8080";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["offline.html", "pwa-192.svg", "pwa-512.svg", "vite.svg"],
      manifest: {
        name: "Meal Planner",
        short_name: "Meals",
        description: "Household meal planning",
        theme_color: "#FAFAF8",
        background_color: "#FAFAF8",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
          {
            src: "/pwa-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) =>
              request.mode === "navigate" &&
              (url.pathname === "/shopping" ||
                url.pathname.startsWith("/shopping/")),
            handler: "NetworkFirst",
            options: {
              cacheName: "shopping-routes",
              expiration: {
                maxEntries: 32,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/shopping"),
            handler: "NetworkFirst",
            options: {
              cacheName: "shopping-api",
              expiration: {
                maxEntries: 64,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
              networkTimeoutSeconds: 8,
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: proxyTarget,
        changeOrigin: true,
      },
      "/uploads": {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
});
