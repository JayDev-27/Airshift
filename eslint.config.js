import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  { ignores: ['dist/', 'node_modules/', '.hosting/', '.submission/'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,jsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    settings: { react: { version: 'detect' } },
    plugins: { react, 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.strict.rules,
      'react/prop-types': 'off',
      // The build uses the classic JSX transform, so React must stay in scope.
      'react/jsx-uses-react': 'error',
      'react/react-in-jsx-scope': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error'
    }
  },
  {
    files: ['src/**/*.{js,mjs,jsx}'],
    languageOptions: { globals: globals.browser },
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['**/server/**'], message: 'Share runtime-independent code from src/lib.' }] }]
    }
  },
  { files: ['server/**/*.mjs'], languageOptions: { globals: globals.worker } },
  { files: ['server/index.mjs', 'scripts/**/*.mjs', 'test/**/*.mjs'], languageOptions: { globals: globals.nodeBuiltin } }
];
