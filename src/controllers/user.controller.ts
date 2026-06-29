import { FastifyRequest, FastifyReply } from "fastify";
import { userService } from "../services/user.service";
import { sendSuccess, sendError } from "../utils/response";
import { supabase, getSignedAvatarUrl, deleteAvatar } from "../storage/client";

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

async function withSignedAvatar<T extends { avatarUrl: string | null }>(
  user: T,
) {
  const signedUrl = await getSignedAvatarUrl(user.avatarUrl);
  return { ...user, avatarUrl: signedUrl };
}

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
    const usersWithAvatars = await Promise.all(data.map(withSignedAvatar));
    return sendSuccess(reply, usersWithAvatars);
  },

  getById: async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const id = Number(req.params.id);
    const user = await userService.getById(id);
    if (!user) {
      return sendError(reply, 404, "User not found");
    }
    return sendSuccess(reply, await withSignedAvatar(user));
  },

  create: async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as Record<string, unknown>;
    const { name, surname, dateOfBirth, gender, email } = body;
    const parsedDateOfBirth = new Date(dateOfBirth as string);
    const age = dateOfBirth ? calculateAge(parsedDateOfBirth) : undefined;

    if (!name || !surname || !dateOfBirth || !gender || !email) {
      return sendError(
        reply,
        400,
        "name, surname, date of birth, gender and email are required",
      );
    }

    if (!VALID_GENDERS.includes(gender as string)) {
      return sendError(
        reply,
        400,
        `gender must be one of: ${VALID_GENDERS.join(", ")}`,
      );
    }

    const user = await userService.create({
      ...body,
      age,
      dateOfBirth: parsedDateOfBirth,
    } as any);
    return sendSuccess(reply, await withSignedAvatar(user), 201);
  },

  update: async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const id = Number(req.params.id);
    const existing = await userService.getById(id);
    if (!existing) {
      return sendError(reply, 404, "User not found");
    }

    const fields: Record<string, unknown> = {};
    let fileBuffer: Buffer | undefined;
    let fileMimetype: string | undefined;

    for await (const part of req.parts()) {
      if (part.type === "file") {
        fileBuffer = await part.toBuffer();
        fileMimetype = part.mimetype;
      } else {
        fields[part.fieldname] = part.value;
      }
    }

    let avatarUrl = existing.avatarUrl;

    if (fields.removeAvatar === "true") {
      await deleteAvatar(existing.avatarUrl);
      avatarUrl = null;
    }

    if (fileBuffer) {
      await deleteAvatar(existing.avatarUrl);
      const fileName = `user-${id}-${Date.now()}.jpg`;
      const { data: uploadData, error } = await supabase.storage
        .from("avatars")
        .upload(fileName, fileBuffer, { contentType: fileMimetype });
      if (error) {
        return sendError(reply, 500, error.message);
      }
      avatarUrl = uploadData.path;
    }

    const updated = await userService.update(id, {
      ...fields,
      avatarUrl,
    } as any);
    return sendSuccess(reply, await withSignedAvatar(updated));
  },

  remove: async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const id = Number(req.params.id);
    const existing = await userService.getById(id);
    if (!existing) {
      return sendError(reply, 404, "User not found");
    }
    await userService.remove(id);
    return reply.status(204).send();
  },

  deleteAvatarOnly: async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const id = Number(req.params.id);
    const existing = await userService.getById(id);
    if (!existing) {
      return sendError(reply, 404, "User not found");
    }
    await deleteAvatar(existing.avatarUrl);
    const updated = await userService.update(id, { avatarUrl: null } as any);
    return sendSuccess(reply, await withSignedAvatar(updated));
  },
};
