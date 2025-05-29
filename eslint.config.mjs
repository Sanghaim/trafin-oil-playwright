import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  tseslint.configs.strict,
  {
    rules: {
      quotes: [2, 'single', { avoidEscape: true }],
      semi: ['error', 'never'],
      'object-curly-spacing': ['error', 'always'],
      'comma-dangle': ['error', {
        'arrays': 'always-multiline',
        'objects': 'always-multiline',
      }],
      'newline-before-return': ['error'],
    },
  },
  globalIgnores(['./playwright-report', './test-results']),
])