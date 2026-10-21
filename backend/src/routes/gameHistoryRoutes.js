import express from "express";
import { getUserGameHistory } from "../services/chess/gameHistoryQueryService.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authenticate, async (req, res) => {
  try {
    const games = await getUserGameHistory(req.userId);

    res.status(200).json({
      success: true,
      count: games.length,
      games,
    });
  } catch (error) {
    console.error("Failed to fetch game history:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch game history.",
    });
  }
});

export default router;
