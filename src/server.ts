import "dotenv/config";
import Fastify from "fastify";
import { userRoutes } from "./routes/user.routes";
import multipart from "@fastify/multipart";

const app = Fastify({ logger: true });
const PORT = Number(process.env.PORT) || 3002;

app.register(userRoutes);
app.register(multipart);

app.listen({ port: PORT }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`user-mvc-api running on http://localhost:${PORT}`);
});
