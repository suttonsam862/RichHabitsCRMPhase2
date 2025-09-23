import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import vitest from 'eslint-plugin-vitest';

export default [
  // Ignore patterns for files we don't want to lint
  {
    ignores: [
      // generated / raw or ops scripts — not app source
      'scripts/**',
      // built/compiled files
      'dist/**',
      'build/**',
      // node modules
      'node_modules/**',
      // root maintenance scripts - be specific to avoid ignoring config files
      'add-missing-columns.js',
      'apply-supabase-schema.js',
      'complete-migration.js',
      'complete-schema-push.js',
      'create-salesperson-tables.js',
      'create-users-columns.js',
      'debug-salesperson-tables.js',
      'ensure-database-setup.js',
      'fix-users-schema.js',
      'performance-benchmark.js',
      'schema-sync.js',
      'security-validator.js',
      'sync-users-to-supabase.js',
      'test-*.js',
      'verify-database-*.js',
      // database schema DSL (not TS-runtime code)
      'migrations/schema.ts'
    ]
  },
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
        // Node/Common globals
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
        
        // Browser APIs that fix the current errors
        AbortController: 'readonly',
        Blob: 'readonly',
        Event: 'readonly',
        navigator: 'readonly',
        performance: 'readonly',
        btoa: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        confirm: 'readonly',
        alert: 'readonly',
        prompt: 'readonly',
        
        // DOM types that are causing no-undef errors
        HTMLElement: 'readonly',
        HTMLImageElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLParagraphElement: 'readonly',
        HTMLHeadingElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLAnchorElement: 'readonly',
        HTMLSpanElement: 'readonly',
        HTMLOListElement: 'readonly',
        HTMLUListElement: 'readonly',
        HTMLLIElement: 'readonly',
        HTMLTableElement: 'readonly',
        HTMLTableSectionElement: 'readonly',
        HTMLTableRowElement: 'readonly',
        HTMLTableCellElement: 'readonly',
        HTMLTableCaptionElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        HTMLSelectElement: 'readonly',
        
        // Web APIs used in TS
        RequestInit: 'readonly',
        Response: 'readonly',
        WebSocket: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        
        // Node-ish names sometimes referenced in types
        NodeJS: 'readonly',
        crypto: 'readonly',
        
        React: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react': react,
      'react-hooks': reactHooks,
      'vitest': vitest
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
  
  // App code - quiet the two loudest warning types
  {
    files: ['client/**/*.{ts,tsx}', 'server/**/*.{ts,tsx}'],
    rules: {
      // Allow console.warn/error and treat others as warnings (not errors)
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      
      // Use underscore pattern to ignore unused vars during refactoring
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    }
  },

  // Client code runs in the browser; turn off core no-undef for TS (false positives)
  {
    files: ['client/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        navigator: 'readonly',
        AbortController: 'readonly',
        performance: 'readonly',
        btoa: 'readonly'
      }
    },
    rules: {
      // TS already type-checks names; the base rule misfires on TS type names
      'no-undef': 'off',
    }
  },

  // Server + tools run in Node
  {
    files: [
      'server/**/*.{ts,tsx}',
      'shared/**/*.{ts,tsx}',
      'tools/**/*.{ts,tsx}',
    ],
    languageOptions: {
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        NodeJS: 'readonly',
        crypto: 'readonly'
      }
    },
    rules: {
      'no-undef': 'off',
    }
  },

  // Tests (unit/integration/e2e) — enable Vitest globals & relax a few strict rules
  {
    files: [
      'tests/**/*.{ts,tsx,js}',
      '**/*.{test,spec}.{ts,tsx,js}',
    ],
    languageOptions: {
      globals: {
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly'
      }
    },
    plugins: {
      vitest
    },
    rules: {
      'no-undef': 'off',                 // Vitest + TS will provide globals
      'no-restricted-imports': 'off',    // tests can import relatively
      'no-unexpected-multiline': 'off',  // some template-heavy tests
      'no-useless-catch': 'off',         // tests often wrap to assert
      'no-console': 'off',               // Allow console in tests
    }
  },

  // Shared schema/dto files: quiet some stylistic rules that aren't functional
  {
    files: ['shared/**/*.{ts,tsx}'],
    rules: {
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'off',
      'no-useless-escape': 'off',
      'no-control-regex': 'off',
    }
  },

  // UI primitives that reference DOM types directly
  {
    files: ['client/src/components/ui/**/*.{ts,tsx}'],
    rules: { 
      'no-undef': 'off' 
    }
  },

  // Scripts / tooling (migration, debug, seeds, ci helpers, etc.)
  {
    files: [
      '*.cjs',
      '*.js', 
      'scripts/**/*.{js,cjs,ts}',
      '*-schema*.js',
      '*migration*.js', 
      '*seed*.{js,ts}',
      '*debug*.{js,ts}',
      'tests/**/*', 
      '**/*.test.*', 
      '**/*.spec.*'
    ],
    languageOptions: {
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly'
      }
    },
    rules: {
      'no-console': 'off',
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { 
          argsIgnorePattern: '^_', 
          varsIgnorePattern: '^_', 
          caughtErrorsIgnorePattern: '^_' 
        }
      ],
    }
  },

  // Keep the canonical import rule for client/src
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

  // Legacy JS files
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