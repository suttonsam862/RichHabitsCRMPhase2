import { supabase } from '../lib/supabase';
import type { 
  Organization, 
  Sport, 
  Order, 
  User,
  OrganizationWithSports,
  InsertOrganization,
  InsertSport,
  InsertOrder,
  InsertUser
} from '../shared/supabase-schema';
import { TABLES } from '../shared/supabase-schema';

export class SupabaseStorage {
  // Organizations
  async getOrganizations(): Promise<OrganizationWithSports[]> {
    const { data: organizations, error } = await supabase
      .from(TABLES.ORGANIZATIONS)
      .select(`
        *,
        sports (*)
      `)
      .order('state')
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch organizations: ${error.message}`);
    }

    return organizations || [];
  }

  async getOrganization(id: string): Promise<OrganizationWithSports | null> {
    const { data: organization, error } = await supabase
      .from(TABLES.ORGANIZATIONS)
      .select(`
        *,
        sports (*),
        orders (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch organization: ${error.message}`);
    }

    return organization;
  }

  async createOrganization(data: InsertOrganization): Promise<Organization> {
    const { data: organization, error } = await supabase
      .from(TABLES.ORGANIZATIONS)
      .insert({
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create organization: ${error.message}`);
    }

    return organization;
  }

  async updateOrganization(id: string, data: Partial<InsertOrganization>): Promise<Organization> {
    const { data: organization, error } = await supabase
      .from(TABLES.ORGANIZATIONS)
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update organization: ${error.message}`);
    }

    return organization;
  }

  async deleteOrganization(id: string): Promise<void> {
    // First delete related sports and orders
    await Promise.all([
      supabase.from(TABLES.SPORTS).delete().eq('organization_id', id),
      supabase.from(TABLES.ORDERS).delete().eq('organization_id', id)
    ]);

    const { error } = await supabase
      .from(TABLES.ORGANIZATIONS)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete organization: ${error.message}`);
    }
  }

  // Sports
  async getSports(): Promise<Sport[]> {
    const { data: sports, error } = await supabase
      .from(TABLES.SPORTS)
      .select('*')
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch sports: ${error.message}`);
    }

    return sports || [];
  }

  async getSport(id: string): Promise<Sport | null> {
    const { data: sport, error } = await supabase
      .from(TABLES.SPORTS)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch sport: ${error.message}`);
    }

    return sport;
  }

  async getSportsByOrganization(organizationId: string): Promise<Sport[]> {
    const { data: sports, error } = await supabase
      .from(TABLES.SPORTS)
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch sports for organization: ${error.message}`);
    }

    return sports || [];
  }

  async createSport(data: InsertSport): Promise<Sport> {
    const { data: sport, error } = await supabase
      .from(TABLES.SPORTS)
      .insert({
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create sport: ${error.message}`);
    }

    return sport;
  }

  async updateSport(id: string, data: Partial<InsertSport>): Promise<Sport> {
    const { data: sport, error } = await supabase
      .from(TABLES.SPORTS)
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update sport: ${error.message}`);
    }

    return sport;
  }

  async deleteSport(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.SPORTS)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete sport: ${error.message}`);
    }
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    const { data: orders, error } = await supabase
      .from(TABLES.ORDERS)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }

    return orders || [];
  }

  async getOrder(id: string): Promise<Order | null> {
    const { data: order, error } = await supabase
      .from(TABLES.ORDERS)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch order: ${error.message}`);
    }

    return order;
  }

  async getOrdersByOrganization(organizationId: string): Promise<Order[]> {
    const { data: orders, error } = await supabase
      .from(TABLES.ORDERS)
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch orders for organization: ${error.message}`);
    }

    return orders || [];
  }

  async createOrder(data: InsertOrder): Promise<Order> {
    const { data: order, error } = await supabase
      .from(TABLES.ORDERS)
      .insert({
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create order: ${error.message}`);
    }

    return order;
  }

  async updateOrder(id: string, data: Partial<InsertOrder>): Promise<Order> {
    const { data: order, error } = await supabase
      .from(TABLES.ORDERS)
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update order: ${error.message}`);
    }

    return order;
  }

  async deleteOrder(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.ORDERS)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete order: ${error.message}`);
    }
  }

  // Users (for future authentication)
  async getUsers(): Promise<User[]> {
    const { data: users, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .order('created_at');

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    return users || [];
  }

  async getUser(id: string): Promise<User | null> {
    const { data: user, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch user: ${error.message}`);
    }

    return user;
  }

  async createUser(data: InsertUser): Promise<User> {
    const { data: user, error } = await supabase
      .from(TABLES.USERS)
      .insert({
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User> {
    const { data: user, error } = await supabase
      .from(TABLES.USERS)
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }

    return user;
  }

  async deleteUser(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.USERS)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  // Search and filter functions
  async searchOrganizations(query: string): Promise<OrganizationWithSports[]> {
    const { data: organizations, error } = await supabase
      .from(TABLES.ORGANIZATIONS)
      .select(`
        *,
        sports (*)
      `)
      .or(`name.ilike.%${query}%,state.ilike.%${query}%,address.ilike.%${query}%`)
      .order('state')
      .order('name');

    if (error) {
      throw new Error(`Failed to search organizations: ${error.message}`);
    }

    return organizations || [];
  }

  // Real-time subscriptions (for future use)
  subscribeToOrganizations(callback: (payload: any) => void) {
    return supabase
      .channel('organizations')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.ORGANIZATIONS }, callback)
      .subscribe();
  }

  subscribeToSports(callback: (payload: any) => void) {
    return supabase
      .channel('sports')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.SPORTS }, callback)
      .subscribe();
  }

  subscribeToOrders(callback: (payload: any) => void) {
    return supabase
      .channel('orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.ORDERS }, callback)
      .subscribe();
  }
}

export const storage = new SupabaseStorage();