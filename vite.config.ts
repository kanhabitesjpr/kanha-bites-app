
/// <reference types="vite-plugin-pwa/client" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "pwa-icon.svg"],
      manifest: {
        name: "KANHA BITES",
        short_name: "KANHA BITES",
        description: "बच्चों के लिए हेल्दी और स्वादिष्ट लंच बॉक्स डिलीवरी",
        theme_color: "#17382f",
        background_color: "#f7f3eb",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/pwa-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any"
          },
          {
            src: "/apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
            purpose: "any"
          }
        ]
      }
    })
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true
  }
});
