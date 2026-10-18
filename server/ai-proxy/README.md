# Groupify — shared AI proxy

A Cloudflare Worker that names tab groups, sorts tabs by task and groups them by the user's instruction with **Workers AI**, for users who turn on _Use Groupify's cloud AI_ and don't have Chrome's on-device model. The extension carries no API key.

```
extension (side panel) ──HTTPS──▶ groupify-ai.<account>.workers.dev
                                     ├─ only the extension's origins (CORS)
                                     ├─ titles and hostnames only, ≤40 tabs per request (≤60 by instruction)
                                     ├─ 10 requests per minute per IP
                                     ├─ daily limits, counted in a Durable Object
                                     └─ Workers AI, Qwen3 30B-A3B
```

**Cost.** Workers AI gives every account 10,000 Neurons a day for free, shared by every project on the account. On the Workers Free plan, requests past that fail instead of being billed. A request uses roughly 3 Neurons (naming), 15 (sorting 40 tabs) or 20 (grouping by instruction).

**Daily limits** (`[vars]` in `wrangler.toml`, reset at 00:00 UTC like the free allocation):

| Var               | Default | Meaning                                                                                         |
| ----------------- | ------- | ----------------------------------------------------------------------------------------------- |
| `DAILY_NEURONS`   | 2000    | Groupify's share of the account's 10,000; the rest stays free for other projects on the account |
| `ARRANGE_NEURONS` | 1500    | The part grouping by instruction may use, so naming always has some left                        |
| `ARRANGE_PER_DAY` | 3       | Groupings by instruction per install                                                            |
| `ARRANGE_PER_IP`  | 10      | Groupings by instruction per IP address, against made-up install IDs                            |

Neurons are worked out from the token counts Workers AI returns, at Qwen3 30B-A3B's price (`NEURONS_PER_M` in `src/prompts.ts`; update it with the model). When Groupify's share runs out, the extension falls back to naming groups by date. Change a limit by editing the var and deploying again.

**Privacy.** Requests carry tab titles and hostnames, never full URLs, and the instruction when grouping by instruction. None of it is logged or stored: the Worker has observability turned off. The `Quota` Durable Object (SQLite, included in the Workers Free plan) keeps only today's counts: Neurons spent, and uses per install ID and per IP address, both as SHA-256 hashes salted with the date. Everything is deleted when the day changes.

## API

|                    |                                                                                                                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /v1/name`    | `{ "tabs": [{ "title", "site" }], "lang": "en" \| "zh-Hant" \| "zh-Hans" }` → `{ "name" }`                                                                                                         |
| `POST /v1/cluster` | Same body → `{ "groups": [{ "name", "tabs": [1-based numbers] }] }`                                                                                                                                |
| `POST /v1/arrange` | `{ "instruction", "tabs": [{ "title", "site", "group" }], "locked": [names], "lang", "client": install UUID }` → `{ "groups": [{ "name", "color"?, "tabs" }], "ungroup": [numbers], "remaining" }` |
| `GET /health`      | `{ ok, model }`                                                                                                                                                                                    |

Errors are JSON `{ error, message }`: `403` wrong origin, `413` body too large, `429` rate limited (`rate_limited`) or out of today's groupings by instruction (`daily_limit`), `503` Groupify's daily share used up (`budget`) or AI unavailable (`ai_unavailable`). The extension treats every error as "no AI".

## Deploy

Needs a Cloudflare account (the free plan is enough).

```bash
npx wrangler login
cd server/ai-proxy
npx wrangler deploy
```

Wrangler prints the Worker's URL. Put it in `CLOUD_AI_URL` in `src/lib/cloud.ts`.

`ALLOWED_ORIGINS` in `wrangler.toml` lists the store build and the unpacked build loaded from `groupify/dist`. An unpacked extension's ID comes from its folder path, so a build loaded from elsewhere needs its `chrome-extension://<id>` added there.

To watch usage: Cloudflare dashboard → _AI_ → _Workers AI_.
