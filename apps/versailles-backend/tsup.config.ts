import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/app.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  outDir: "dist",
  clean: true,
  splitting: false,
  sourcemap: true,
  dts: false,

  noExternal: [/^@repo\/shared(?:\/.*)?$/],
});
