module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:security/recommended-legacy',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:prettier/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
    'security',
    'import',
    'prettier',
  ],
  rules: {
    'prettier/prettier': 'error',
    'no-console': 'off', // Allow in root config scripts
    'import/no-unresolved': 'off', // Skip for workspace packages
  },
  overrides: [
    {
      files: ['*.config.{js,ts}', '*.mjs'],
      rules: {
        'import/no-default-export': 'off',
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
};