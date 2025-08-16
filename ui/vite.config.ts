import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    proxy: {
      // Proxy API requests to LocalStripe server
      '/v1': {
        target: 'http://localhost:8420',
        changeOrigin: true,
        secure: false,
      },
      // Proxy config endpoints
      '/_config': {
        target: 'http://localhost:8420',
        changeOrigin: true,
        secure: false,
      },
      // Proxy Stripe Elements JS
      '/js.stripe.com': {
        target: 'http://localhost:8420',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
