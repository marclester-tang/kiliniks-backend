
import { pgTable, text, boolean, numeric, timestamp, uuid, jsonb, doublePrecision } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const stages = pgTable('stages', {
  id: uuid('id').primaryKey().defaultRandom(),
  flowId: uuid('flow_id').notNull(),
  name: text('name').notNull(),
  hasNotes: boolean('has_notes').default(false),
  soundUrl: text('sound_url'),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
});

export const stageLocations = pgTable('stage_locations', {
    stageId: uuid('stage_id').notNull().references(() => stages.id, { onDelete: 'cascade' }),
    locationId: uuid('location_id').notNull(), // Assuming location table exists but for now just referencing ID
});

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientName: text('patient_name').notNull(),
  doctorName: text('doctor_name').notNull(),
  date: timestamp('appointment_date').notNull(),
  status: text('status').notNull(), // Enum could be better but sticking to text as per repo
  notes: text('notes'),
  createdBy: text('created_by'),
});

export const flows = pgTable('flows', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    createdBy: text('created_by').notNull(),
    updatedBy: text('updated_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at'),
});

export const locations = pgTable('locations', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description'),
    createdBy: text('created_by').notNull(),
    updatedBy: text('updated_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at'),
});

export const salesItems = pgTable('sales_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  stageId: uuid('stage_id').references(() => stages.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  itemType: text('item_type'),
  price: numeric('price').notNull(),
  costPrice: numeric('cost_price'),
  defaultQuantity: doublePrecision('default_quantity').notNull(),
  defaultPanelCategory: text('default_panel_category'),
  panelCategories: jsonb('panel_categories'),
});

export const stagesRelations = relations(stages, ({ many }) => ({
  salesItems: many(salesItems),
  // stageLocations could be many-to-many if locations table was fully defined here
}));

export const salesItemsRelations = relations(salesItems, ({ one }) => ({
  stage: one(stages, {
    fields: [salesItems.stageId],
    references: [stages.id],
  }),
}));
