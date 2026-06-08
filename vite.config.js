import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { computeRoute, geocodeMany } from './api/_ors.js'

// In production the /api/* endpoints are Vercel serverless functions. During
// `vite dev` there is no Vercel runtime, so this plugin serves the same logic as
// dev middleware, letting auto-fill and the schedule generator work locally when
// ORS_API_KEY is set.
function devApi(env) {
  const readJson = (req) =>
    new Promise((resolve) => {
      let raw = ''
      req.on('data', (c) => (raw += c))
      req.on('end', () => {
        try {
          resolve(JSON.parse(raw || '{}'))
        } catch {
          resolve({})
        }
      })
    })

  const handle = (fn) => async (req, res) => {
    const send = (status, obj) => {
      res.statusCode = status
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(obj))
    }
    if (req.method !== 'POST') return send(405, { error: 'Use POST' })
    const body = await readJson(req)
    try {
      send(200, await fn(body, env))
    } catch (e) {
      send(e.status || 502, { error: e.message || 'Request failed' })
    }
  }

  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use(
        '/api/route',
        handle(async (body, env) => computeRoute({ ...body, key: env.ORS_API_KEY })),
      )
      server.middlewares.use(
        '/api/geocode',
        handle(async (body, env) => ({
          results: await geocodeMany(body.addresses || [], env.ORS_API_KEY),
        })),
      )
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), devApi(env)],
  }
})
