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
} from "../shared/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users, organizations, sports, orders, org_sports } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

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

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Organization operations
  async getAllOrganizations(): Promise<Organization[]> {
    return await db.select().from(organizations).orderBy(organizations.name);
  }

  async getOrganizationsWithSports(): Promise<OrganizationWithSports[]> {
    const orgs = await this.getAllOrganizations();
    const result: OrganizationWithSports[] = [];

    for (const org of orgs) {
      const orgSports = await this.getSportsByOrganization(org.id);
      result.push({ ...org, sports: orgSports });
    }

    return result;
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const result = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
    return result[0];
  }

  async createOrganization(insertOrganization: InsertOrganization): Promise<Organization> {
    const result = await db.insert(organizations).values(insertOrganization).returning();
    return result[0];
  }

  async updateOrganization(id: string, updates: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const result = await db.update(organizations)
      .set(updates)
      .where(eq(organizations.id, id))
      .returning();
    return result[0];
  }

  async deleteOrganization(id: string): Promise<boolean> {
    try {
      // Delete related sports and orders first (cascade should handle this, but being explicit)
      await db.delete(org_sports).where(eq(org_sports.organizationId, id));
      await db.delete(orders).where(eq(orders.organizationId, id));

      const result = await db.delete(organizations).where(eq(organizations.id, id));
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting organization:', error);
      return false;
    }
  }

  // Sport operations
  async getSportsByOrganization(organizationId: string): Promise<Sport[]> {
    // Return actual sports, not org_sports
    return await db.select().from(sports)
      .orderBy(sports.name);
  }

  async createSport(insertSport: InsertSport): Promise<Sport> {
    const result = await db.insert(sports).values(insertSport).returning();
    return result[0];
  }

  async updateSport(id: string, updates: Partial<InsertSport>): Promise<Sport | undefined> {
    const result = await db.update(sports)
      .set(updates)
      .where(eq(sports.id, id))
      .returning();
    return result[0];
  }

  async deleteSport(id: string): Promise<boolean> {
    try {
      const result = await db.delete(sports).where(eq(sports.id, id));
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting sport:', error);
      return false;
    }
  }

  // Order operations
  async getOrdersByOrganization(organizationId: string): Promise<Order[]> {
    return await db.select().from(orders)
      .where(eq(orders.organizationId, organizationId))
      .orderBy(orders.createdAt);
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return result[0];
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const result = await db.insert(orders).values(insertOrder).returning();
    return result[0];
  }

  async updateOrder(id: string, updates: Partial<InsertOrder>): Promise<Order | undefined> {
    const result = await db.update(orders)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(orders.id, id))
      .returning();
    return result[0];
  }

  async deleteOrder(id: string): Promise<boolean> {
    try {
      const result = await db.delete(orders).where(eq(orders.id, id));
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting order:', error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();