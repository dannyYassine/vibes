import js from "@eslint/js";
import boundaries from "eslint-plugin-boundaries";
import tseslint from "typescript-eslint";

const layers = ["viewmodel", "presenter", "view", "service", "entity", "gateway", "store", "module", "infra"];

export default tseslint.config(
  { ignores: ["dist", "node_modules", "coverage"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "boundaries/include": ["src/**/*.{ts,tsx}"],
      "boundaries/files": [
        { category: "viewmodel", pattern: "src/features/*/presentation/*ViewModel.ts" },
        { category: "presenter", pattern: "src/features/*/presentation/*Presenter.ts" },
        { category: "view", pattern: "src/features/*/presentation/*.tsx" },
        { category: "service", pattern: "src/features/*/domain/*Service.ts" },
        { category: "entity", pattern: "src/features/*/domain/*.ts" },
        { category: "gateway", pattern: "src/features/*/data/*.ts" },
        { category: "store", pattern: "src/features/*/state/*.ts" },
        { category: "module", pattern: "src/features/*/*Module.ts" },
        { category: "infra", pattern: "src/infra/**/*.{ts,tsx}" },
      ],
    },
    rules: {
      "boundaries/dependencies": ["error", {
        default: "allow",
        policies: [
          { from: { file: { categories: "viewmodel" } }, disallow: { to: { file: { categories: { anyOf: layers } } } } },
          { from: { file: { categories: "entity" } }, disallow: { to: { file: { categories: { anyOf: layers } } } } },
          { from: { file: { categories: "gateway" } }, disallow: { to: { file: { categories: { anyOf: ["entity", "service", "presenter", "viewmodel", "view", "store", "module"] } } } } },
          { from: { file: { categories: "store" } }, disallow: { to: { file: { categories: { anyOf: ["gateway", "service", "presenter", "viewmodel", "view", "module"] } } } } },
          { from: { file: { categories: "service" } }, disallow: { to: { file: { categories: { anyOf: ["presenter", "viewmodel", "view", "module"] } } } } },
          { from: { file: { categories: "presenter" } }, disallow: { to: { file: { categories: { anyOf: ["gateway", "view", "module"] } } } } },
          { from: { file: { categories: "view" } }, disallow: { to: { file: { categories: { anyOf: ["gateway", "entity", "service", "store", "module"] } } } } },
        ],
      }],
    },
  },
);
