import {
  eq,
  gte,
  lte,
  and,
  inArray,
  or,
  ilike,
  asc,
  desc,
  sql,
} from "drizzle-orm";
import { db } from "../db/client";
import { users, NewUser } from "../models/user.model";
import bcrypt from "bcrypt";
import { signAccessToken, signRefreshToken } from "../utils/jwt";

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
  const searchCondition = filters.search
    ? or(
        ilike(users.name, `%${filters.search}%`),
        ilike(users.surname, `%${filters.search}%`),
        ilike(users.email, `%${filters.search}%`),
        sql`(${users.name} || ' ' || ${users.surname}) ILIKE ${`%${filters.search}%`}`,
      )
    : undefined;
  const genderCondition = filters.gender
    ? eq(users.gender, filters.gender)
    : undefined;
  const minAgeCondition = filters.minAge
    ? lte(users.dateOfBirth, yearsAgo(filters.minAge))
    : undefined;
  const maxAgeCondition = filters.maxAge
    ? gte(users.dateOfBirth, yearsAgo(filters.maxAge))
    : undefined;
  const nationalityCondition = filters.nationalities
    ? inArray(users.nationality, filters.nationalities)
    : undefined;

  return and(
    searchCondition,
    genderCondition,
    minAgeCondition,
    maxAgeCondition,
    nationalityCondition,
  );
}

const SORTABLE_COLUMNS = {
  name: users.name,
  surname: users.surname,
  createdAt: users.createdAt,
};

function buildOrderByClause(sortBy?: string, order?: "asc" | "desc") {
  if (sortBy === "age") {
    return order === "desc" ? asc(users.dateOfBirth) : desc(users.dateOfBirth);
  }
  const column =
    sortBy && sortBy in SORTABLE_COLUMNS
      ? SORTABLE_COLUMNS[sortBy as keyof typeof SORTABLE_COLUMNS]
      : users.id;
  return order === "desc" ? desc(column) : asc(column);
}

export const userService = {
  getAll: (
    page: number,
    limit: number,
    filters: UserFilters,
    sortBy?: string,
    order?: "asc" | "desc",
  ) => {
    const offset = (page - 1) * limit;
    const condition = buildWhereClause(filters);
    const orderBy = buildOrderByClause(sortBy, order);

    return db
      .select()
      .from(users)
      .where(condition)
      .offset(offset)
      .limit(limit)
      .orderBy(orderBy);
  },

  getById: async (id: number) => {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0] ?? null;
  },

  create: async (data: NewUser) => {
    const result = await db.insert(users).values(data).returning();
    return result[0];
  },

  register: async (data: NewUser & { password: string }) => {
    // check existed email
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email));
    if (existingUser.length > 0) {
      throw new Error("Email already registered");
    }

    //Hash the password before storing it in the database
    const { password, ...rest } = data;
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Insert with password hash and provider set to "local"
    const result = await db
      .insert(users)
      .values({ ...rest, passwordHash, provider: "local" })
      .returning();

    const { passwordHash: _, ...safeUser } = result[0]; // Exclude passwordHash from the returned user object
    return safeUser;
  },

  login: async (email: string, password: string) => {
    const result = await db.select().from(users).where(eq(users.email, email));
    const user = result[0];
    if (!user || !user.passwordHash) {
      throw new Error("Invalid email or password");
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error("Invalid email or password");
    }

    // Sign tokens after password is verified
    const payload = { userId: user.id, email: user.email };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
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
