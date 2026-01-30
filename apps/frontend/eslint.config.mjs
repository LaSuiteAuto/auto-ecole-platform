import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  // Global ignores - must be first
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "node_modules/**",
      ".swc/**",
      "next-env.d.ts",
      // Garbage/temporary folders
      "FAutoEcoleauto-ecole-platform/**",
      "FAutoEcoleauto-ecole-platformappsfrontend/**",
      "**/FAutoEcoleauto-ecole-platform/**",
      "**/FAutoEcoleauto-ecole-platformappsfrontend/**",
    ],
  },
  ...nextVitals,
  ...nextTs,
]);

export default eslintConfig;
