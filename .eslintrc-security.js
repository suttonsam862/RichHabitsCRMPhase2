module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: [
    '@eslint/js/recommended',
    '@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
  ],
  rules: {
    // Security-focused rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-alert': 'error',
    'no-console': 'warn',
    'no-debugger': 'error',
    
    // Prevent dangerous globals
    'no-global-assign': 'error',
    'no-implicit-globals': 'error',
    
    // Require secure patterns
    'prefer-const': 'error',
    'no-var': 'error',
    
    // TypeScript security
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',
    
    // Prevent potential injection vulnerabilities
    'no-useless-concat': 'error',
    'prefer-template': 'error',
    
    // Custom security rules
    'no-restricted-syntax': [
      'error',
      {
        selector: 'CallExpression[callee.name="eval"]',
        message: 'eval() is not allowed for security reasons',
      },
      {
        selector: 'CallExpression[callee.property.name="innerHTML"]',
        message: 'innerHTML can lead to XSS vulnerabilities, use textContent or properly sanitize',
      },
      {
        selector: 'CallExpression[callee.name="setTimeout"][arguments.0.type="Literal"]',
        message: 'setTimeout with string argument can lead to code injection',
      },
      {
        selector: 'CallExpression[callee.name="setInterval"][arguments.0.type="Literal"]',
        message: 'setInterval with string argument can lead to code injection',
      },
    ],
    
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['child_process'],
            message: 'child_process can be dangerous in production environments',
          },
          {
            group: ['vm'],
            message: 'vm module can be used for code injection',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.spec.ts', '**/tests/**/*'],
      rules: {
        // Relax some rules for test files
        'no-console': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};