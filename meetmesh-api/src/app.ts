import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { createServer } from "http";
import router from "./routes";
import { logger } from "./lib/logger";
import { setupSocketIO, getStats } from "./routes/meetings";

const app: Express = express();

// ── Security headers ────────────────────────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

// ── CORS — configurable via ALLOWED_ORIGIN env var ──────────────────────────
const allowedOrigin = process.env["ALLOWED_ORIGIN"] || "*";
app.use(
  cors({
    origin: allowedOrigin,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// ── Root info endpoint ──────────────────────────────────────────────────────
app.get("/", (_req: Request, res: Response) => {
  res.json({
    service: "we-inai API & WebSocket Relay",
    status: "online",
    frontend: "http://localhost:5173",
    health: "/api/health",
  });
});

// ── Health / stats endpoint ─────────────────────────────────────────────────
app.get("/api/health", (_req: Request, res: Response) => {
  const stats = getStats();
  res.json({ status: "ok", ...stats, uptime: Math.floor(process.uptime()) });
});

const server = createServer(app);
setupSocketIO(server);

export { server };
export default app;
