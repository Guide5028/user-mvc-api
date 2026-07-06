import "dotenv/config";
import path from "path";
import Fastify from "fastify";
import { userRoutes } from "./routes/user.routes";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";

const app = Fastify({ logger: true });
const PORT = Number(process.env.PORT) || 3002;

//size limit for file uploads (5 MB)
app.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// Serves everything in /public — index.html, success.html, etc.
app.register(fastifyStatic, {
  root: path.join(__dirname, "..", "public"),
});

app.register(userRoutes);

app.listen({ port: PORT }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`user-mvc-api running on http://localhost:${PORT}`);
});
