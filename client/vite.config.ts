import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Docker'dan dışarıya erişim için
    port: 5173,
    watch: {
      usePolling: true, // Docker'da hot-reload için gerekli
    },
    proxy: {
      // Development modunda API isteklerini backend'e yönlendir
      '/api': {
        target: 'http://backend:8080', // Docker network'te backend servisi
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
  },
})
