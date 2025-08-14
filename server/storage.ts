import { 
  type User, 
  type InsertUser,
  type Organization,
  type InsertOrganization,
  type OrganizationWithSports,
  type Sport,
  type InsertSport,
  type Order,
  type InsertOrder
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Organization operations
  getAllOrganizations(): Promise<Organization[]>;
  getOrganizationsWithSports(): Promise<OrganizationWithSports[]>;
  getOrganization(id: string): Promise<Organization | undefined>;
  createOrganization(organization: InsertOrganization): Promise<Organization>;
  updateOrganization(id: string, updates: Partial<InsertOrganization>): Promise<Organization | undefined>;
  deleteOrganization(id: string): Promise<boolean>;

  // Sport operations
  getSportsByOrganization(organizationId: string): Promise<Sport[]>;
  createSport(sport: InsertSport): Promise<Sport>;
  updateSport(id: string, updates: Partial<InsertSport>): Promise<Sport | undefined>;
  deleteSport(id: string): Promise<boolean>;

  // Order operations
  getOrdersByOrganization(organizationId: string): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, updates: Partial<InsertOrder>): Promise<Order | undefined>;
  deleteOrder(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private organizations: Map<string, Organization>;
  private sports: Map<string, Sport>;
  private orders: Map<string, Order>;

  constructor() {
    this.users = new Map();
    this.organizations = new Map();
    this.sports = new Map();
    this.orders = new Map();

    // Seed some initial data
    this.seedInitialData();
  }

  private async seedInitialData() {
    // Create default admin user
    await this.createUser({
      username: "admin",
      password: "admin123", // In production, this should be hashed
      role: "admin"
    });

    // Seed some sample organizations
    const org1 = await this.createOrganization({
      name: "Dallas Sports Academy",
      logoUrl: "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=200&h=200&fit=crop&crop=center",
      state: "Texas",
      address: "123 Sports Way, Dallas, TX 75201",
      phone: "(214) 555-0123",
      email: "contact@dallassports.com",
      universalDiscounts: { percentage: 10, minOrder: 100 },
      notes: "Premium sports academy with multiple disciplines"
    });

    const org2 = await this.createOrganization({
      name: "Austin Athletics Club",
      logoUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=center",
      state: "Texas",
      address: "456 Athletic Blvd, Austin, TX 78701",
      phone: "(512) 555-0456",
      email: "info@austinac.com",
      universalDiscounts: { percentage: 15, minOrder: 200 },
      notes: "Community-focused athletics club"
    });

    const org3 = await this.createOrganization({
      name: "Miami Beach Volleyball",
      logoUrl: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=200&h=200&fit=crop&crop=center",
      state: "Florida",
      address: "789 Beach Ave, Miami Beach, FL 33139",
      phone: "(305) 555-0789",
      email: "hello@miamibeachvb.com",
      universalDiscounts: { percentage: 8, minOrder: 50 },
      notes: "Beachside volleyball training facility"
    });

    // Add sports for organizations
    await this.createSport({
      organizationId: org1.id,
      name: "Basketball",
      salesperson: "John Smith",
      contactName: "Coach Johnson",
      contactEmail: "coach@dallassports.com",
      contactPhone: "(214) 555-0124"
    });

    await this.createSport({
      organizationId: org1.id,
      name: "Soccer",
      salesperson: "Jane Doe",
      contactName: "Maria Rodriguez",
      contactEmail: "soccer@dallassports.com",
      contactPhone: "(214) 555-0125"
    });

    await this.createSport({
      organizationId: org2.id,
      name: "Track & Field",
      salesperson: "Bob Wilson",
      contactName: "Coach Davis",
      contactEmail: "track@austinac.com",
      contactPhone: "(512) 555-0457"
    });

    await this.createSport({
      organizationId: org3.id,
      name: "Volleyball",
      salesperson: "Sarah Chen",
      contactName: "Lisa Martinez",
      contactEmail: "volleyball@miamibeachvb.com",
      contactPhone: "(305) 555-0790"
    });

    // Add sample orders
    await this.createOrder({
      organizationId: org1.id,
      orderNumber: "ORD-2025-001",
      customerName: "Youth Basketball League",
      status: "in_production",
      totalAmount: "1250.00",
      items: [
        { item: "Custom Basketball Jerseys", quantity: 15, price: 45.00 },
        { item: "Team Shorts", quantity: 15, price: 35.00 },
        { item: "Warm-up Jackets", quantity: 10, price: 65.00 }
      ],
      notes: "Rush order for tournament season"
    });

    await this.createOrder({
      organizationId: org2.id,
      orderNumber: "ORD-2025-002",
      customerName: "Austin High School",
      status: "pending",
      totalAmount: "890.50",
      items: [
        { item: "Track Uniforms", quantity: 12, price: 55.00 },
        { item: "Running Spikes", quantity: 8, price: 85.00 }
      ],
      notes: "School colors: blue and gold"
    });
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser,
      role: insertUser.role || "admin",
      id, 
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  // Organization operations
  async getAllOrganizations(): Promise<Organization[]> {
    return Array.from(this.organizations.values());
  }

  async getOrganizationsWithSports(): Promise<OrganizationWithSports[]> {
    const organizations = await this.getAllOrganizations();
    const result: OrganizationWithSports[] = [];
    
    for (const org of organizations) {
      const sports = await this.getSportsByOrganization(org.id);
      result.push({ ...org, sports });
    }
    
    return result;
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    return this.organizations.get(id);
  }

  async createOrganization(insertOrganization: InsertOrganization): Promise<Organization> {
    const id = randomUUID();
    const organization: Organization = {
      ...insertOrganization,
      logoUrl: insertOrganization.logoUrl || null,
      address: insertOrganization.address || null,
      phone: insertOrganization.phone || null,
      email: insertOrganization.email || null,
      notes: insertOrganization.notes || null,
      universalDiscounts: insertOrganization.universalDiscounts || null,
      id,
      createdAt: new Date()
    };
    this.organizations.set(id, organization);
    return organization;
  }

  async updateOrganization(id: string, updates: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const organization = this.organizations.get(id);
    if (!organization) return undefined;

    const updated: Organization = { ...organization, ...updates };
    this.organizations.set(id, updated);
    return updated;
  }

  async deleteOrganization(id: string): Promise<boolean> {
    // Also delete related sports and orders
    const sports = await this.getSportsByOrganization(id);
    const orders = await this.getOrdersByOrganization(id);
    
    sports.forEach(sport => this.sports.delete(sport.id));
    orders.forEach(order => this.orders.delete(order.id));
    
    return this.organizations.delete(id);
  }

  // Sport operations
  async getSportsByOrganization(organizationId: string): Promise<Sport[]> {
    return Array.from(this.sports.values()).filter(
      sport => sport.organizationId === organizationId
    );
  }

  async createSport(insertSport: InsertSport): Promise<Sport> {
    const id = randomUUID();
    const sport: Sport = {
      ...insertSport,
      salesperson: insertSport.salesperson || null,
      contactName: insertSport.contactName || null,
      contactEmail: insertSport.contactEmail || null,
      contactPhone: insertSport.contactPhone || null,
      id,
      createdAt: new Date()
    };
    this.sports.set(id, sport);
    return sport;
  }

  async updateSport(id: string, updates: Partial<InsertSport>): Promise<Sport | undefined> {
    const sport = this.sports.get(id);
    if (!sport) return undefined;

    const updated: Sport = { ...sport, ...updates };
    this.sports.set(id, updated);
    return updated;
  }

  async deleteSport(id: string): Promise<boolean> {
    return this.sports.delete(id);
  }

  // Order operations
  async getOrdersByOrganization(organizationId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      order => order.organizationId === organizationId
    );
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const now = new Date();
    const order: Order = {
      ...insertOrder,
      status: insertOrder.status || "pending",
      totalAmount: insertOrder.totalAmount || null,
      notes: insertOrder.notes || null,
      items: insertOrder.items || null,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.orders.set(id, order);
    return order;
  }

  async updateOrder(id: string, updates: Partial<InsertOrder>): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;

    const updated: Order = { 
      ...order, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.orders.set(id, updated);
    return updated;
  }

  async deleteOrder(id: string): Promise<boolean> {
    return this.orders.delete(id);
  }
}

export const storage = new MemStorage();
