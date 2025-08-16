import { Router } from "express";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { storage } from "./supabase-storage";
import * as Orgs from "./organizations";
import { 
  insertOrganizationSchema, 
  insertSportSchema, 
  insertOrderSchema,
  insertUserSchema 
} from "../shared/supabase-schema";

const router = Router();

// Middleware for validation
function validateRequestBody(schema: z.ZodSchema) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const validationError = fromZodError(result.error);
      return res.status(400).json({
        error: "Validation failed",
        details: validationError.message,
      });
    }
    req.validatedBody = result.data;
    next();
  };
}

// Error handler wrapper
function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Organizations routes
router.get("/api/organizations", async (req, res, next) => {
  try {
    const rows = await Orgs.listOrganizations();
    res.json(rows.map(o => ({ ...o, sports: [] })));
  } catch (e) { next(e); }
});

router.get("/api/organizations/:id", asyncHandler(async (req: any, res: any) => {
  try {
    const organization = await storage.getOrganization(req.params.id);
    if (!organization) {
      return res.status(404).json({ error: "Organization not found" });
    }
    res.json(organization);
  } catch (error: any) {
    console.error("Error fetching organization:", error);
    res.status(500).json({ 
      error: "Failed to fetch organization", 
      details: error.message 
    });
  }
}));

router.post("/api/organizations", 
  validateRequestBody(insertOrganizationSchema), 
  asyncHandler(async (req: any, res: any) => {
    try {
      const organization = await storage.createOrganization(req.validatedBody);
      res.status(201).json(organization);
    } catch (error: any) {
      console.error("Error creating organization:", error);
      res.status(500).json({ 
        error: "Failed to create organization", 
        details: error.message 
      });
    }
  })
);

router.put("/api/organizations/:id", 
  validateRequestBody(insertOrganizationSchema.partial()), 
  asyncHandler(async (req: any, res: any) => {
    try {
      const organization = await storage.updateOrganization(req.params.id, req.validatedBody);
      res.json(organization);
    } catch (error: any) {
      console.error("Error updating organization:", error);
      res.status(500).json({ 
        error: "Failed to update organization", 
        details: error.message 
      });
    }
  })
);

router.delete("/api/organizations/:id", asyncHandler(async (req: any, res: any) => {
  try {
    await storage.deleteOrganization(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting organization:", error);
    res.status(500).json({ 
      error: "Failed to delete organization", 
      details: error.message 
    });
  }
}));

// Sports routes
router.get("/api/sports", asyncHandler(async (req: any, res: any) => {
  try {
    const organizationId = req.query.organization_id;
    const sports = organizationId 
      ? await storage.getSportsByOrganization(organizationId)
      : await storage.getSports();
    res.json(sports);
  } catch (error: any) {
    console.error("Error fetching sports:", error);
    res.status(500).json({ 
      error: "Failed to fetch sports", 
      details: error.message 
    });
  }
}));

router.get("/api/sports/:id", asyncHandler(async (req: any, res: any) => {
  try {
    const sport = await storage.getSport(req.params.id);
    if (!sport) {
      return res.status(404).json({ error: "Sport not found" });
    }
    res.json(sport);
  } catch (error: any) {
    console.error("Error fetching sport:", error);
    res.status(500).json({ 
      error: "Failed to fetch sport", 
      details: error.message 
    });
  }
}));

router.post("/api/sports", 
  validateRequestBody(insertSportSchema), 
  asyncHandler(async (req: any, res: any) => {
    try {
      const sport = await storage.createSport(req.validatedBody);
      res.status(201).json(sport);
    } catch (error: any) {
      console.error("Error creating sport:", error);
      res.status(500).json({ 
        error: "Failed to create sport", 
        details: error.message 
      });
    }
  })
);

router.put("/api/sports/:id", 
  validateRequestBody(insertSportSchema.partial()), 
  asyncHandler(async (req: any, res: any) => {
    try {
      const sport = await storage.updateSport(req.params.id, req.validatedBody);
      res.json(sport);
    } catch (error: any) {
      console.error("Error updating sport:", error);
      res.status(500).json({ 
        error: "Failed to update sport", 
        details: error.message 
      });
    }
  })
);

router.delete("/api/sports/:id", asyncHandler(async (req: any, res: any) => {
  try {
    await storage.deleteSport(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting sport:", error);
    res.status(500).json({ 
      error: "Failed to delete sport", 
      details: error.message 
    });
  }
}));

// Orders routes
router.get("/api/orders", asyncHandler(async (req: any, res: any) => {
  try {
    const organizationId = req.query.organization_id;
    const orders = organizationId 
      ? await storage.getOrdersByOrganization(organizationId)
      : await storage.getOrders();
    res.json(orders);
  } catch (error: any) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ 
      error: "Failed to fetch orders", 
      details: error.message 
    });
  }
}));

router.get("/api/orders/:id", asyncHandler(async (req: any, res: any) => {
  try {
    const order = await storage.getOrder(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json(order);
  } catch (error: any) {
    console.error("Error fetching order:", error);
    res.status(500).json({ 
      error: "Failed to fetch order", 
      details: error.message 
    });
  }
}));

router.post("/api/orders", 
  validateRequestBody(insertOrderSchema), 
  asyncHandler(async (req: any, res: any) => {
    try {
      const order = await storage.createOrder(req.validatedBody);
      res.status(201).json(order);
    } catch (error: any) {
      console.error("Error creating order:", error);
      res.status(500).json({ 
        error: "Failed to create order", 
        details: error.message 
      });
    }
  })
);

router.put("/api/orders/:id", 
  validateRequestBody(insertOrderSchema.partial()), 
  asyncHandler(async (req: any, res: any) => {
    try {
      const order = await storage.updateOrder(req.params.id, req.validatedBody);
      res.json(order);
    } catch (error: any) {
      console.error("Error updating order:", error);
      res.status(500).json({ 
        error: "Failed to update order", 
        details: error.message 
      });
    }
  })
);

router.delete("/api/orders/:id", asyncHandler(async (req: any, res: any) => {
  try {
    await storage.deleteOrder(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting order:", error);
    res.status(500).json({ 
      error: "Failed to delete order", 
      details: error.message 
    });
  }
}));

// Search routes
router.get("/api/search/organizations", asyncHandler(async (req: any, res: any) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }
    const organizations = await storage.searchOrganizations(query);
    res.json(organizations);
  } catch (error: any) {
    console.error("Error searching organizations:", error);
    res.status(500).json({ 
      error: "Failed to search organizations", 
      details: error.message 
    });
  }
}));

// Users routes (for future authentication)
router.get("/api/users", asyncHandler(async (req: any, res: any) => {
  try {
    const users = await storage.getUsers();
    res.json(users);
  } catch (error: any) {
    console.error("Error fetching users:", error);
    res.status(500).json({ 
      error: "Failed to fetch users", 
      details: error.message 
    });
  }
}));

router.get("/api/users/:id", asyncHandler(async (req: any, res: any) => {
  try {
    const user = await storage.getUser(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error: any) {
    console.error("Error fetching user:", error);
    res.status(500).json({ 
      error: "Failed to fetch user", 
      details: error.message 
    });
  }
}));

router.post("/api/users", 
  validateRequestBody(insertUserSchema), 
  asyncHandler(async (req: any, res: any) => {
    try {
      const user = await storage.createUser(req.validatedBody);
      res.status(201).json(user);
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(500).json({ 
        error: "Failed to create user", 
        details: error.message 
      });
    }
  })
);

// Error handling middleware
router.use((error: any, req: any, res: any, next: any) => {
  console.error("API Error:", error);
  res.status(500).json({ 
    error: "Internal server error", 
    details: error.message 
  });
});

export { router };