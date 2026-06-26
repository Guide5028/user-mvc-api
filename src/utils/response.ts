import { FastifyReply } from "fastify";

export function sendSuccess(reply: FastifyReply, data: unknown, statusCode = 200) {
  return reply.status(statusCode).send({ success: true, data });
}

export function sendError(reply: FastifyReply, statusCode: number, message: string) {
  return reply.status(statusCode).send({ success: false, message });
}