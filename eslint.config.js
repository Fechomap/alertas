import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import sonarjs from 'eslint-plugin-sonarjs';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  prettier,
  {
    files: ['src/**/*.ts'],
    plugins: {
      sonarjs,
    },
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      'no-console': 'error',
      'max-lines': ['warn', { max: 300 }],
      'max-lines-per-function': ['warn', { max: 80 }],
      complexity: ['warn', 15],
      'sonarjs/cognitive-complexity': ['warn', 20],
    },
  },
  {
    files: ['tests/**/*.ts'],
    plugins: {
      sonarjs,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      'max-lines': 'off',
      'max-lines-per-function': 'off',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '*.js', '*.mjs', 'eslint.config.js'],
  },
);
