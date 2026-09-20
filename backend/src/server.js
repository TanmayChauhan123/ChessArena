import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import { initializeSocket } from "./sockets/socketServer.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

initializeSocket(server);

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ChessArena backend is running",
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`ChessArena server running on port ${PORT}`);
});
