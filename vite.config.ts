import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const target = (port: number) => `http://localhost:${port}`

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/consent-cmd': { target: target(8080), changeOrigin: true, rewrite: (p) => p.replace(/^\/consent-cmd/, '') },
      '/consent-qry': { target: target(8081), changeOrigin: true, rewrite: (p) => p.replace(/^\/consent-qry/, '') },
      '/dashboard': { target: target(8082), changeOrigin: true },
      '/users': { target: target(8083), changeOrigin: true, rewrite: (p) => p.replace(/^\/users/, '') },
      '/billing': { target: target(8084), changeOrigin: true, rewrite: (p) => p.replace(/^\/billing/, '') },
      '/promotions': { target: target(8085), changeOrigin: true, rewrite: (p) => p.replace(/^\/promotions/, '') },
      '/audit': { target: target(8086), changeOrigin: true, rewrite: (p) => p.replace(/^\/audit/, '') },
      '/kc-token': { target: 'http://localhost:8180', changeOrigin: true, rewrite: (p) => p.replace(/^\/kc-token/, '') },
    },
  },
})
