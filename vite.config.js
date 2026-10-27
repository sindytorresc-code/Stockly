import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/Stockly/",
  plugins: [react()],
  server: {
    // Fail clearly instead of silently serving on 5174 while the browser stays on 5173.
    strictPort: true,
  },
});
