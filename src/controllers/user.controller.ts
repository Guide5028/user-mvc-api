import { FastifyRequest, FastifyReply } from "fastify";
import { userService } from "../services/user.service";

const VALID_GENDERS = ["male", "female", "other"];

export const userController = {
  getAll: async (req: FastifyRequest<{ Querystring: { page?: string; limit?: string; gender?: undefined | "male" | "female" | "other" } }>, reply: FastifyReply) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const gender = req.query.gender && VALID_GENDERS.includes(req.query.gender) ? req.query.gender : undefined;
    const data = await userService.getAll(page, limit, gender);
    return reply.status(200).send(data);
  },

  getById: async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = Number(req.params.id);
    const user = await userService.getById(id);
    if (!user) {
      return reply.status(404).send({ message: "User not found" });
    }
    return reply.status(200).send(user);
  },

  create: async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as Record<string, unknown>;
    const { name, surname, age, gender, email } = body;

    if (!name || !surname || !age || !gender || !email) {
      return reply.status(400).send({
        message: "name, surname, age, gender and email are required",
      });
    }

    const user = await userService.create(body as any);
    return reply.status(201).send(user);
  },

  update: async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = Number(req.params.id);
    const existing = await userService.getById(id);
    if (!existing) {
      return reply.status(404).send({ message: "User not found" });
    }
    const updated = await userService.update(id, req.body as any);
    return reply.status(200).send(updated);
  },

  remove: async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = Number(req.params.id);
    const existing = await userService.getById(id);
    if (!existing) {
      return reply.status(404).send({ message: "User not found" });
    }
    await userService.remove(id);
    return reply.status(204).send();
  },
};
