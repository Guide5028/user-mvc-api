import { eq, gte, lte, and, inArray, or, ilike, asc, desc} from "drizzle-orm";
import { db } from "../db/client";
import { users, NewUser } from "../models/user.model";


interface UserFilters {
  gender?: "male" | "female" | "other";
  minAge?: number;
  maxAge?: number;
  nationalities?: string[];
  search?: string;
}

function yearsAgo(years: number): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date;
}

function buildWhereClause(filters: UserFilters) {
  const searchCondition = filters.search ? or(ilike(users.name, `%${filters.search}%`), ilike(users.surname, `%${filters.search}%`), ilike(users.email, `%${filters.search}%`)) : undefined;
  const genderCondition = filters.gender ? eq(users.gender, filters.gender) : undefined;
  const minAgeCondition = filters.minAge ? lte(users.dateOfBirth, yearsAgo(filters.minAge)) : undefined;
  const maxAgeCondition = filters.maxAge ? gte(users.dateOfBirth, yearsAgo(filters.maxAge)) : undefined;
  const nationalityCondition = filters.nationalities ? inArray(users.nationality, filters.nationalities) : undefined;

  return and(searchCondition, genderCondition, minAgeCondition, maxAgeCondition, nationalityCondition);
}

export const userService = {
  getAll: (page: number, limit: number, filters: UserFilters) => {
  const offset = (page - 1) * limit;
  const condition = buildWhereClause(filters);

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

