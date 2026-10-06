import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const materials = sqliteTable("materials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  unit: text("unit").notNull().default("Stück"),
  stock: integer("stock").notNull().default(0),
  location: text("location").notNull().default(""),
  note: text("note").notNull().default(""),
  packed: integer("packed", { mode: "boolean" }).notNull().default(false),
  consumable: integer("consumable", { mode: "boolean" }).notNull().default(false),
});

export const needs = sqliteTable("needs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  materialId: integer("material_id").notNull().references(() => materials.id),
  quantity: integer("quantity").notNull(),
  date: text("date").notNull().default(""),
  period: text("period").notNull().default(""),
  unitName: text("unit_name").notNull().default(""),
  person: text("person").notNull().default(""),
  project: text("project").notNull().default(""),
  startTime: text("start_time").notNull().default(""),
  endTime: text("end_time").notNull().default(""),
  requestKey: text("request_key").unique(),
});

export const materialStocks = sqliteTable("material_stocks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  materialId: integer("material_id").notNull().references(() => materials.id),
  location: text("location").notNull().default(""),
  quantity: integer("quantity").notNull().default(0),
  packed: integer("packed", { mode: "boolean" }).notNull().default(false),
});

export const campUnits = sqliteTable("camp_units", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

export const portalWishes = sqliteTable('portal_wishes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  materialId: integer('material_id').notNull().references(() => materials.id),
  requester: text('requester').notNull(),
  quantity: integer('quantity').notNull(),
  unit: text('unit').notNull(),
  imageKey: text('image_key'),
  requestKey: text('request_key').notNull().unique(),
  createdAt: integer('created_at').notNull(),
  fulfilledAt: integer('fulfilled_at'),
});
