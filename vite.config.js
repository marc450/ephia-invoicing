import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  preview: {
    // Serve index.html for all routes in preview mode
    port: 4173,
  },
});
