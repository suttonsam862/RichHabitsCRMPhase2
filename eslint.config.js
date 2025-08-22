import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react': react,
      'react-hooks': reactHooks
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      
      // React rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // General rules
      'no-console': 'warn',
      'no-unused-vars': 'off', // Use TypeScript version instead
      
      // Canonical frontend tree enforcement rules
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../src/*', '../../src/*', './src/*'],
              message: 'Import from canonical client/src tree using @/ alias instead. Legacy ./src tree has been archived.'
            },
            {
              group: ['**/src/**'],
              message: 'Use @/ alias for internal imports instead of relative paths to src.'
            }
          ],
          paths: [
            {
              name: '../src',
              message: 'Import from canonical client/src tree using @/ alias instead. Legacy ./src tree has been archived.'
            },
            {
              name: '../../src', 
              message: 'Import from canonical client/src tree using @/ alias instead. Legacy ./src tree has been archived.'
            }
          ]
        }
      ]
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  },
  {
    files: ['client/src/**/*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../../src/*', '../../src/*'],
              message: 'CANONICAL_ROOT_VIOLATION: Do not import from legacy ./src tree. Use @/ alias for canonical client/src imports.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly'
      }
    }
  }
];