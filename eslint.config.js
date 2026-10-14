import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),

  // ----- Frontend: src/ (React + browser) -----
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },

  // ----- Backend: server/auth/ + api/ (Vercel Function) (Node.js, ESM) -----
  {
    files: ['server/**/*.js', 'api/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,   // เพิ่ม process, __dirname, module, Buffer ฯลฯ
      ecmaVersion: 'latest',
      sourceType: 'module',    // เพราะ server/auth เขียนเป็น ESM (import/export)
    },
  },
])