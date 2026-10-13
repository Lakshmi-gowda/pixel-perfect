# Integration verification — 2026-10-12

## Deployed backend (single source of truth)

The frontend now targets the externally deployed Antigravity backend:
`https://cad-backend-2.onrender.com` (set in `.env.development`, `.env.production`, `.env.example`; `VITE_USE_MOCK=false`). The earlier Lovable-generated service under `backend/` is retained as reference source only and is no longer used by the frontend.

## Verified against the deployed service (2026-10-12)

- `GET /health/live`: HTTP 200, `{"success":true,"data":{"status":"ok"}}`.
- `GET /health`: HTTP 200, `{"success":true,"data":{"status":"ok","model_loaded":true}}`.
- `GET /model-info`: HTTP 200, 52 features — 34 numeric, 18 categorical with exact saved labels (`Fmale`/`Male`, `N`/`Y`, `LBBB`/`N`/`RBBB`, `Moderate`/`N`/`Severe`/`mild`). Matches the trained artifact contract.
- `GET /openapi.json`: HTTP 200. `/predict` accepts `{features: {...}}`; `PredictData` specifies prediction, probabilities, model_version and disclaimer inside the success envelope.
- Numeric metadata returns `allowed_values: null`. The frontend previously rejected this nullable property; the adapter now normalizes it to undefined without modifying names, labels or clinical bounds. Regression test passes.
- `POST /predict` with `{features:{}}`: HTTP 422, `{"success":false,"error":{"code":"VALIDATION_ERROR","message":"Input feature validation failed","fields":{"missing_features":[…]}}}`. All 52 missing names are reported. This is an intentional invalid-request test, not a successful inference.
- No complete patient submission was made to this deployment: no authentic 52-feature patient row was supplied. Earlier prediction evidence concerned the previous deployment and is not verification of this one.

## Browser access verified

Both local and exact Lovable preview-origin preflights return HTTP 200 with the matching `Access-Control-Allow-Origin`, POST permission and content-type permission. Chromium read real JSON from all four GET endpoints and the HTTP 422 prediction response from both origins, without CORS errors.

The local running frontend rendered all 34 numeric controls and 18 saved-category selectors with mock mode off. Every observed model request targeted the new Render URL, not `/model-api`, localhost inference or the reference backend. Empty inputs keep Analyze disabled. No page errors occurred.

For the exact preview-origin CORS check, a minimal browser document was served at `https://id-preview--4711e78b-8b24-4fd5-9d46-b7e957db5cb3.lovable.app` to isolate CORS from editor access control. All Render requests and responses were real and unintercepted; this does not claim the hosted frontend itself was exercised. A future published/custom origin remains untested.

## Status checklist

| Item | Status | Evidence / next action |
|---|---|---|
| Backend deployed and reachable | Yes | Browser `/health` returns JSON 200 with model_loaded true. |
| All 52 features correctly mapped | Yes | Deployed `/model-info` matches artifact contract: 34 numeric, 18 categorical, exact saved labels. |
| Frontend connected to correct backend URL | Yes, configured | Base URL set to the Antigravity service in all env files; mock disabled. |
| Browser access and form metadata | Passed | Both origins can read real JSON; form displays 52 controls, no mock badge. |
| Successful browser end-to-end prediction | Not verified | Requires an authentic complete 52-feature row; none supplied. Empty submission correctly returns HTTP 422. |
| Golden prediction verification | No | Still needs a trusted original patient row and independent expected Colab output. |

## Still outstanding

Numeric units, training encodings and clinical ranges for the 34 numeric fields remain unconfirmed (see `FEATURES.md`). No units, binary meanings, ranges or patient records were invented.

## 2026-10-13 — cad-backend-ic3e.onrender.com (artery models)

- /health, /model-info: 200. CAD model 52 features; artery models LAD/LCX/RCA loaded, 56 features each, classes Normal/Stenotic.
- CORS preflight passes for localhost:8080 and the Lovable preview origin.
- /predict with all 56 features returns overall CAD probabilities plus artery_predictions {LAD, LCX, RCA} with stenotic_probability and predicted_class.
- BLOCKER (backend-side): /predict rejects the 52-feature CAD contract with 422 VALIDATION_ERROR, demanding CHF, Exertional CP, LowTH Ang and Cath as inputs. Cath is the diagnosis target — sending it would be target leakage, so the frontend will not send it. Backend must make the four artery-only features optional (skip artery predictions when absent) or accept a separate artery endpoint.
- Frontend: env URLs updated to cad-backend-ic3e; prediction adapter maps artery_predictions to vessel probabilities; form copy updated. 15 tests pass, build OK.
