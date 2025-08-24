import { pgTable, text, timestamp, uuid, varchar, jsonb, integer, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', { id: uuid('id').primaryKey(), email: text('email'), role: text('role') });
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  address: text('address'), 
  city: text('city'), 
  state: text('state'), 
  zip: text('zip'),
  phone: text('phone'), 
  email: text('email'), 
  website: text('website'), 
  logoUrl: text('logo_url'),
  primaryColor: text('primary_color'), 
  secondaryColor: text('secondary_color'), 
  tertiaryColor: text('tertiary_color'),
  titleCardUrl: text('title_card_url'),
  colorPalette: jsonb('color_palette').notNull().default('[]'::any),
  universalDiscounts: jsonb('universal_discounts').notNull().default('{}'::any),
  tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
  gradientCss: text('gradient_css'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
});
export const sports = pgTable('sports', { id: uuid('id').primaryKey().defaultRandom(), name: text('name').notNull().unique() });
export const orgSports = pgTable('org_sports', {
    organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
    sportId: uuid('sport_id').references(() => sports.id).notNull(),
    contactUserId: uuid('contact_user_id').references(() => users.id),
    contactName: text('contact_name'),
    contactEmail: text('contact_email'), 
    contactPhone: text('contact_phone'),
}, (t) => ({ pk: primaryKey({ columns: [t.organizationId, t.sportId] }) }));
export const usersRelations = relations(users, ({ many }) => ({ organizations: many(organizations) }));
export const organizationsRelations = relations(organizations, ({ one, many }) => ({ createdBy: one(users, { fields: [organizations.createdBy], references: [users.id] }), orgSports: many(orgSports) }));
export const sportsRelations = relations(sports, ({ many }) => ({ orgSports: many(orgSports) }));
export const orgSportsRelations = relations(orgSports, ({ one }) => ({
    organization: one(organizations, { fields: [orgSports.organizationId], references: [organizations.id] }),
    sport: one(sports, { fields: [orgSports.sportId], references: [sports.id] }),
}));