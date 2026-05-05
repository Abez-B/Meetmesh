import { createServer } from "http";
import app from "./app";
import { setupSocketIO } from "./routes/meetings";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);
setupSocketIO(server);

server.listen(port, () => {
  logger.info({ port }, "Server listening");
});
