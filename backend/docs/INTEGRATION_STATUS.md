# Integration verification — 2026-10-12

## Deployed backend (single source of truth)

The frontend now targets the externally deployed Antigravity backend:
`https://cad-backend-1-k0xp.onrender.com` (set in `.env.development`, `.env.production`, `.env.example`; `VITE_USE_MOCK=false`). The earlier Lovable-generated service under `backend/` is retained as reference source only and is no longer used by the frontend.

## Verified against the deployed service (2026-10-12)

- `GET /health`: 200 `{"success":true,"data":{"status":"ok","model_loaded":true}}`.
- `GET /model-info`: 200, 52 features — 34 numeric, 18 categorical with saved labels (`Fmale`/`Male`, `N`/`Y`, `LBBB`/`N`/`RBBB`, `Moderate`/`N`/`Severe`/`mild`). Matches the trained artifact contract exactly.
- `POST /predict` with a complete 52-feature body: 200, `{"prediction":"CAD","probabilities":{"CAD":0.7821…,"Normal":0.2178…},"model_version":"1.0.0","disclaimer":"…"}`.
- `POST /predict` with missing features: `{"success":false,"error":{"code":"VALIDATION_ERROR","fields":{"missing_features":[…]}}}` — parsed by the frontend error handler.
- Response envelope `{success, data}` matches the frontend transport; no client changes were needed beyond the base URL.

## Blocker: CORS

The deployed backend rejects browser preflights from the frontend origins with HTTP 400 `Disallowed CORS origin` (tested for `http://localhost:8080` and the Lovable preview origin). Server-to-server requests succeed, so the service itself is healthy.

Required fix in the Antigravity backend CORS configuration — allow:

- `http://localhost:8080` (development preview)
- `https://id-preview--4711e78b-8b24-4fd5-9d46-b7e957db5cb3.lovable.app` (Lovable preview)
- The published `*.lovable.app` origin once published (or the custom domain)

Browser check after wiring: the assessment page reached the deployed URL and showed the clear "model service could not be reached … allowed website origins" message instead of the previous vague errors. No page errors.

## Status checklist

| Item | Status | Evidence / next action |
|---|---|---|
| Backend deployed and reachable | Yes (server-to-server) | `/health` and `/predict` return JSON 200 from curl. |
| All 52 features correctly mapped | Yes | Deployed `/model-info` matches artifact contract: 34 numeric, 18 categorical, exact saved labels. |
| Frontend connected to correct backend URL | Yes, configured | Base URL set to the Antigravity service in all env files; mock disabled. |
| Browser end-to-end prediction | Blocked on backend CORS | Add the origins above to the Antigravity service, then re-run the browser assessment flow. |
| Golden prediction verification | No | Still needs a trusted original patient row and independent expected Colab output. |

## Still outstanding

Numeric units, training encodings and clinical ranges for the 34 numeric fields remain unconfirmed (see `FEATURES.md`). No units, binary meanings, ranges or patient records were invented.
