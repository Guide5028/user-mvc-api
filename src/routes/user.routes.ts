import { FastifyInstance } from "fastify";
import { userController } from "../controllers/user.controller";

export async function userRoutes(app: FastifyInstance) {
  app.get("/users", userController.getAll);
  app.get("/users/:id", userController.getById);
  app.post("/users", userController.create);
  app.put("/users/:id", userController.update);
  app.delete("/users/:id", userController.remove);
  app.delete("/users/:id/avatar", userController.deleteAvatarOnly);
}
