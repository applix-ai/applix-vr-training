# Security & hardening backlog — applix-vr-training

Status legend: `[ ]` to do · `[~]` partially done · `[x]` done

This site is a **static** landing page (no backend, no forms, no user data), so the
surface is small. The items below are hardening / defense-in-depth to revisit later.

## Done (2026-06-30)
- [x] **Security response headers** added in `render.yaml`: CSP, `X-Frame-Options: DENY`
  (anti-clickjacking), `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, `Strict-Transport-Security` (HSTS).
- [x] **CSP hardened to `script-src 'self'`** by moving inline JS to `app.js` and removing
  all inline `onclick` handlers. Scripts can no longer be injected inline.
- [x] **Split caching** — HTML `no-cache` (instant updates), assets cached 30 days.

## To consider / harden later

- [ ] **Self-host fonts + drop third-party CDNs.** We currently load CSS/fonts from
  `fonts.googleapis.com`, `fonts.gstatic.com`, and `fontshare.com`. These origins are
  trusted in the CSP; a compromise there could inject CSS. Self-hosting removes the
  supply-chain dependency and lets us tighten CSP to `style-src 'self'` /
  `font-src 'self'`. (Also a perf win: fewer DNS/TLS handshakes.)

- [ ] **Subresource Integrity (SRI).** If we keep any third-party `<link>`/`<script>`
  from a CDN, add `integrity=` + `crossorigin`. Note Google Fonts' dynamic CSS can't be
  SRI-pinned — another reason to self-host.

- [ ] **Tighten CSP further.** Remaining relaxations:
  - `style-src 'unsafe-inline'` is still required because of inline `style="..."`
    attributes (in HTML and generated in `app.js`). Move styling to classes to drop it.
  - Once fonts are self-hosted, remove the `fonts.googleapis.com` / `fontshare.com`
    allowances.
  - Consider adding CSP reporting (`report-to` / `report-uri`) to catch violations.

- [ ] **`innerHTML` string-building is a latent XSS pattern.** `app.js` builds
  `card-rows`, `seq-pins`, and `step-selector` via `innerHTML`. Safe today because the
  `STEPS` data is hardcoded — but if any of that content ever becomes dynamic (CMS,
  query param, API, form echo), switch to `textContent` / DOM builders or sanitize first.

- [ ] **HSTS `includeSubDomains` / preload.** Current header includes `includeSubDomains`.
  Before submitting to the HSTS preload list, confirm **every** subdomain of the
  production domain (e.g. `applix.ai`) is served over HTTPS, or preload will break them.
  Add `; preload` only after that check.

- [ ] **PR preview visibility.** `pullRequestPreviewsEnabled: true` publishes a public URL
  for every PR (incl. work-in-progress copy). Fine for marketing; just be aware. Disable
  or gate if previews should stay private.

- [ ] **Repo hygiene.** Ensure a `.gitignore` excludes `.DS_Store` and other OS/editor
  cruft so it never ships in the deploy.

- [ ] **Future WebXR note (not a bug — a reminder).** If the site ever embeds a live
  WebXR/VR demo, the current `Permissions-Policy` blocks the relevant features. Add
  `xr-spatial-tracking=(self)` (and camera/mic as needed) at that time.

- [ ] **Dependency/headers regression check.** Re-run an observatory scan
  (e.g. securityheaders.com / Mozilla Observatory) after deploy to confirm headers land,
  and again whenever `render.yaml` changes.
