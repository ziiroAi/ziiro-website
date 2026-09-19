import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

/**
 * Plain `vite` dev has no edge runtime, so GET /api/geo would be served as the
 * function's TypeScript source. Answer the way api/geo.ts does when Vercel
 * cannot place an IP, so the client moves on to its public IP lookups.
 */
const devGeoApi = (): Plugin => ({
  name: "ziiro:dev-api-geo",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.method !== "GET" || req.url?.split("?")[0] !== "/api/geo") return next();
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "private, no-store");
      res.end(JSON.stringify({ country: null }));
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8081,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), devGeoApi()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Give the three heaviest dependencies their own chunks. This is a
        // caching change, not a payload change: they only move on a dependency
        // upgrade, so an ordinary app deploy no longer invalidates them, and
        // 236 kB stays in the browser under the year-long immutable /assets
        // rule in vercel.json. The entry chunk drops 544 kB -> 320 kB; total
        // JS rises ~12 kB from the extra chunk boundaries, which is the trade.
        //
        // What this does NOT do is take WebGL off the critical path. ogl is
        // still modulepreloaded on the homepage because the hero imports it
        // statically (IntelligenceOrb.tsx -> CoreOrb -> ogl). Only a lazy()
        // there can defer it; the chunk boundary is already in place for when
        // that happens.
        codeSplitting: {
          groups: [
            { name: "webgl", test: /node_modules[\\/]ogl[\\/]/ },
            { name: "scroll", test: /node_modules[\\/]lenis[\\/]/ },
            { name: "toast", test: /node_modules[\\/]sonner[\\/]/ },
          ],
        },
      },
    },
  },
});
