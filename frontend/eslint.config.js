// ESLint 9+ flat config for Fruveco frontend (CRA-based React app)
// Goal: catch critical bugs like `ReferenceError: <var> is not defined`
// (e.g., `<Cell key={color} />` where `color` wasn't defined in scope)
// without being too noisy for pre-existing stylistic issues.

const js = require('@eslint/js');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'build/**',
      'dist/**',
      'public/**',
      '**/*.test.js',
    ],
  },
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.node,
        process: 'readonly',
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // Base recommended — catches `no-undef` as error by default
      ...js.configs.recommended.rules,

      // React recommended
      ...reactPlugin.configs.recommended.rules,

      // React Hooks — important for Fruveco's custom hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Critical rule: catch undefined variables (the `key={color}` bug)
      'no-undef': 'error',

      // Noise reduction — existing code has many of these as stylistic
      'react/prop-types': 'off',           // app uses JSDoc / TS-free codebase
      'react/react-in-jsx-scope': 'off',   // React 17+ JSX transform
      'react/no-unescaped-entities': 'off',
      'react/display-name': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-useless-escape': 'warn',
      'no-constant-binary-expression': 'warn',
      'no-case-declarations': 'warn',
      'react/no-unknown-property': ['error', { ignore: ['cmdk-input-wrapper'] }],
    },
  },
];
