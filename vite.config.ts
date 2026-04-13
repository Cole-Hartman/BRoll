import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Proxy /api-transcription/* → FastAPI at /* (e.g. /transcribe, /transcription/:id).
  // Set VITE_TRANSCRIPTION_API_URL to your prod/staging API (e.g. https://nas:8000) so you
  // don't need a local FastAPI — the browser still only talks to Vite (localhost:3000).
  const transcriptionTarget =
    env.VITE_TRANSCRIPTION_API_URL || 'http://127.0.0.1:8000'

  const transcriptionProxy: Record<string, unknown> = {
    target: transcriptionTarget,
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api-transcription/, ''),
  }
  if (env.VITE_TRANSCRIPTION_API_TLS_INSECURE === 'true') {
    transcriptionProxy.secure = false
  }

  const proxy: Record<string, object> = {
    '/api-transcription': transcriptionProxy as object,
  }

  if (env.VITE_IMMICH_URL) {
    proxy['/immich-api'] = {
      target: env.VITE_IMMICH_URL,
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/immich-api/, '/api'),
      secure: false,
    }
  }

  return {
    base: '/',
    plugins: [react()],
    server: {
      port: 3000,
      open: true,
      proxy,
    },
  }
})
