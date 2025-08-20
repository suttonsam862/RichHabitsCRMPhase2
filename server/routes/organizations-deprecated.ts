import { Router } from "express";

/**
 * DEPRECATED ORGANIZATIONS SHIMS
 * 
 * This file provides backward compatibility for deprecated organization endpoints.
 * Routes either redirect to canonical endpoints or return 410 Gone with migration instructions.
 */

const router = Router();

// Deprecation logger
function logDeprecatedRoute(req: any, endpoint: string, status: number, action: string) {
  console.warn(`DEPRECATED_ORGS_ROUTE_HIT: ${req.method} ${req.originalUrl} -> ${status} (${action}) - Use ${endpoint}`);
}

/**
 * organizations.ts shims - these routes exist in the new canonical router
 */
router.get("/", (req, res) => {
  logDeprecatedRoute(req, "/api/organizations", 308, "redirect");
  res.redirect(308, "/api/organizations");
});

router.get("/:id", (req, res) => {
  logDeprecatedRoute(req, `/api/organizations/${req.params.id}`, 308, "redirect");
  res.redirect(308, `/api/organizations/${req.params.id}`);
});

router.post("/", (req, res) => {
  logDeprecatedRoute(req, "/api/organizations", 308, "redirect");
  res.redirect(308, "/api/organizations");
});

router.get("/__columns", (req, res) => {
  logDeprecatedRoute(req, "/api/organizations (schema endpoint removed)", 410, "gone");
  res.status(410).json({
    error: "Deprecated endpoint",
    message: "Schema introspection endpoint has been removed. Use standard CRUD endpoints.",
    canonical: "/api/organizations"
  });
});

router.post("/:id/replace-title-card", (req, res) => {
  logDeprecatedRoute(req, "/api/organizations/:id (PATCH for title updates)", 410, "gone");
  res.status(410).json({
    error: "Deprecated endpoint", 
    message: "Title card replacement should use PATCH /api/organizations/:id with title_card_url field.",
    canonical: `/api/organizations/${req.params.id}`
  });
});

/**
 * organizations-v2.ts shims - these routes have different payload formats
 */
router.patch("/:id", (req, res) => {
  logDeprecatedRoute(req, `/api/organizations/${req.params.id}`, 410, "gone");
  res.status(410).json({
    error: "Deprecated endpoint",
    message: "organizations-v2 PATCH endpoint is deprecated. Use canonical PATCH /api/organizations/:id",
    canonical: `/api/organizations/${req.params.id}`,
    migration: "Update client to use canonical organization endpoint with normalized field names"
  });
});

router.delete("/:id", (req, res) => {
  logDeprecatedRoute(req, `/api/organizations/${req.params.id}`, 308, "redirect");
  res.redirect(308, `/api/organizations/${req.params.id}`);
});

/**
 * organizations-hardened.ts shims - these routes have enhanced validation
 */
// Note: organizations-hardened.ts routes are being replaced by the canonical router
// which incorporates the enhanced validation and security features

export default router;