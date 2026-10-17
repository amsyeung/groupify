# Groupify — shared AI proxy

A Cloudflare Worker that names tab groups and sorts tabs by task with **Workers AI**, for users who turn on _Use Groupify's cloud AI_ and don't have Chrome's on-device model. The extension carries no API key.

```
extension (side panel) ──HTTPS──▶ groupify-ai.<account>.workers.dev
                                     ├─ only the extension's origins (CORS)
                                     ├─ titles and hostnames only, ≤40 tabs per request
                                     ├─ 10 requests per minute per IP
                                     └─ Workers AI, Qwen3 30B-A3B
```

**Cost.** Workers AI gives every account 10,000 Neurons a day for free. On the Workers Free plan, requests past that fail instead of being billed, and the extension falls back to naming groups by date. A request uses roughly 3 Neurons (naming) to 15 (sorting 40 tabs), so the free allocation covers several hundred sorts a day.

**Privacy.** Requests carry tab titles and hostnames, never full URLs. Nothing is logged or stored: the Worker has observability turned off and keeps no state.

## API

|                    |                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------ |
| `POST /v1/name`    | `{ "tabs": [{ "title", "site" }], "lang": "en" \| "zh-Hant" \| "zh-Hans" }` → `{ "name" }` |
| `POST /v1/cluster` | Same body → `{ "groups": [{ "name", "tabs": [1-based numbers] }] }`                        |
| `GET /health`      | `{ ok, model }`                                                                            |

Errors are JSON `{ error, message }`: `403` wrong origin, `413` body too large, `429` rate limited, `503` AI unavailable (including the daily allocation running out). The extension treats every error as "no AI".

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
