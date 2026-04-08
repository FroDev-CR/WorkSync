import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/webhook': {
        target: 'https://hook.us2.make.com',
        changeOrigin: true,
        rewrite: (path) => '/1gmk49s06qr9lfcd1rq29oj3rmju501p',
      },
    },
  },
})
