import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

/** Flat ESLint config for quesar.cloud (TanStack Start). */
export default tseslint.config(
  {
    ignores: [
      "dist/**",
      ".output/**",
      ".vercel/**",
      ".nitro/**",
      "node_modules/**",
      "src/routeTree.gen.ts",
      // Built static site (bun run build:static) published by GitHub Pages.
      "docs/**",
      // Standalone projects with their own toolchains (Bun, Gradle, Swift),
      // outside the npm build. See their READMEs.
      "sidecars/**",
      "native/**",
      // Session-plugin state (git-ignored by its own .gitignore). Flat config
      // does not read .gitignore, and it writes a timestamp file named `*.ts`.
      ".remember/**",
      // Agent worktrees (Claude Code workflows) are full checkouts with their
      // own node_modules; linting them multiplies the run time.
      ".claude/worktrees/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    // TanStack file routes export `Route` beside their local components by
    // design; the router plugin splits each route component into its own
    // module for HMR, so react-refresh's one-file-one-kind rule does not apply.
    files: ["src/routes/**/*.{ts,tsx}"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  // Disable rules that conflict with Prettier formatting.
  prettier,
);
