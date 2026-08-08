import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Leituras client-only na montagem (localStorage, window.location) e
      // reinício de animações por cena precisam mesmo de setState em efeito.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
