// Groupify's shared AI proxy: a Cloudflare Worker that names tab groups and sorts tabs by task
// with Workers AI, so the extension needs no API key. Text is never logged or stored.

import { clusterPrompt, HttpError, namePrompt, parseClusters, parseName, parseRequest } from './prompts'

interface Env {
  AI: { run(model: string, input: object): Promise<{ response?: unknown }> }
  LIMITER: { limit(options: { key: string }): Promise<{ success: boolean }> }
  /** Comma-separated chrome-extension:// origins allowed to call the proxy. */
  ALLOWED_ORIGINS: string
  MODEL: string
}

const MAX_BODY = 16 * 1024

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin') ?? ''
    const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    const cors: Record<string, string> = allowed.includes(origin)
      ? {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          Vary: 'Origin',
        }
      : {}

    if (url.pathname === '/health') return json({ ok: true, model: env.MODEL }, 200, cors)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

    try {
      if (!cors['Access-Control-Allow-Origin']) throw new HttpError(403, 'forbidden_origin', 'Only the Groupify extension can use this proxy')
      if (request.method !== 'POST' || (url.pathname !== '/v1/name' && url.pathname !== '/v1/cluster'))
        throw new HttpError(404, 'not_found', 'Unknown route')

      const raw = await request.text()
      if (raw.length > MAX_BODY) throw new HttpError(413, 'body_too_large', 'Request body too large')
      const req = parseRequest(raw)

      // Per-IP, 10 requests a minute (wrangler.toml). The account's free daily allocation caps the total.
      const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
      if (!(await env.LIMITER.limit({ key: ip })).success) throw new HttpError(429, 'rate_limited', 'Too many requests, try again in a minute')

      const naming = url.pathname === '/v1/name'
      let answer: unknown
      try {
        answer = (
          await env.AI.run(env.MODEL, { messages: naming ? namePrompt(req) : clusterPrompt(req), max_tokens: naming ? 60 : 600, temperature: 0.2 })
        ).response
      } catch {
        // Includes the free daily allocation running out: the extension falls back to naming by date.
        throw new HttpError(503, 'ai_unavailable', 'The AI model is unavailable right now')
      }
      return naming ? json({ name: parseName(answer) }, 200, cors) : json({ groups: parseClusters(answer, req.tabs.length) }, 200, cors)
    } catch (err) {
      const e = err instanceof HttpError ? err : new HttpError(500, 'internal', 'Something went wrong')
      return json({ error: e.code, message: e.message }, e.status, cors)
    }
  },
}
