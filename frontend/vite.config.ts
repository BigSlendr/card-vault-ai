import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  build: {
    outDir: 'dist',
  },

  server: {
    proxy: {
      // In dev, forward /api/* to the local wrangler dev server.
      // Only used when VITE_API_URL is not set (empty baseURL in api.ts).
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
