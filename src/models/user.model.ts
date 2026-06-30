import {
  pgTable,
  serial,
  varchar,
  integer,
  pgEnum,
  timestamp,
  text,
} from "drizzle-orm/pg-core";

export const genderEnum = pgEnum("gender", ["male", "female", "other"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  surname: varchar("surname", { length: 100 }).notNull(),
  age: integer("age"),
  dateOfBirth: timestamp("date_of_birth").notNull(),
  gender: genderEnum("gender").notNull(),
  nationality: varchar("nationality", { length: 100 }),
  email: varchar("email", { length: 255 }).notNull().unique(),

  passwordHash: varchar("password_hash", { length: 255 }),
  provider : varchar("provider", { length: 50 }).notNull().default("local"),
  providerId : varchar("provider_id", { length: 255 }),

  phoneNumber: varchar("phone_number", { length: 20 }),
  address: varchar("address", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  avatarUrl: text("avatar_url"),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
