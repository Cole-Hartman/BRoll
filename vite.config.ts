import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      port: 3000,
      open: true,
      proxy: env.VITE_IMMICH_URL ? {
        '/immich-api': {
          target: env.VITE_IMMICH_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/immich-api/, '/api'),
          secure: false,
        },
      } : undefined,
    },
  }
})
