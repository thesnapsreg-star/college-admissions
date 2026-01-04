import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  // Load .env from project root (parent directory)
  const envDir = resolve(__dirname, '..')
  const env = loadEnv(mode, envDir, '')
  const clientPort = parseInt(env.CLIENT_PORT) || 3000
  const serverPort = parseInt(env.SERVER_PORT) || 3001

  return {
    plugins: [react()],
    server: {
      port: clientPort,
      proxy: {
        '/api': {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true
        }
      }
    }
  }
})