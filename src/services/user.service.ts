import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { users, NewUser } from "../models/user.model";

export const userService = {
  getAll: (page: number, limit: number) => {
    const offset = (page - 1) * limit;
    return db.select().from(users).offset(offset).limit(limit);
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
