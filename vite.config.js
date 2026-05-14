import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  server: { port: 5173 },
  test: {
    environment: 'jsdom',
    environmentMatchGlobs: [['tests/main/**', 'node']],
    setupFiles: [path.resolve(__dirname, 'tests/setup.js')],
    globals: true,
    include: ['tests/**/*.test.{js,jsx}', 'src/**/*.test.{js,jsx}'],
    root: path.resolve(__dirname),
  },
})
