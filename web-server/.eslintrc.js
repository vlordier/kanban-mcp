module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  extends: [
    'eslint:all', // Most stringent base rules
    'plugin:@typescript-eslint/all', // All TypeScript rules
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:security/recommended-legacy', // Security rules
    'plugin:sonarjs/recommended-legacy', // Code quality rules
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

    // TypeScript specific overrides
    '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/prefer-readonly-parameter-types': 'off', // Too strict for APIs
    '@typescript-eslint/no-magic-numbers': [
      'error',
      {
        ignore: [0, 1, -1, 2, 10, 100, 1000, 200, 201, 400, 401, 403, 404, 429, 500, 503],
        ignoreArrayIndexes: true,
        ignoreDefaultValues: true,
        ignoreNumericLiteralTypes: true,
      },
    ],
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',

    // Import rules
    'import/no-default-export': 'error', // Prefer named exports
    'import/prefer-default-export': 'off',
    'import/no-unused-modules': ['error', { unusedExports: true }],
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

    // General code quality
    'no-console': 'off', // Allow console in server code for logging
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-destructuring': 'error',
    'prefer-template': 'error',
    'template-curly-spacing': 'error',

    // Security rules - extra strict for server code
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'error',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-non-literal-require': 'error',
    'security/detect-pseudoRandomBytes': 'error',

    // SonarJS code quality
    'sonarjs/cognitive-complexity': ['error', 15],
    'sonarjs/no-duplicate-string': ['error', { threshold: 3 }],
    'sonarjs/no-identical-functions': 'error',
    'sonarjs/no-redundant-boolean': 'error',
    'sonarjs/no-unused-collection': 'error',
    'sonarjs/prefer-immediate-return': 'error',

    // Line length and complexity limits
    'max-len': [
      'error',
      {
        code: 100,
        tabWidth: 2,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
        ignoreComments: true,
      },
    ],
    'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
    'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
    complexity: ['error', 12],
    'max-depth': ['error', 4],
    'max-nested-callbacks': ['error', 4],
    'max-params': ['error', 5],

    // Performance and best practices
    'no-loop-func': 'error',
    'no-new-func': 'error',
    'no-new-wrappers': 'error',
    'no-return-assign': 'error',
    'no-self-compare': 'error',
    'no-sequences': 'error',
    'no-throw-literal': 'error',
    'no-useless-call': 'error',
    'no-useless-concat': 'error',
    'no-useless-escape': 'error',
    'no-void': 'error',
    'prefer-promise-reject-errors': 'error',
    'require-await': 'error',

    // Node.js specific
    'n/prefer-global/buffer': 'error',
    'n/prefer-global/console': 'error',
    'n/prefer-global/process': 'error',
    'n/prefer-global/url': 'error',
    'n/prefer-global/url-search-params': 'error',

    // Disable some overly strict rules from eslint:all
    'no-ternary': 'off',
    'no-nested-ternary': 'error', // But keep this one
    'one-var': 'off',
    'sort-keys': 'off',
    'sort-vars': 'off',
    'id-length': 'off',
    'func-names': 'off',
    'func-style': 'off',
    'no-undefined': 'off', // TypeScript handles this better
    'init-declarations': 'off',
    'no-inline-comments': 'off',
    'line-comment-position': 'off',
    'multiline-comment-style': 'off',
    'capitalized-comments': 'off',
  },
  overrides: [
    {
      files: ['**/*.test.{ts,js}', '**/*.spec.{ts,js}', '**/test/**/*'],
      env: {
        jest: true,
      },
      rules: {
        // Relax some rules for tests
        '@typescript-eslint/no-magic-numbers': 'off',
        'max-lines-per-function': 'off',
        'sonarjs/no-duplicate-string': 'off',
        'import/no-unused-modules': 'off',
      },
    },
    {
      files: ['*.config.{js,ts}', 'jest.config.*'],
      rules: {
        // Config files can be more flexible
        'import/no-default-export': 'off',
        '@typescript-eslint/no-magic-numbers': 'off',
      },
    },
  ],
};
