import express, { type Request, Response, NextFunction } from "express";
import { router } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from './db';
import { sql } from 'drizzle-orm';
import { organizations } from '../shared/schema';

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
  
  const server = app.listen(port, host, () => {
    log(`Server running on ${host}:${port}`);
  });

  // Register routes
  app.use(router);

  // Health check endpoint
  app.get('/api/health', async (req,res,next)=>{
    try{
      await db.execute(sql`select 1 as ok`);
      const [{ count }] = await db.select({count: sql<number>`count(*)`}).from(organizations).limit(1);
      res.json({ ok:true, time:new Date().toISOString(), db:'up', orgs:Number(count) });
    }catch(e){ next(e); }
  });

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    console.error('API error:', { msg: err?.message, stack: err?.stack, path: req.originalUrl, method: req.method });
    res.status(500).json({ error: err?.message || 'Server error' });
  });

  // Setup vite in development
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
})();