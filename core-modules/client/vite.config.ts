import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function startApiServer() {
  return {
    name: 'start-api-server',
    configureServer() {
      import('../server/server.js').catch((err) => {
        console.error('[API] Failed to start server:', err.message)
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), startApiServer()],
    server: {
      port: parseInt(env.PORT || '5173'),
      proxy: {
        '/api': {
          target: 'http://localhost:5001',
          changeOrigin: true,
        },
      },
    },
  }
})
