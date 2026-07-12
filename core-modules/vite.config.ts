import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function startApiServer() {
  return {
    name: 'start-api-server',
    configureServer() {
      import('./server/server.js').catch((err) => {
        console.error('[API] Failed to start server:', err.message)
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), startApiServer()],
    root: resolve(__dirname, 'client'),
    server: {
      port: parseInt(env.PORT || '5173'),
      proxy: {
        '/api': {
          target: 'http://localhost:5001',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: resolve(__dirname, 'client/dist'),
    },
  }
})
