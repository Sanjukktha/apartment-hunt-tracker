import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { computeRoute } from './api/_ors.js'

// In production the /api/route endpoint is a Vercel serverless function. During
// `vite dev` there is no Vercel runtime, so this plugin serves the same logic as
// dev middleware, letting auto-fill work locally when ORS_API_KEY is set.
function orsDevApi(env) {
  return {
    name: 'ors-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/route', (req, res) => {
        const send = (status, obj) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(obj))
        }
        if (req.method !== 'POST') return send(405, { error: 'Use POST' })
        let raw = ''
        req.on('data', (c) => (raw += c))
        req.on('end', async () => {
          let body = {}
          try {
            body = JSON.parse(raw || '{}')
          } catch {
            // ignore, treated as missing fields
          }
          try {
            const data = await computeRoute({ ...body, key: env.ORS_API_KEY })
            send(200, data)
          } catch (e) {
            send(e.status || 502, { error: e.message || 'Route lookup failed' })
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), orsDevApi(env)],
  }
})
