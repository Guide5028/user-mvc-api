import { FastifyInstance } from "fastify";
import { userController } from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";

export async function userRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: {
      page?: string;
      limit?: string;
      gender?: "male" | "female" | "other";
      minAge?: string;
      maxAge?: string;
      nationalities?: string;
      search?: string;
      sortBy?: string;
      order?: "asc" | "desc";
    };
  }>("/users", { preHandler: authenticate }, userController.getAll);

  app.get<{ Params: { id: string } }>(
    "/users/:id",
    { preHandler: authenticate },
    userController.getById,
  );

  app.post("/users", userController.create);
  app.post("/users/register", userController.register);
  app.post("/users/login", userController.login);
  app.post("/users/refresh", userController.refresh);
  app.post(
    "/users/logout",
    { preHandler: authenticate },
    userController.logout,
  );

  app.put<{ Params: { id: string } }>(
    "/users/:id",
    { preHandler: authenticate },
    userController.update,
  );

  app.delete<{ Params: { id: string } }>(
    "/users/:id",
    { preHandler: authenticate },
    userController.remove,
  );

  app.delete<{ Params: { id: string } }>(
    "/users/:id/avatar",
    { preHandler: authenticate },
    userController.deleteAvatarOnly,
  );
}
