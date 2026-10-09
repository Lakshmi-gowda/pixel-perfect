// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { request as proxyRequest } from "node:http";

export default defineConfig({
  vite: {
    plugins: [{
      name: "cad-python-development-proxy",
      enforce: "pre",
      configureServer(server) {
        // Mounted before TanStack's SSR middleware; Vite's ordinary proxy
        // otherwise loses this URL to the catch-all page handler.
        server.middlewares.use("/model-api", (req, res) => {
          const upstream = proxyRequest({ hostname: "127.0.0.1", port: 8000, path: req.url, method: req.method, headers: { ...req.headers, host: "127.0.0.1:8000" } }, response => {
            res.writeHead(response.statusCode ?? 502, response.headers);
            response.pipe(res);
          });
          upstream.on("error", () => {
            if (!res.headersSent) {
              res.writeHead(503, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ success: false, error: { code: "MODEL_UNAVAILABLE", message: "The local Python model service is not running." } }));
            } else res.end();
          });
          req.pipe(upstream);
        });
      },
    }],
    server: {
      fs: { deny: ["**/.env", "**/.env.*", "**/*.{crt,pem}", "**/.git/**", "**/*.pkl", "**/backend/**"] },
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
