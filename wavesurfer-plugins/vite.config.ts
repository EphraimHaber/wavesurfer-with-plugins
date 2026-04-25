import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import babel from "@rolldown/plugin-babel";

// https://vite.dev/config/
export default defineConfig({
  base:
    process.env.VITE_GITHUB_PAGES === "true"
      ? "/wavesurfer-with-plugins/"
      : "/",
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
});
