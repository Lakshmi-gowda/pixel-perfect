# Integration verification — 2026-10-10

## Root cause

The frontend has no configured deployed Python HTTPS URL. `/model-api` is a development-only Vite proxy, not a hosted Python endpoint. The previous API parser attempted JSON parsing without checking content type, hiding website/access-control responses behind “unreadable response.” The local Python process was also stopped at initial inspection (connection refused); the development proxy returned a valid JSON 503 error.

Unauthenticated requests to all three hosted preview `/model-api` paths returned HTTP 401 `text/plain` from preview access control. No deployed Python environment is accessible or verified. Do not interpret a preview access response as a FastAPI response.

## Status checklist

| Item | Status | Evidence / next action |
|---|---|---|
| Backend implementation complete | Yes | Source, Docker setup and existing endpoint/validation suite present; 32 tests passed, one golden test skipped. |
| Backend deployed and reachable | No | No Python host URL supplied/configured. Deploy `backend/` privately on a Python/container host with the three artifacts and wait for JSON HTTP 200 `/health`. |
| All three artifacts loaded | Yes, locally only | Restricted loader and startup checks passed in the fresh Python environment; hosted loading remains unverified. |
| All 52 features correctly mapped | Yes, structural contract | Browser controls match every metadata name: 34 numeric and 18 categorical. All saved category options match exactly; model ordering and encoder round-trips passed. Clinical meanings/units/ranges remain unconfirmed. |
| Frontend connected to correct backend URL | No for hosted frontend; Yes locally | Local `/model-api` requests reach Python. Set `VITE_API_BASE_URL` to the deployed absolute HTTPS address, keep `VITE_USE_MOCK=false`, allow the exact frontend origin in `CORS_ORIGINS`, then update the frontend deployment. |
| End-to-end prediction verified | No | No trusted original patient row and independent expected Colab output provided. Supply those and run the golden test plus the browser assessment flow against the deployed service. |

## Observed local endpoints and browser

- `GET /health`: 200 `application/json`, model loaded true.
- `GET /model-info`: 200 `application/json`, 52 required features.
- `POST /predict` with deliberately empty inputs: 422 `application/json`, all missing fields reported. This is a validation check, not successful inference.
- CORS preflight: 200, exact allowed origin `http://localhost:8080`.
- Assessment loads actual model metadata with 34 numeric controls and 18 saved-category selectors; Analyze is disabled without the required patient values.
- A simulated HTML 502 connection failure shows a useful website-versus-model error; Try again recovers actual metadata. No browser page errors observed; screenshots inspected for preserved design and readable errors.
- Frontend tests: 15 passed, including transport configuration, HTML/plain text, empty/malformed JSON, HTTP errors, timeouts and offline behavior. Existing mock unit tests exercise only the isolated development adapter; no mock prediction was used to verify real inference.
- Pinned XGBoost 3.4.1, pandas 3.0.6, NumPy 2.5.3 and FastAPI 0.143.0 were available on PyPI and installed successfully. Do not claim they are unavailable based on an outdated version catalogue.

## Required team clarification

See `FEATURES.md` for every exact field and saved category. Numeric units, training encodings, original numeric types and clinically valid constraints were not supplied for these 34 fields:

Age, Weight, Length, BMI, DM, HTN, Current Smoker, EX-Smoker, FH, BP, PR, Edema, Typical Chest Pain, Function Class, Q Wave, St Elevation, St Depression, Tinversion, FBS, CR, TG, LDL, HDL, BUN, ESR, HB, K, Na, WBC, Lymph, Neut, PLT, EF-TTE, Region RWMA.

Provide the training data dictionary for these fields, especially encoded clinical variables, and a trusted complete row with independent reference probabilities. No units, binary meanings, clinical ranges, imputation or patient records were invented. XGBoost 3.4.1 and scikit-learn 1.6.1 are recovered serialization versions; original pandas/NumPy/joblib versions remain unknown.