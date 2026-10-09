# Heart assessment frontend

The product name, placeholder tagline and original unattributed quote are configured in `src/config/brand.ts`.

## Run
`bun install` then `bun run dev`. React 19, TypeScript, Vite, Tailwind v4, React Three Fiber and drei use the platform's existing TanStack routing. The Python FastAPI service is under `backend/` and must run on separate Python hosting. No login, database, or browser persistence is implemented.

## Actual trained model service
Mock mode is now disabled by default. Run the Python service on port 8000 for the development `/model-api` proxy; see `backend/README.md`. In production set `VITE_API_BASE_URL` to its separately deployed absolute HTTPS address. The browser calls GET `/model-info` and POST `/predict` with `{ features: {...} }`. CORS must allow the actual frontend origin. The typed API layer adapts the PRD numeric input contract and field-error arrays without changing the existing pages. Forbidden outcome columns are filtered at frontend boundaries and rejected by the backend. The supplied model supports overall CAD/Normal only; no vessel probabilities or contributions are manufactured.

The actual model metadata supplies 52 ordered inputs and 18 categorical encoders. Extracted definitions are documented in `backend/docs/FEATURES.md`. No invented clinical ranges, units or sample patients are supplied. The old seven-input mock adapter remains available only through explicit `VITE_USE_MOCK=true`; real mode never silently falls back to it. Missing vessel outputs stay neutral; explanations remain unavailable and sliders disabled without confirmed ranges.

## Privacy and safety
One shared memory-only context holds inputs and predictions; refresh clears them. Four pages: `/`, `/learn`, `/assess`, `/results`. Results without a prediction redirect to assessment. Risk bands and overlay anatomical positions require confirmation and no risk legend is shown for the overall-only model. Editable medical copy is in `src/content`; safety wording is in `src/config/disclaimer.ts`. Final branding, clinical wording approval, numeric units/ranges and a real golden-test row remain team-supplied items.

## Model
Original uploaded GLB: `public/models/heart.glb`. “human heart” by sammite, CC BY 4.0. Source: https://sketchfab.com/3d-models/human-heart-bc51630b88b94f5fb6bdaef1488041c3. Full attribution is in `public/models/ATTRIBUTION.md`. Model inspection is in `docs/MODEL_INSPECTION.md`; generic mesh names are not assigned anatomical labels. Separate LAD, LCX, RCA curves are projected onto the surface at runtime and remain explicitly schematic. No built-in animations are played.

## Tests
`bunx vitest run` checks routing, target-field exclusion, validation, probability color mapping, explicit mock-output safety and FastAPI contract adaptation. Python tests are under `backend/tests/`. No successful prediction or clinical correctness verification is claimed without the team's real row and reference Colab probabilities. Production Python hosting and the hosted frontend connection remain deployment steps.
