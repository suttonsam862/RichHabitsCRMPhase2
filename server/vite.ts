import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
const viteLogger = createLogger();
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
/**
 * Extensible API route detection framework
 * Add new API route patterns here as needed without modifying core logic
 */
const API_ROUTE_PATTERNS = [
  /^\/api\//, // Standard API routes
  /^\/webhooks\//, // Webhook endpoints
  /^\/auth\//, // Authentication endpoints
  /^\/upload\//, // Upload endpoints (legacy compatibility)
  /^\/health$/, // Health check endpoint
  /^\/favicon\.ico$/, // Favicon requests
  /^\/robots\.txt$/, // Robots.txt requests
];
/**
 * Checks if a URL should be handled by API routes instead of frontend
 * @param url - The request URL
 * @returns true if this is an API route that should skip frontend handling
 */
function isApiRoute(url: string): boolean {
  return API_ROUTE_PATTERNS.some((pattern) => pattern.test(url));
}
/**
 * Extendable static asset detection
 * Add new static asset patterns here as the project grows
 */
const STATIC_ASSET_PATTERNS = [
  /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i,
  /^\/assets\//,
  /^\/public\//,
  /^\/static\//,
  /^\/dist\//,
];
/**
 * Checks if a URL is for a static asset
 * @param url - The request URL
 * @returns true if this is a static asset request
 */
function isStaticAsset(url: string): boolean {
  return STATIC_ASSET_PATTERNS.some((pattern) => pattern.test(url));
}
export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });
  // Add Vite middlewares for HMR and development features
  app.use(vite.middlewares);

  // Catch-all handler for frontend routes (SPA)
  // This intelligently skips API routes and static assets
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    // Skip API routes - let them be handled by the API routers mounted earlier
    if (isApiRoute(url)) {
      log(`Skipping frontend handler for API route: ${url}`, "vite");
      return next();
    }
    // Skip static assets - let them be handled by Vite or static middleware
    if (isStaticAsset(url)) {
      log(`Skipping frontend handler for static asset: ${url}`, "vite");
      return next();
    }
    // Handle SPA routes by serving index.html
    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );
      // Always reload the index.html file from disk in case it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );

      const page = await vite.transformIndexHtml(url, template);
      log(`Serving SPA route: ${url}`, "vite");
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      log(`Error serving SPA route ${url}: ${(e as Error).message}`, "vite");
      next(e);
    }
  });
}
export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }
  // Serve static files
  app.use(express.static(distPath));
  // Fallback handler for production SPA routes
  // Same intelligent routing as development mode
  app.use("*", (req, res, next) => {
    const url = req.originalUrl;
    // Skip API routes in production too
    if (isApiRoute(url)) {
      return next();
    }
    // For static assets, let express.static handle them or 404
    if (isStaticAsset(url)) {
      return next();
    }
    // Serve index.html for SPA routes
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
