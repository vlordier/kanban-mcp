module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
    jest: true,
  },
  extends: [
    'eslint:all', // Most stringent base rules
    'airbnb',
    'airbnb-typescript',
    'airbnb/hooks',
    'plugin:react/all', // All React rules
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/strict', // Strictest accessibility rules
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:@typescript-eslint/all', // All TypeScript rules
    'plugin:security/recommended-legacy', // Security rules
    'plugin:sonarjs/recommended-legacy', // Code quality rules
    'plugin:prettier/recommended', // Must be last
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  plugins: [
    'react',
    'react-hooks',
    'jsx-a11y',
    'import',
    '@typescript-eslint',
    'security',
    'sonarjs',
    'prettier',
  ],
  settings: {
    react: {
      version: 'detect',
    },
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

    // React 18+ adjustments
    'react/react-in-jsx-scope': 'off',
    'react/jsx-uses-react': 'off',

    // Reasonable overrides for the "all" config
    'react/jsx-max-depth': ['error', { max: 6 }],
    'react/jsx-max-props-per-line': ['error', { maximum: 1, when: 'multiline' }],
    'react/jsx-one-expression-per-line': ['error', { allow: 'single-child' }],
    'react/jsx-no-literals': ['error', { noStrings: true, ignoreProps: false }],
    'react/require-default-props': 'off', // TS makes this redundant
    'react/jsx-props-no-spreading': ['error', { exceptions: ['input', 'textarea'] }],

    // TypeScript specific overrides
    '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/prefer-readonly-parameter-types': 'off', // Too strict for React props
    '@typescript-eslint/no-magic-numbers': [
      'error',
      {
        ignore: [0, 1, -1, 2, 10, 100, 1000],
        ignoreArrayIndexes: true,
        ignoreDefaultValues: true,
      },
    ],

    // Import rules
    'import/no-default-export': 'off', // Required for React components
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
    'no-console': 'error',
    'no-debugger': 'error',
    'no-alert': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-destructuring': 'error',
    'prefer-template': 'error',
    'template-curly-spacing': 'error',

    // Security rules
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-unsafe-regex': 'error',

    // SonarJS code quality
    'sonarjs/cognitive-complexity': ['error', 15],
    'sonarjs/no-duplicate-string': ['error', { threshold: 3 }],
    'sonarjs/no-identical-functions': 'error',
    'sonarjs/no-redundant-boolean': 'error',
    'sonarjs/no-unused-collection': 'error',
    'sonarjs/prefer-immediate-return': 'error',

    // Accessibility - strictest settings
    'jsx-a11y/no-aria-hidden-on-focusable': 'error',
    'jsx-a11y/prefer-tag-over-role': 'error',

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
    'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
    complexity: ['error', 10],
    'max-depth': ['error', 4],
    'max-nested-callbacks': ['error', 3],
    'max-params': ['error', 4],

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

    // File naming and organization
    'filenames/match-regex': 'off', // Would need additional plugin

    // Disable some overly strict rules from eslint:all
    'no-ternary': 'off',
    'no-nested-ternary': 'error', // But keep this one
    'one-var': 'off',
    'sort-keys': 'off',
    'sort-vars': 'off',
    'id-length': 'off',
    'func-names': 'off',
    'func-style': 'off',
  },
  overrides: [
    {
      files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/test/**/*'],
      env: {
        jest: true,
      },
      rules: {
        // Relax some rules for tests
        '@typescript-eslint/no-magic-numbers': 'off',
        'max-lines-per-function': 'off',
        'sonarjs/no-duplicate-string': 'off',
        'react/jsx-no-literals': 'off',
        'no-console': 'off', // Allow console in tests
      },
    },
    {
      files: ['vite.config.ts', 'playwright.config.ts', '*.config.{js,ts}'],
      rules: {
        // Config files can be more flexible
        'import/no-default-export': 'off',
        '@typescript-eslint/no-magic-numbers': 'off',
        'no-console': 'off',
      },
    },
  ],
};
