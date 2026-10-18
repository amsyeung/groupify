// Daily limits for the shared AI proxy. The Workers AI free allocation (10,000 Neurons a day) is
// shared by every project on the Cloudflare account, so Groupify keeps to its own slice of it.
// No Cloudflare APIs here, so tests/ai-proxy.test.ts can run it directly.

export type Kind = 'basic' | 'arrange'

export interface Limits {
  /** Everything Groupify may spend in a day (naming, sorting and grouping by instruction). */
  dailyNeurons: number
  /** The part of dailyNeurons that grouping by instruction may use, so naming always has some left. */
  arrangeNeurons: number
  /** Groupings by instruction per install per day. */
  arrangePerClient: number
  /** Groupings by instruction per IP address per day, against made-up install ids. */
  arrangePerIp: number
}

export const DEFAULT_LIMITS: Limits = { dailyNeurons: 2000, arrangeNeurons: 1500, arrangePerClient: 3, arrangePerIp: 10 }

/** Limits from the Worker's vars (wrangler.toml), falling back to the defaults for anything missing or invalid. */
export function readLimits(vars: Partial<Record<'DAILY_NEURONS' | 'ARRANGE_NEURONS' | 'ARRANGE_PER_DAY' | 'ARRANGE_PER_IP', string>>): Limits {
  const num = (value: string | undefined, fallback: number) => {
    const n = Number(value)
    return Number.isFinite(n) && n >= 0 ? n : fallback
  }
  return {
    dailyNeurons: num(vars.DAILY_NEURONS, DEFAULT_LIMITS.dailyNeurons),
    arrangeNeurons: num(vars.ARRANGE_NEURONS, DEFAULT_LIMITS.arrangeNeurons),
    arrangePerClient: num(vars.ARRANGE_PER_DAY, DEFAULT_LIMITS.arrangePerClient),
    arrangePerIp: num(vars.ARRANGE_PER_IP, DEFAULT_LIMITS.arrangePerIp),
  }
}

export interface Today {
  spent: number
  arrangeSpent: number
  clientUses: number
  ipUses: number
}

export type Verdict = { ok: true } | { ok: false; reason: 'budget' | 'daily_limit' }

/** Whether one more call of this kind fits today's limits. */
export function check(kind: Kind, today: Today, limits: Limits): Verdict {
  if (today.spent >= limits.dailyNeurons) return { ok: false, reason: 'budget' }
  if (kind === 'basic') return { ok: true }
  if (today.clientUses >= limits.arrangePerClient || today.ipUses >= limits.arrangePerIp) return { ok: false, reason: 'daily_limit' }
  if (today.arrangeSpent >= limits.arrangeNeurons) return { ok: false, reason: 'budget' }
  return { ok: true }
}

/** The day the counts belong to: UTC, like the Workers AI allocation, so both reset at 00:00 UTC. */
export const utcDay = (now: number = Date.now()) => new Date(now).toISOString().slice(0, 10)
