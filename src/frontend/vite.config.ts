import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __filename: string = fileURLToPath(import.meta.url)
const __dirname: string = dirname(__filename)

export default defineConfig({
  root: resolve(__dirname, 'renderer'),
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'renderer', 'src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
})
