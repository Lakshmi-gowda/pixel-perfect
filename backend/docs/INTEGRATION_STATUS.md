# Integration verification — 2026-10-12

## Current verification — 2026-10-13, updated cad-backend-2 deployment

- Frontend development, production and example configurations use only `https://cad-backend-2.onrender.com`, mock mode off; retained Python source is not used.
- `/health`: HTTP 200. CAD, LAD, LCX and RCA all report loaded, with 52/55/55/55 features respectively and no load errors.
- `/model-info` and `/openapi.json`: HTTP 200. CAD has 34 numeric and 18 categorical inputs. Arteries share those inputs plus CHF (`N`/`Y`), Exertional CP (`N`), and LowTH Ang (`N`/`Y`). Cath/LAD/LCX/RCA are absent from both contracts. The previous 56-feature/target-leakage blocker is resolved in this deployment.
- Verified endpoint: `POST /predict` accepts `{cad_features: {...52 inputs}, artery_features: {...55 inputs}}`. Response data nests `cad_prediction` and `artery_predictions`; no separate per-artery endpoint is documented or invented.
- Existing form now renders the union of 55 verified inputs with the same design; the API adapter selects each model's exact names independently. Nested CAD and artery outputs map into the existing result displays. Missing CAD output is an error; missing artery scores remain unavailable, never fabricated.
- Browser verification: 34 numeric controls and 21 saved-category selectors, all three extra fields present, zero forbidden target controls, no page errors. Actual Render requests are used throughout.
- Exact preview-origin preflight passes. Chromium can read HTTP 200 health JSON from that origin (minimal document used to isolate access-control from CORS; no hosted-app end-to-end claim).
- Invalid `POST /predict` with both empty feature objects returns HTTP 422 `VALIDATION_ERROR`, listing missing CAD features. This confirms request parsing and error visibility, not successful inference.
- 16 targeted frontend tests pass, including separate request selection, target exclusion, nested result parsing, missing outputs and transport errors; preview build reports OK.
- **Not complete:** no authentic complete 55-input patient row has been supplied. Successful deployed prediction and assessment-to-results display of all four actual outputs remain unverified. No synthetic patient row was submitted. Independent golden verification still requires trusted reference probabilities.

The sections below are historical checks, not evidence for the current deployment.

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
