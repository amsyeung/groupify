// One Durable Object (SQLite storage, included in the Workers Free plan) keeps today's counts: the
// Neurons spent and how often each install and IP address grouped by instruction. Installs and
// addresses are stored only as hashes salted with the day, and every count is deleted when the
// day changes.

import { DurableObject } from 'cloudflare:workers'
import { check, utcDay, type Kind, type Limits } from './budget'

interface Sql {
  exec(query: string, ...bindings: unknown[]): { toArray(): Record<string, unknown>[] }
}

export interface Begin {
  ok: boolean
  reason?: 'budget' | 'daily_limit'
  /** Groupings by instruction this install has left today, after this one. */
  remaining?: number
}

export class Quota extends DurableObject {
  private sql: Sql

  constructor(ctx: ConstructorParameters<typeof DurableObject>[0], env: unknown) {
    super(ctx, env)
    this.sql = (ctx.storage as unknown as { sql: Sql }).sql
    this.sql.exec('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value)')
    this.sql.exec('CREATE TABLE IF NOT EXISTS uses (key TEXT PRIMARY KEY, count INTEGER NOT NULL)')
  }

  private rollover() {
    const today = utcDay()
    if (this.sql.exec("SELECT value FROM meta WHERE key = 'day'").toArray()[0]?.value === today) return
    this.sql.exec('DELETE FROM uses')
    this.sql.exec("INSERT OR REPLACE INTO meta (key, value) VALUES ('day', ?), ('spent', 0), ('arrangeSpent', 0)", today)
  }

  private meta(key: string): number {
    return Number(this.sql.exec('SELECT value FROM meta WHERE key = ?', key).toArray()[0]?.value ?? 0)
  }

  private uses(key: string | undefined): number {
    return key ? Number(this.sql.exec('SELECT count FROM uses WHERE key = ?', key).toArray()[0]?.count ?? 0) : 0
  }

  private bump(key: string | undefined, by: number) {
    if (!key) return
    this.sql.exec('INSERT INTO uses (key, count) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET count = MAX(0, count + ?)', key, Math.max(0, by), by)
  }

  /** Before an AI call: checks today's limits and, for grouping by instruction, claims one of the day's uses. */
  begin(kind: Kind, limits: Limits, client?: string, ip?: string): Begin {
    this.rollover()
    const clientKey = client && `c:${client}`
    const ipKey = ip && `i:${ip}`
    const clientUses = this.uses(clientKey)
    const verdict = check(kind, { spent: this.meta('spent'), arrangeSpent: this.meta('arrangeSpent'), clientUses, ipUses: this.uses(ipKey) }, limits)
    if (!verdict.ok) return { ok: false, reason: verdict.reason, remaining: Math.max(0, limits.arrangePerClient - clientUses) }
    if (kind === 'basic') return { ok: true }
    this.bump(clientKey, 1)
    this.bump(ipKey, 1)
    return { ok: true, remaining: Math.max(0, limits.arrangePerClient - clientUses - 1) }
  }

  /** After an AI call: adds what it cost to today's total. */
  spend(kind: Kind, neurons: number) {
    this.rollover()
    this.sql.exec("UPDATE meta SET value = value + ? WHERE key = 'spent'", neurons)
    if (kind === 'arrange') this.sql.exec("UPDATE meta SET value = value + ? WHERE key = 'arrangeSpent'", neurons)
  }

  /** Gives a use back when the AI call failed, so the user isn't charged for it. */
  refund(client?: string, ip?: string) {
    this.rollover()
    this.bump(client && `c:${client}`, -1)
    this.bump(ip && `i:${ip}`, -1)
  }
}
