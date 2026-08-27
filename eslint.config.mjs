import { FlatCompat } from '@eslint/eslintrc';
import { fixupConfigRules } from '@eslint/compat';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier/flat';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const airbnbConfig = fixupConfigRules(
  compat.extends('airbnb', 'airbnb/hooks'),
).map((config) => {
  const configWithoutPlugins = { ...config };

  delete configWithoutPlugins.plugins;

  return configWithoutPlugins;
});

const eslintConfig = defineConfig([
  ...airbnbConfig,
  ...nextVitals,
  ...nextTs,
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs}'],
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
        node: true,
      },
    },
    rules: {
      'import/extensions': [
        'error',
        'ignorePackages',
        {
          js: 'never',
          jsx: 'never',
          ts: 'never',
          tsx: 'never',
        },
      ],
      'react/jsx-filename-extension': [
        'error',
        {
          extensions: ['.jsx', '.tsx'],
        },
      ],
      'react/react-in-jsx-scope': 'off',
      'react/require-default-props': 'off',
    },
  },
  {
    files: [
      '*.config.{js,mjs,ts}',
      'eslint.config.mjs',
      'next.config.ts',
      'playwright.config.ts',
      'postcss.config.mjs',
      'vitest.config.mts',
    ],
    rules: {
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: true,
        },
      ],
    },
  },
  {
    // App Router files address the framework by named export: a route handler
    // is discovered as GET/POST/DELETE, and a page or layout supplies
    // `metadata` and `generateMetadata` alongside its default export. A single
    // named export in one of these files is required by Next.js, not a style
    // slip, so the default-export preference cannot apply here.
    files: [
      'src/app/**/route.{js,ts}',
      'src/app/**/{page,layout,template,error,loading,not-found}.{js,jsx,ts,tsx}',
    ],
    rules: {
      'import/prefer-default-export': 'off',
    },
  },
  {
    files: [
      '**/*.test.{js,jsx,ts,tsx}',
      '**/*.spec.{js,jsx,ts,tsx}',
      'e2e/**/*.{js,jsx,ts,tsx}',
      'test/**/*.{js,jsx,ts,tsx}',
    ],
    rules: {
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: true,
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    '.next-typecheck-tmp-*/**',
    'out/**',
    'build/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    '.obsidian/**',
    'docs/**',
    'next-env.d.ts',
    // docs/ is the Obsidian vault (notes + a vendored community plugin
    // bundle), not project source - never lint it.
    'docs/**',
    // outputs/ is generated artifact output - spreadsheets, screenshots, and
    // the throwaway scripts that produced them, each with its own vendored
    // node_modules. Same category as build/ and coverage/ above, and it has to
    // be ignored for the same reason: the pre-commit hook runs the whole
    // `verify`, so an unignored scratch script importing a tool that is not a
    // project dependency makes every commit in this repository fail.
    'outputs/**',
  ]),
  prettierConfig,
]);

export default eslintConfig;
