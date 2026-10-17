# Groupify website

The home page and privacy policy at <https://groupify.aoricreative.com>, served by Cloudflare as static files (no build step, no scripts, nothing loaded from other sites).

- `public/index.html`: home page
- `public/privacy/index.html`: privacy policy, linked from the Chrome Web Store listing and the extension's settings
- `public/_headers`: security headers, including a Content-Security-Policy that allows only this site's own files

## Deploy

```bash
cd website
npx wrangler deploy
```

`wrangler.toml` binds the site to `groupify.aoricreative.com`; Cloudflare creates the DNS record and certificate.

## Updating the privacy policy

When the extension's data handling changes, update `public/privacy/index.html`, change the _Last updated_ date, deploy, and mention the change in the release notes.
