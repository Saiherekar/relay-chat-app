import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import chatRoutes from "./routes/chatRoutes";
import userRoutes from "./routes/userRoutes";
import { errorMiddleware } from "./middleware/errorMiddleware";
import { initializeSocket } from "./config/socket.config";
import { logger } from "./utils/logger";

const app = express();

app.use(helmet());

app.use(
  cors({ origin: process.env.CLIENT_URL?.split(",") ?? [], credentials: true }),
);

app.use(express.json({ limit: "1mb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get("/health", (_req, res) =>
  res.json({ status: "ok", time: new Date().toISOString() }),
);

const openapi = {
  openapi: "3.0.3",
  info: { title: "Relay Chat API", version: "1.0.0" },
  servers: [{ url: "/api" }],
  paths: {
    "/user/register": { post: { summary: "Create account" } },
    "/user/login": { post: { summary: "Login" } },
    "/user/chats": {
      get: {
        summary: "List authenticated user's chats",
        security: [{ bearerAuth: [] }],
      },
    },
    "/chat/create": {
      post: {
        summary: "Create or retrieve one-to-one chat",
        security: [{ bearerAuth: [] }],
      },
    },
    "/chat/{chatId}/message/send": {
      post: { summary: "Send message", security: [{ bearerAuth: [] }] },
    },
    "/chat/{chatId}/messages": {
      get: { summary: "Paginated messages", security: [{ bearerAuth: [] }] },
    },
    "/chat/{chatId}/message/{messageId}/read": {
      post: { summary: "Mark message read", security: [{ bearerAuth: [] }] },
    },
    "/chat/{chatId}/lastseen": {
      post: { summary: "Update last seen", security: [{ bearerAuth: [] }] },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
  },
};

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapi));
app.use("/api/chat", chatRoutes);
app.use("/api/user", userRoutes);

app.use((_req, res) =>
  res.status(404).json({
    success: false,
    message: "Route not found",
    data: null,
    errors: [],
  }),
);

app.use(errorMiddleware);

const server = http.createServer(app);

initializeSocket(server);

const port = Number(process.env.PORT ?? 5000);

if (require.main === module)
  server.listen(port, () => logger.info(`Relay Chat API listening on ${port}`));

export { app, server };
