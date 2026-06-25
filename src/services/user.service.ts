import { eq, gte, lte, and } from "drizzle-orm";
import { db } from "../db/client";
import { users, NewUser } from "../models/user.model";

function yearsAgo(years: number): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date;
}

export const userService = {
  getAll: (page: number, limit: number, gender?: "male" | "female" | "other", minAge?: number, maxAge?: number) => {
    const offset = (page - 1) * limit;
  const genderCondition = gender ? eq(users.gender, gender) : undefined;
  const minAgeCondition = minAge ? lte(users.dateOfBirth, yearsAgo(minAge)) : undefined;
  const maxAgeCondition = maxAge ? gte(users.dateOfBirth, yearsAgo(maxAge)) : undefined;

  const condition = and(genderCondition, minAgeCondition, maxAgeCondition);

  return db.select().from(users).where(condition).offset(offset).limit(limit);
  },

  getById: async (id: number) => {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0] ?? null;
  },

  create: async (data: NewUser) => {
    const result = await db.insert(users).values(data).returning();
    return result[0];
  },

  update: async (id: number, data: Partial<NewUser>) => {
    const result = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0] ?? null;
  },

  remove: async (id: number) => {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result[0] ?? null;
  },
};
