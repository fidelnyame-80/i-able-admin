import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    hmr: true,
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    minify: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
