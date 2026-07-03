import { FastifyRequest, FastifyReply, preHandlerHookHandler } from "fastify";
import { verifyAccessToken } from "../utils/jwt";
import { sendError } from "../utils/response";

export const authenticate: preHandlerHookHandler = async (req, reply) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(reply, 401, "Missing or invalid Authorization header");
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
  } catch (err) {
    return sendError(reply, 401, "Invalid or expired token");
  }
};

export function requireRole(allowedRoles: string[]): preHandlerHookHandler {
  return async (req, reply) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return sendError(reply, 403, "Forbidden: Insufficient role");
    }
  };
} 