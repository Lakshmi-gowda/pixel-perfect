<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the existing TanStack Start routing/bootstrap and frontend design; host Python inference separately because the app runtime cannot execute FastAPI or native XGBoost.
- Route all model requests through src/api; switch the mock adapter by VITE_USE_MOCK so the future external service can replace it without UI changes.
- Validate model service URLs and HTTP/JSON responses in src/api/transport.ts; production must use an absolute HTTPS Python address so website fallback pages cannot masquerade as model responses.
- Keep shared assessment state in one React context with no browser storage so refresh clears patient values.
- Load the Three.js scene lazily after hydration and unmount it on page changes so SSR stays browser-safe and only one canvas exists.
- Derive form controls and validation from model metadata; filter forbidden target fields at both metadata and request boundaries to prevent leakage.
- Preserve separate CAD and artery feature definitions in model metadata; submit exact per-model objects and normalize nested predictions in the API adapter so one shared form and existing result displays remain unchanged.
- Centralize branding, disclaimers, risk cutoffs and editable medical copy in config/content modules so review and replacement stay consistent.
- Keep Python service source and artifact inspection under backend/; never expose trained binaries through public/ or the browser bundle because model files are private server inputs.
- Inspect serialized artifacts with an explicit allowed-class loader before implementing inference; do not run unrestricted deserialization because pickles can execute arbitrary code.
- Mount the Python development proxy before TanStack SSR middleware and deny backend files in Vite filesystem serving; ordinary proxy configuration is intercepted by the page handler, and private artifacts must stay inaccessible.
- Use an empty registry and HTTP 503 readiness on artifact-load failure; this prevents inference while keeping the health endpoint reachable for deployment checks.
