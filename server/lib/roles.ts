import { sql } from 'drizzle-orm';
import { db } from '../db';

export async function getRoleIdBySlug(slug: string): Promise<string | undefined> {
  try {
    const result = await db.execute(sql`
      SELECT id FROM roles WHERE slug = ${slug} LIMIT 1
    `);
    
    const roleData = Array.isArray(result) ? result[0] : (result as any).rows?.[0];
    return roleData?.id;
  } catch (error) {
    console.error('Error fetching role by slug:', error);
    return undefined;
  }
}

export async function ensureRoleExists(name: string, slug: string, description?: string): Promise<string | undefined> {
  try {
    // Try to create the role
    await db.execute(sql`
      INSERT INTO roles (name, slug, description) 
      VALUES (${name}, ${slug}, ${description || `${name} role`}) 
      ON CONFLICT (slug) DO NOTHING
    `);
    
    // Get the role ID
    return await getRoleIdBySlug(slug);
  } catch (error) {
    console.error('Error ensuring role exists:', error);
    return undefined;
  }
}