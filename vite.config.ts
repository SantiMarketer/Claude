import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
// En producción (GitHub Pages) la app se sirve desde /Claude/.
// En desarrollo local se sirve desde la raíz /.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/Claude/" : "/",
  plugins: [react()],
}));
