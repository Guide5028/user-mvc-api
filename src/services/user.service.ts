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
import {
  users,
  NewUser,
  resetpasswordTokens,
  NewResetPasswordToken,
} from "../models/user.model";
import bcrypt from "bcrypt";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { refreshTokens } from "../models/user.model";
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
  getAll: async (
    page: number,
    limit: number,
    filters: UserFilters,
    sortBy?: string,
    order?: "asc" | "desc",
  ) => {
    const offset = (page - 1) * limit;
    const condition = buildWhereClause(filters);
    const orderBy = buildOrderByClause(sortBy, order);

    const result = await db
      .select()
      .from(users)
      .where(condition)
      .offset(offset)
      .limit(limit)
      .orderBy(orderBy);

    return result.map(({ passwordHash, ...safeUser }) => safeUser);
  },

  getById: async (id: number) => {
    const result = await db.select().from(users).where(eq(users.id, id));
    if (!result[0]) return null;
    const { passwordHash, ...safeUser } = result[0];
    return safeUser;
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

    const sessionId = crypto.randomUUID().toString(); // Generate a unique session ID for the refresh token
    // Sign tokens after password is verified
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Store the refresh token in the database with an expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.insert(refreshTokens).values({
      userId: user.id,
      token: refreshToken,
      sessionId,
      expiresAt,
    });

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
  },

  refresh: async (refreshToken: string) => {
    const existingToken = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, refreshToken));

    if (existingToken.length === 0) {
      throw new Error("Refresh token not found");
    }

    const tokenData = existingToken[0];
    if (new Date(tokenData.expiresAt) < new Date()) {
      throw new Error("Refresh token has expired");
    }
    const payload = verifyRefreshToken(refreshToken);

    // 1. Kill the old refresh token — it's about to be replaced.
    await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));

    // 1b. New session identity — this is what makes the OLD access token
    // die immediately, since its sessionId will no longer exist anywhere.
    const newSessionId = crypto.randomUUID();

    // 2. Mint a fresh refresh token, same as login() does.
    const newRefreshToken = signRefreshToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      sessionId: newSessionId,
    });

    // 3. Store it, with a new 7-day expiry, same shape as login().
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await db.insert(refreshTokens).values({
      userId: payload.userId,
      token: newRefreshToken,
      sessionId: newSessionId,
      expiresAt,
    });
    const newAccessToken = signAccessToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      sessionId: newSessionId,
    });
    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  },

  logout: async (refreshToken: string) => {
    const deleted = await db
      .delete(refreshTokens)
      .where(eq(refreshTokens.token, refreshToken))
      .returning();

    if (deleted.length === 0) {
      throw new Error("Refresh token not found");
    }
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

  requestPasswordReset: async (email: string) => {
    const result = await db.select().from(users).where(eq(users.email, email));
    const user = result[0];

    if (!user) {
      return null; // Do not reveal whether the email exists in the system for security reasons
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await db.insert(resetpasswordTokens).values({
      userId: user.id,
      token,
      expiresAt,
    });

    return token;
  },

  resetPassword: async (token: string, newPassword: string) => {
    const result = await db
      .select()
      .from(resetpasswordTokens)
      .where(eq(resetpasswordTokens.token, token));

    const resetRecord = result[0];
    if (!resetRecord || new Date(resetRecord.expiresAt) < new Date()) {
      throw new Error("Invalid or expired reset token");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, resetRecord.userId));

    await db
      .delete(resetpasswordTokens)
      .where(eq(resetpasswordTokens.token, token));
  },

  // Shared by both Google and Facebook callbacks: find an existing user for
  // this provider, or link/create one, then issue our own access/refresh
  // tokens exactly like login() does.
  findOrCreateSocialUser: async (
    provider: "google" | "facebook",
    providerId: string,
    email: string,
    name: string,
  ) => {
    const byProvider = await db
      .select()
      .from(users)
      .where(and(eq(users.provider, provider), eq(users.providerId, providerId)));

    let user = byProvider[0];

    if (!user) {
      // Not linked yet — if an account with this email already exists
      // (e.g. registered locally before), link this provider to it instead
      // of creating a duplicate.
      const byEmail = await db.select().from(users).where(eq(users.email, email));

      if (byEmail[0]) {
        const updated = await db
          .update(users)
          .set({ provider, providerId })
          .where(eq(users.id, byEmail[0].id))
          .returning();
        user = updated[0];
      } else {
        const [first, ...rest] = name.split(" ");
        const inserted = await db
          .insert(users)
          .values({
            name: first || name,
            surname: rest.join(" ") || "-",
            email,
            provider,
            providerId,
          } as NewUser)
          .returning();
        user = inserted[0];
      }
    }

    const sessionId = crypto.randomUUID();
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await db.insert(refreshTokens).values({
      userId: user.id,
      token: refreshToken,
      sessionId,
      expiresAt,
    });

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
  },
};
