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
});
