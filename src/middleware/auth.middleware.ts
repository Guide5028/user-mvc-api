import { preHandlerHookHandler } from "fastify";
import { verifyAccessToken } from "../utils/jwt";
import { sendError } from "../utils/response";
import { db } from "../db/client";
import { refreshTokens } from "../models/user.model";
import { eq } from "drizzle-orm";

export const authenticate: preHandlerHookHandler = async (req, reply) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(reply, 401, "Missing or invalid Authorization header");
  } 

  const token = authHeader.split(" ")[1];

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    return sendError(reply, 401, "Invalid or expired token");
  }

  // Check if the session is still valid in the database
  const session = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.sessionId, payload.sessionId));

  if (session.length === 0) {
    return sendError(reply, 401, "Session has been revoked");
  }

  req.user = payload;
};

export function requireRole(allowedRoles: string[]): preHandlerHookHandler {
  return async (req, reply) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return sendError(reply, 403, "Forbidden: Insufficient role");
    }
  };
} 