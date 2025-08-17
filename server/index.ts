import express, { type Request, Response, NextFunction } from "express";
import { router } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from './db';
import { sql } from 'drizzle-orm';
import { organizations } from '../shared/schema';
import { errorHandler } from "./middleware/error";
import organizationsRouter from "./routes/organizations-hardened";
import debugRouter from "./routes/debug";
import uploadRoutes from "./routes/upload";
import orgSportsRouter from "./routes/org-sports";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logger
app.use((req,res,next)=>{
  const t=Date.now();
  res.on('finish',()=>console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} ${Date.now()-t}ms`));
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // ALWAYS serve the app on the port specified in the environment variable PORT
  const port = parseInt(process.env.PORT || '5000', 10);
  const host = "0.0.0.0";

  // Test database connection and ensure required data exists
  async function testConnection() {
    try {
      log("🔍 Testing database connection...");
      const result = await db.execute(sql`SELECT current_database(), current_user, version()`);
      const dbInfo = Array.isArray(result) ? result[0] : result.rows?.[0];
      log("✅ Database connection successful!");
      log("📊 Database info:", JSON.stringify(dbInfo));

      // Test organizations table access
      log("🔍 Testing organizations table access...");
      const orgCount = await db.execute(sql`SELECT COUNT(*) as count FROM organizations`);
      const count = Array.isArray(orgCount) ? orgCount[0]?.count : orgCount.rows?.[0]?.count;
      log("✅ Organizations table accessible. Row count:", String(count));

      // Ensure required roles exist
      log("🔍 Ensuring required roles exist...");
      try {
        const { ensureRolesExist } = await import('./scripts/ensureRolesExist');
        await ensureRolesExist();
      } catch (roleError: any) {
        console.warn('⚠️ Could not ensure roles exist:', roleError.message);
        // Don't fail server startup for this
      }

    } catch (error: any) {
      log("❌ Database connection failed:");
      log("- Error message:", error.message);
      log("- Error code:", error.code);
      process.exit(1);
    }
  }

  const server = app.listen(port, host, () => {
    log(`Server running on ${host}:${port}`);
    testConnection();
  });

  // Handle server errors
  server.on('error', (err: any) => {
    log("❌ Server error:");
    log("- Error message:", err.message);
    log("- Error code:", err.code);
    if (err.code === 'EADDRINUSE') {
      log(`🔥 Port ${port} is already in use. Trying to kill existing processes...`);
      // In a real-world scenario, you'd want a more robust way to handle this,
      // possibly by finding and killing the process. For this example, we'll just exit.
      process.exit(1);
    }
  });


  // Register routes
  // Mount specific routers first to override general routes
  app.use("/api/organizations", organizationsRouter);
  app.use("/api/debug", debugRouter);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/org-sports", orgSportsRouter);
  // Mount general router last (it has conflicting /api/organizations route that we're overriding)
  app.use(router);

  // Health check endpoint
  app.get('/api/health', async (req,res,next)=>{
    try{
      await db.execute(sql`select 1 as ok`);
      const [{ count }] = await db.select({count: sql<number>`count(*)`}).from(organizations).limit(1);
      res.json({ ok:true, time:new Date().toISOString(), db:'up', orgs:Number(count) });
    }catch(e){ next(e); }
  });

  // Use the enhanced error handler
  app.use(errorHandler);

  // Setup vite in development - AFTER all API routes are mounted
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
})();