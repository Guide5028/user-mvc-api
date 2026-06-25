import { FastifyRequest, FastifyReply } from "fastify";
import { userService } from "../services/user.service";

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > dateOfBirth.getMonth() ||
    (today.getMonth() === dateOfBirth.getMonth() &&
      today.getDate() >= dateOfBirth.getDate());
  if (!hasHadBirthdayThisYear) age--;
  return age;
}

const VALID_GENDERS = ["male", "female", "other"];

export const userController = {
  getAll: async (
    req: FastifyRequest<{
      Querystring: {
        page?: string;
        limit?: string;
        gender?: undefined | "male" | "female" | "other";
        minAge?: string;
        maxAge?: string;
        nationalities?: string;
        search?: string;
        sortBy?: string;
        order?: "asc" | "desc";
      };
    }>,
    reply: FastifyReply,
  ) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const gender =
      req.query.gender && VALID_GENDERS.includes(req.query.gender)
        ? req.query.gender
        : undefined;
    const minAge = req.query.minAge ? Number(req.query.minAge) : undefined;
    const maxAge = req.query.maxAge ? Number(req.query.maxAge) : undefined;
    const nationalities = req.query.nationalities
      ? req.query.nationalities.split(",")
      : undefined;
    const search = req.query.search;
    const sortBy = req.query.sortBy;
    const order = req.query.order;
    const data = await userService.getAll(
      page,
      limit,
      { gender, minAge, maxAge, nationalities, search },
      sortBy,
      order,
    );
    return reply.status(200).send(data);
  },

  getById: async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const id = Number(req.params.id);
    const user = await userService.getById(id);
    if (!user) {
      return reply.status(404).send({ message: "User not found" });
    }
    return reply.status(200).send(user);
  },

  create: async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as Record<string, unknown>;
    const { name, surname, dateOfBirth, gender, email } = body;
    const parsedDateOfBirth = new Date(dateOfBirth as string);
    const age = dateOfBirth ? calculateAge(parsedDateOfBirth) : undefined;
    if (!name || !surname || !dateOfBirth || !gender || !email) {
      return reply.status(400).send({
        message: "name, surname, date of birth, gender and email are required",
      });
    }
    const user = await userService.create({
      ...body,
      age,
      dateOfBirth: parsedDateOfBirth,
    } as any);
    return reply.status(201).send(user);
  },

  update: async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const id = Number(req.params.id);
    const existing = await userService.getById(id);
    if (!existing) {
      return reply.status(404).send({ message: "User not found" });
    }
    const updated = await userService.update(id, req.body as any);
    return reply.status(200).send(updated);
  },

  remove: async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const id = Number(req.params.id);
    const existing = await userService.getById(id);
    if (!existing) {
      return reply.status(404).send({ message: "User not found" });
    }
    await userService.remove(id);
    return reply.status(204).send();
  },
};
