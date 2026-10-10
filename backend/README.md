# Aurapulse CAD FastAPI service

This is a **separately hosted Python backend**, not a Lovable server function. The existing frontend design and four routes are preserved. No accounts, database, patient storage, retraining, fabricated predictions or vessel models are added.

## Inspection findings

All three supplied artifacts load successfully with an explicit deserialization class allowlist. The uploaded encoder filename ends `_1.pkl`; its unchanged bytes are stored under the PRD canonical filename. The model is `xgboost.sklearn.XGBClassifier`, binary logistic, 52 features in the exact metadata order, classes `[0, 1]`. Metadata maps `Normal=0`, `CAD=1`. All 18 categorical encoders round-trip their saved classes. `Sex` labels are exactly `Fmale` and `Male`; do not normalize them.

See `docs/FEATURES.md` for the complete table and `docs/ARTIFACT_INSPECTION.json` for metadata, hashes, encoder classes, feature order and versions. Numeric fields: 34. No numeric training dtypes, units, clinical bounds, imputation statistics, original pandas/NumPy/joblib versions or real patient rows are recorded. Per the approved PRD flow, require all inputs, accept finite JSON numbers, convert to floats, encode only with saved `transform`, then order a one-row pandas frame. Do not assume binary flags or ranges from clinical-sounding names.

Recovered training versions: XGBoost **3.4.1** from serialized booster, scikit-learn **1.6.1** from encoder state. pandas **3.0.6**, NumPy **2.5.3**, joblib **1.6.0** are tested compatible versions, **not claimed as original Colab versions**. Production dependency pins were checked against PyPI and audited with pip-audit; no known advisories found in that audit. Re-audit before production and do not casually upgrade serialization dependencies. Restricted deserialization reduces exposure but is not a sandbox; only use these team-owned artifacts in isolated private Python hosting.

## Run

From `backend/`:

```sh
python3.13 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/python scripts/inspect_artifacts.py --artifacts-dir app/ml/artifacts
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-access-log
```

Configuration is read from environment variables. `.env.example` documents values; the service does not implicitly load `.env`. Use your host’s environment configuration or export variables in your shell. `ARTIFACTS_DIR` may point to a private mounted volume. Keep model files out of public URLs, CDNs, browser bundles and frontend build output.

## Endpoints

- `GET /health`: `{success:true,data:{status:"ok",model_loaded:true}}`; HTTP 503 with `success:false`, a safe error and `data.model_loaded:false` if loading fails.
- `GET /model-info`: success envelope with model name, content-hash version, `feature_count:52`, ordered `features:[{name,type:"numeric"|"categorical",required:true,allowed_values?:[...] }]` and `classes:["Normal","CAD"]`. No private paths or model internals.
- `POST /predict`: `Content-Type: application/json`, body `{ "features": { ...exactly 52 named values... } }`. Categories must use saved labels. Success: `{success:true,data:{prediction:"CAD"|"Normal",probabilities:{CAD:number,Normal:number},model_version:string,disclaimer:string}}`. Probabilities are direct `predict_proba` values, not rounded, calibrated or rescaled. Predicted class comes from `predict()` mapped through metadata. Vessel probabilities and contributions are omitted, not synthesized.

Error envelope: `{success:false,error:{code,message,fields?:{feature:[reason]}}}`. Missing/unknown/excluded keys, categories and numeric types return 422 `VALIDATION_ERROR`, all errors at once. Malformed JSON, duplicate keys, invalid body or content type: 400 `INVALID_REQUEST`. Request body over `MAX_BODY_BYTES`: 413 `REQUEST_TOO_LARGE`. Model unavailable: 503. Unexpected failure: 500 safe generic message. No patient values are logged.

Startup loads the artifacts once per worker into the `cad` model registry and checks feature count/order, excluded fields, all 18 encoders and target mapping. The PRD simultaneously requests exiting on load failure and a live 503 health endpoint; these cannot coexist. This service chooses **fail-closed readiness**: loud startup logs, empty registry, health 503, and no inference/metadata responses. A hosting readiness probe prevents traffic until healthy.

## Frontend connection

### Connection diagnosis (2026-10-10)

No deployed Python service URL has been supplied or verified. Requests to the hosted preview's `/model-api/health`, `/model-api/model-info` and `/model-api/predict` returned HTTP 401 plain-text `Unauthorized` from preview access control, not FastAPI. This does not prove a Python deployment exists. `/model-api` is only a Vite development proxy: it is not included in hosted builds. The local Python process was also stopped when rechecked; the development proxy correctly returned JSON HTTP 503.

The previous client attempted `response.json()` on every response, obscuring website fallbacks, access-control pages and empty responses behind “unreadable response.” The client now validates hosted HTTPS configuration, content type, HTTP status and response shape and distinguishes connection failures and timeouts. The supplied frontend code already maps all 52 model inputs (34 numeric, 18 categorical); seven fields belong only to the explicitly selected mock adapter.

To complete hosted integration: deploy this `backend/` Docker build context with private artifacts to a Python/container host, wait for `/health` to return JSON HTTP 200, set `ENV=production` and `CORS_ORIGINS` to the exact frontend origin, then set frontend `VITE_USE_MOCK=false` and `VITE_API_BASE_URL` to that service's absolute HTTPS URL and update the frontend deployment. Do not set it to the preview URL or `/model-api`. No production model loading or end-to-end prediction verification is claimed without that host and a trusted original row/reference.

Development uses the existing Vite server’s `/model-api` proxy to `127.0.0.1:8000` and `VITE_USE_MOCK=false`. This proxy and the locally started Python process are **development only**, not a deployed Python host. Start both services for local use. For the published frontend set `VITE_API_BASE_URL` to the deployed Python service’s absolute **HTTPS** URL, keep mock mode false, and rebuild/redeploy the frontend. If the address is missing, the frontend shows an unavailable error rather than using fake results. Configure `CORS_ORIGINS` with the exact published/preview frontend origins; never `*`. No cookies, credentials or private browser API keys are required.

The API client translates `numeric` into existing numeric controls and joins field-error arrays into readable inline messages. The exact 52 inputs replace the old seven mock inputs when metadata loads. Overall CAD/Normal results display in the existing layout; arteries remain neutral, explanations unavailable, and sliders disabled because no ranges are supplied.

## Tests

```sh
.venv/bin/pytest -q
# When the team supplies a trusted original row/reference:
GOLDEN_FIXTURE=/private/team-golden.json .venv/bin/pytest -q
```

Golden fixture shape: `{features:{...},prediction:"CAD"|"Normal",probabilities:{CAD:<Colab value>,Normal:<Colab value>}}`. Do not generate a fixture from this API; that would be circular validation. No patient examples are shipped. Tests check actual loading, all encoder round-trips, health, metadata, missing/extra/excluded inputs, invalid numbers/categories, malformed requests, duplicate keys, CORS, limits and fail-closed startup. Only the golden test is skipped without team evidence. This means **successful inference and prediction correctness are not yet verified**, even if model loading and failure paths pass.

## Deployment

Deploy **backend/** as a private repository or build context on Render/Railway or another Python/container host. Include the three private artifacts or mount them from private storage. Do not deploy the root frontend project as the Python service.

```sh
docker build -t aurapulse-cad .
docker run --rm -p 8000:8000 \
  -e CORS_ORIGINS=https://YOUR_ACTUAL_FRONTEND_ORIGIN \
  aurapulse-cad
```

Replace the example origin with your actual origin. Docker runs as a non-root user and supports the host’s `PORT`. Native start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --no-access-log`; build command: `pip install --upgrade pip && pip install -r requirements.txt`. Set `ENV=production`, `CORS_ORIGINS`, optionally `ARTIFACTS_DIR`, `LOG_LEVEL`, `MAX_BODY_BYTES`; readiness path `/health`. Put TLS/HTTPS in front of the service and prevent public access to the artifact directory. Optional proxy-level rate limiting is advisable before public clinical use. Free hosts may sleep. No Python production deployment or hosted frontend connection is claimed until you provide a reachable deployed service URL.