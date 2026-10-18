// Groupify's shared AI proxy: a Cloudflare Worker that names tab groups, sorts tabs by task and
// groups them by the user's instruction with Workers AI, so the extension needs no API key. Text is
// never logged or stored.

import { readLimits, utcDay, type Kind } from './budget'
import {
  arrangePrompt,
  clusterPrompt,
  hasBrokenText,
  HttpError,
  namePrompt,
  neuronsFor,
  parseArrangement,
  parseArrangeRequest,
  parseClusters,
  parseName,
  parseRequest,
  type Usage,
} from './prompts'
import type { Begin } from './quota'

export { Quota } from './quota'

interface QuotaStub {
  begin(kind: Kind, limits: ReturnType<typeof readLimits>, client?: string, ip?: string): Promise<Begin>
  spend(kind: Kind, neurons: number): Promise<void>
  refund(client?: string, ip?: string): Promise<void>
}

interface Env {
  AI: { run(model: string, input: object): Promise<{ response?: unknown; usage?: Usage }> }
  LIMITER: { limit(options: { key: string }): Promise<{ success: boolean }> }
  QUOTA: { idFromName(name: string): unknown; get(id: unknown): QuotaStub }
  /** Comma-separated chrome-extension:// origins allowed to call the proxy. */
  ALLOWED_ORIGINS: string
  MODEL: string
  DAILY_NEURONS?: string
  ARRANGE_NEURONS?: string
  ARRANGE_PER_DAY?: string
  ARRANGE_PER_IP?: string
}

interface Ctx {
  waitUntil(promise: Promise<unknown>): void
}

const MAX_BODY = 24 * 1024
const ROUTES: Record<string, 'name' | 'cluster' | 'arrange'> = { '/v1/name': 'name', '/v1/cluster': 'cluster', '/v1/arrange': 'arrange' }
const MAX_TOKENS = { name: 60, cluster: 600, arrange: 800 }

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
}

/** A day-salted hash, so stored counts can't be traced back to an install or address, or linked across days. */
async function hash(day: string, value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`groupify:${day}:${value}`))
  return [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export default {
  async fetch(request: Request, env: Env, ctx: Ctx): Promise<Response> {
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
      const route = ROUTES[url.pathname]
      if (request.method !== 'POST' || !route) throw new HttpError(404, 'not_found', 'Unknown route')

      const raw = await request.text()
      if (raw.length > MAX_BODY) throw new HttpError(413, 'body_too_large', 'Request body too large')
      const req = route === 'arrange' ? parseArrangeRequest(raw) : parseRequest(raw)

      // Per-IP, 10 requests a minute (wrangler.toml).
      const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
      if (!(await env.LIMITER.limit({ key: ip })).success) throw new HttpError(429, 'rate_limited', 'Too many requests, try again in a minute')

      // Today's limits (budget.ts): Groupify's share of the account's Neurons, and uses per install and IP.
      const kind: Kind = route === 'arrange' ? 'arrange' : 'basic'
      const limits = readLimits(env)
      const quota = env.QUOTA.get(env.QUOTA.idFromName('global'))
      const day = utcDay()
      const client = 'client' in req ? await hash(day, req.client) : undefined
      const ipKey = kind === 'arrange' ? await hash(day, ip) : undefined
      const verdict = await quota.begin(kind, limits, client, ipKey)
      if (!verdict.ok) {
        if (verdict.reason === 'daily_limit') throw new HttpError(429, 'daily_limit', 'No groupings by instruction left today')
        throw new HttpError(503, 'budget', 'Groupify’s cloud AI has reached today’s limit')
      }

      const messages = 'instruction' in req ? arrangePrompt(req) : route === 'name' ? namePrompt(req) : clusterPrompt(req)
      const input = { messages, max_tokens: MAX_TOKENS[route], temperature: 0.2 }
      const promptChars = messages.reduce((n, m) => n + m.content.length, 0)
      let neurons = 0
      const run = async () => {
        const result = await env.AI.run(env.MODEL, input)
        neurons += neuronsFor(result.usage, promptChars, JSON.stringify(result.response ?? '').length)
        return result.response
      }
      let answer: unknown
      try {
        answer = await run()
        // Qwen now and then cuts a Chinese character in half; one retry usually fixes it.
        if (hasBrokenText(answer)) answer = await run()
      } catch {
        // Includes the account's free daily allocation running out: the extension falls back without AI.
        if (kind === 'arrange') ctx.waitUntil(quota.refund(client, ipKey))
        throw new HttpError(503, 'ai_unavailable', 'The AI model is unavailable right now')
      } finally {
        if (neurons) ctx.waitUntil(quota.spend(kind, neurons))
      }

      if ('instruction' in req) return json({ ...parseArrangement(answer, req.tabs.length), remaining: verdict.remaining }, 200, cors)
      return route === 'name' ? json({ name: parseName(answer) }, 200, cors) : json({ groups: parseClusters(answer, req.tabs.length) }, 200, cors)
    } catch (err) {
      const e = err instanceof HttpError ? err : new HttpError(500, 'internal', 'Something went wrong')
      return json({ error: e.code, message: e.message }, e.status, cors)
    }
  },
}
