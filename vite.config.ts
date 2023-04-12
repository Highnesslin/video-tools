import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isDev = process.env.NODE_ENV === 'development'

export default defineConfig({
  plugins: isDev ? [react()] : [],
  build: {
    lib: {
      entry: './src/capture.worker.ts',
      name: 'cheetahCapture',
      fileName: () => 'capture.worker.js',
      formats: ['iife'],
    },
  },
})
