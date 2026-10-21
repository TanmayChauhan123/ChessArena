import express from "express";
import authRoutes from "./routes/authRoutes.js";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";
import helmet from "helmet";
import { initializeSocket } from "./sockets/socketServer.js";
import pool from "./config/database.js";
import gameHistoryRoutes from "./routes/gameHistoryRoutes.js";

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
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/games", gameHistoryRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ChessArena backend is running",
  });
});


const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`ChessArena server running on port ${PORT}`);

  try {
    const result = await pool.query("SELECT NOW()");
    console.log("PostgreSQL connected successfully:", result.rows[0].now);
  } catch (error) {
    console.error("PostgreSQL connection failed:", error.message);
  }
});
