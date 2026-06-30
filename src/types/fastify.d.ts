import { TokenPayload } from "../utils/jwt";

declare module "fastify" {
  interface FastifyRequest {
    user?: TokenPayload;
  }
}