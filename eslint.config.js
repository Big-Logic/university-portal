const js = require('@eslint/js');
const prettier = require('eslint-plugin-prettier/recommended');

module.exports = [
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'coverage/',
      '.env',
      '.env.local',
      '.env.*.local',
      '*.log',
      '.DS_Store',
      'prisma/migrations/',
    ],
  },
  {
    languageOptions: {
      globals: {
        require: 'readonly',
        module: 'readonly',
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
  },
  js.configs.recommended,
  prettier,
  {
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'prefer-const': 'error',
      'no-var': 'error',
      'prettier/prettier': 'error',
    },
  },
];
// 'no-console': ['warn', { allow: ['warn', 'error'] }],
