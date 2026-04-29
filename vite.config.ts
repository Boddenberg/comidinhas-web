import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiTarget = 'https://comidinhas-bff-production.up.railway.app'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        changeOrigin: true,
        target: apiTarget,
      },
      '/health': {
        changeOrigin: true,
        target: apiTarget,
      },
    },
  },
})
