import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  server: {
    port: 5173,
    // Forward API calls to the Express server during development.
    proxy: { "/api": "http://localhost:4000", "/sitemap.xml": "http://localhost:4000" },
  },
});
