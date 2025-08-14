import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertOrganizationSchema, 
  insertSportSchema, 
  insertOrderSchema 
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) { // In production, use proper password hashing
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set session or return user info (simplified auth)
      res.json({ id: user.id, username: user.username, role: user.role });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Organization routes
  app.get("/api/organizations", async (req, res) => {
    try {
      const organizations = await storage.getOrganizationsWithSports();
      res.json(organizations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  app.get("/api/organizations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const organization = await storage.getOrganization(id);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Get related data
      const sports = await storage.getSportsByOrganization(id);
      const orders = await storage.getOrdersByOrganization(id);
      
      res.json({ ...organization, sports, orders });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });

  app.post("/api/organizations", async (req, res) => {
    try {
      const validatedData = insertOrganizationSchema.parse(req.body);
      const organization = await storage.createOrganization(validatedData);
      res.status(201).json(organization);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create organization" });
    }
  });

  app.put("/api/organizations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertOrganizationSchema.partial().parse(req.body);
      const organization = await storage.updateOrganization(id, validatedData);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      res.json(organization);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update organization" });
    }
  });

  app.delete("/api/organizations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteOrganization(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      res.json({ message: "Organization deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete organization" });
    }
  });

  // Sport routes
  app.get("/api/organizations/:organizationId/sports", async (req, res) => {
    try {
      const { organizationId } = req.params;
      const sports = await storage.getSportsByOrganization(organizationId);
      res.json(sports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sports" });
    }
  });

  app.post("/api/sports", async (req, res) => {
    try {
      const validatedData = insertSportSchema.parse(req.body);
      const sport = await storage.createSport(validatedData);
      res.status(201).json(sport);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create sport" });
    }
  });

  app.put("/api/sports/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSportSchema.partial().parse(req.body);
      const sport = await storage.updateSport(id, validatedData);
      
      if (!sport) {
        return res.status(404).json({ message: "Sport not found" });
      }
      
      res.json(sport);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update sport" });
    }
  });

  app.delete("/api/sports/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteSport(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Sport not found" });
      }
      
      res.json({ message: "Sport deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete sport" });
    }
  });

  // Order routes
  app.get("/api/organizations/:organizationId/orders", async (req, res) => {
    try {
      const { organizationId } = req.params;
      const orders = await storage.getOrdersByOrganization(organizationId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const validatedData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(validatedData);
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.put("/api/orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertOrderSchema.partial().parse(req.body);
      const order = await storage.updateOrder(id, validatedData);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  app.delete("/api/orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteOrder(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json({ message: "Order deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete order" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
