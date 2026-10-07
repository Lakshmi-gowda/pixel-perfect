# Heart assessment frontend

The product name, placeholder tagline and original unattributed quote are configured in `src/config/brand.ts`.

## Run
`bun install` then `bun run dev`. React 19, TypeScript, Vite, Tailwind v4, React Three Fiber and drei use the platform's existing TanStack routing. No backend, login, database, or browser persistence is implemented.

## Future external model service
Set `VITE_USE_MOCK=false` and `VITE_API_BASE_URL` to the FastAPI service address. The browser calls GET `/model-info` and POST `/predict` with `{ features: {...} }`. Enable CORS on that service. Responses can be direct objects or `{ success, data | error }` envelopes. See `src/api/types.ts` for the expected feature schema and contribution format. Unknown extra fields are discarded. Forbidden outcome columns are filtered from both metadata and submitted inputs.

The example development metadata has seven inputs, not the final 52-feature clinical schema. No invented clinical ranges, units or patient sample records are supplied. `src/api/mock.ts` contains deterministic interface-test output only, never a trained medical model. Mock mode shows a global badge. What-if intervals in mock mode are explicitly interface-test intervals, not clinical bounds. Real mode requires model-provided min/max for sliders.

## Privacy and safety
One shared memory-only context holds inputs and predictions; refresh clears them. Four pages: `/`, `/learn`, `/assess`, `/results`. Results without a prediction redirect to assessment. Risk bands and overlay anatomical positions require confirmation. Editable medical copy is in `src/content`; safety wording is in `src/config/disclaimer.ts`. Final logo, tagline, clinical wording approval, exact metadata and real sample rows remain team-supplied items.

## Model
Original uploaded GLB: `public/models/heart.glb`. “human heart” by sammite, CC BY 4.0. Source: https://sketchfab.com/3d-models/human-heart-bc51630b88b94f5fb6bdaef1488041c3. Full attribution is in `public/models/ATTRIBUTION.md`. Model inspection is in `docs/MODEL_INSPECTION.md`; generic mesh names are not assigned anatomical labels. Separate LAD, LCX, RCA curves are projected onto the surface at runtime and remain explicitly schematic. No built-in animations are played.

## Tests
`bunx vitest run` checks routing, target-field exclusion, validation, probability color mapping and mock-output safety. Browser checks cover the full mock flow, selection, what-if updates, navigation guards, and mobile layouts. Physical-device performance and the future real service remain unverified.
