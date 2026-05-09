import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  {
    ignores: [
      "node_modules/",
      ".pnpm-store/",
      "dist/",
      "build/",
      "*.local",
      ".venv/",
      "venv/",
      "__pycache__/",
      "*.pyc",
      "*.pyo",
      "*.pyd",
      ".Python",
      "*.egg-info/",
      ".eggs/",
      "pip-log.txt",
      "pip/",
      ".pytest_cache/",
      ".mypy_cache/",
      ".ruff_cache/",
      "data/",
      "quakes-sharelink/",
      "*.csv",
      "*.json",
      "*.bin",
      "*.mat",
      ".vscode/",
      ".idea/",
      "*.sw?",
      "*.suo",
      ".DS_Store",
      "Thumbs.db",
      "*.log",
      "logs/",
      ".env",
      ".env.local",
      ".git/",
    ],
  },
  reactHooks.configs.flat.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended, reactRefresh.configs.vite],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      "react-refresh/only-export-components": [
        "error",
        {
          allowConstantExport: true,
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
]);
