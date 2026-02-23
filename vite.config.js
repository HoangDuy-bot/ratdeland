import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",

      // ✅ QUAN TRỌNG: tắt SW khi chạy npm run dev để không bao giờ trắng trang
      devOptions: {
        enabled: false,
      },

      manifest: {
        name: "RATDELand",
        short_name: "RATDELand",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },

      workbox: {
        runtimeCaching: [
          // ✅ cache tile Supabase (mở lại nhanh hơn)
          {
            urlPattern: ({ url }) =>
              url.origin === "https://nfocduuucvbcacpcivep.supabase.co" &&
              url.pathname.includes("/storage/v1/object/public/planning/"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "supabase-tiles",
              expiration: {
                maxEntries: 2000,
                maxAgeSeconds: 60 * 60 * 24 * 14,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ✅ cache marker icon leaflet từ unpkg
          {
            urlPattern: ({ url }) =>
              url.hostname === "unpkg.com" &&
              url.pathname.includes("leaflet@1.9.4/dist/images/"),
            handler: "CacheFirst",
            options: {
              cacheName: "leaflet-assets",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});