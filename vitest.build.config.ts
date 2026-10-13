import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** (C) Checks that read the built site in dist/ (spec §12, §13.10). Run after `npm run build`. */
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["tests/build/**/*.check.ts"] },
});
