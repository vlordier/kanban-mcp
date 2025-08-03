module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:all', // Most stringent base rules
    'plugin:@typescript-eslint/all', // All TypeScript rules
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:security/recommended-legacy', // Security rules
    'plugin:sonarjs/recommended', // Code quality rules
    'plugin:prettier/recommended', // Must be last
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'import', 'security', 'sonarjs', 'prettier'],
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
    },
  },
  rules: {
    // Prettier integration
    'prettier/prettier': 'error',

    // TypeScript specific overrides - same as web-server but adapted for MCP
    '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/prefer-readonly-parameter-types': 'off', // Too strict for MCP protocol
    '@typescript-eslint/no-magic-numbers': [
      'error',
      {
        ignore: [0, 1, -1, 2, 10, 100, 1000],
        ignoreArrayIndexes: true,
        ignoreDefaultValues: true,
        ignoreNumericLiteralTypes: true,
      },
    ],

    // Import rules
    'import/no-default-export': 'error', // Prefer named exports
    'import/prefer-default-export': 'off',
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],

    // MCP server specific - allow console for protocol communication
    'no-console': 'off', // MCP uses stdio
    'no-process-exit': 'off', // MCP servers may need to exit

    // Security rules - extra strict
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'error',

    // Code quality
    'sonarjs/cognitive-complexity': ['error', 15],
    'sonarjs/no-duplicate-string': ['error', { threshold: 3 }],
    'sonarjs/no-identical-functions': 'error',

    // Complexity limits
    'max-len': [
      'error',
      {
        code: 100,
        tabWidth: 2,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreComments: true,
      },
    ],
    'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    'max-lines-per-function': ['error', { max: 60, skipBlankLines: true, skipComments: true }],
    complexity: ['error', 10],
    'max-depth': ['error', 4],
    'max-nested-callbacks': ['error', 3],
    'max-params': ['error', 4],

    // Disable overly strict rules
    'no-ternary': 'off',
    'one-var': 'off',
    'sort-keys': 'off',
    'id-length': 'off',
    'func-names': 'off',
    'func-style': 'off',
    'no-undefined': 'off',
    'init-declarations': 'off',
    'capitalized-comments': 'off',
    'multiline-comment-style': 'off',
  },
  overrides: [
    {
      files: ['*.config.{js,ts}'],
      rules: {
        'import/no-default-export': 'off',
        '@typescript-eslint/no-magic-numbers': 'off',
      },
    },
  ],
};
