import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    root: "./",
    exclude: ["dist/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/evaluator/**", "src/session/**", "src/form-schema/**"],
    },
  },
  plugins: [swc.vite({ module: { type: "es6" } })],
});
