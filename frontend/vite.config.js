import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  // Production builds drop debug logging and debugger statements.
  // console.error and console.warn stay.
  esbuild:
    mode === "production"
      ? {
          pure: ["console.log", "console.debug", "console.info"],
          drop: ["debugger"],
        }
      : undefined,

  server: {
    host: "localhost",
    port: 5173,

    proxy: {
      "/api": {
        target: "http://localhost:5051",
        changeOrigin: true,
        secure: false,
      },
    },
  },
}));