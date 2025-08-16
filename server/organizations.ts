
import { db } from './db';
import { organizations } from '../shared/schema';
import { eq } from 'drizzle-orm';

export type OrgInsert = typeof organizations.$inferInsert;
export type Org = typeof organizations.$inferSelect;

export async function listOrganizations(): Promise<Org[]> {
  return db.select().from(organizations).orderBy(organizations.name);
}

export async function getOrganization(id: string): Promise<Org | undefined> {
  const [row] = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return row;
}

export async function createOrganization(values: OrgInsert): Promise<Org> {
  const [row] = await db.insert(organizations).values(values).returning();
  return row;
}

export async function updateOrganization(id: string, patch: Partial<OrgInsert>): Promise<Org> {
  const [row] = await db.update(organizations).set(patch).where(eq(organizations.id, id)).returning();
  return row;
}

export async function deleteOrganization(id: string): Promise<void> {
  await db.delete(organizations).where(eq(organizations.id, id));
}
