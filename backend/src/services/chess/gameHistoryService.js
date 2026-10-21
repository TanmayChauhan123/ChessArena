import pool from "../../config/database.js";

const K_FACTOR = 32;

export const saveCompletedGame = async (game, result) => {
  if (!game || !game.whiteUserId || !game.blackUserId) {
    throw new Error("Both player IDs are required to save a game.");
  }

  const whiteId = game.whiteUserId;
  const blackId = game.blackUserId;

  if (String(whiteId) === String(blackId)) {
    throw new Error("A player cannot play against themselves.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock both users so concurrent rating updates cannot overwrite each other.
    const usersResult = await client.query(
      `SELECT id, rating
       FROM users
       WHERE id = ANY($1::int[])
       ORDER BY id
       FOR UPDATE`,
      [[whiteId, blackId]],
    );

    if (usersResult.rows.length !== 2) {
      throw new Error("Could not find both players in the database.");
    }

    const users = new Map(
      usersResult.rows.map((user) => [String(user.id), Number(user.rating)]),
    );

    const whiteBefore = users.get(String(whiteId));
    const blackBefore = users.get(String(blackId));

    // Calculate the result from the final chess position.

    if (!["white", "black", "draw"].includes(result)) {
      throw new Error("Invalid game result.");
    }

    const whiteScore = result === "white" ? 1 : result === "draw" ? 0.5 : 0;

    const blackScore = 1 - whiteScore;

    const expectedWhite = 1 / (1 + 10 ** ((blackBefore - whiteBefore) / 400));

    const expectedBlack = 1 / (1 + 10 ** ((whiteBefore - blackBefore) / 400));

    const whiteAfter = Math.round(
      whiteBefore + K_FACTOR * (whiteScore - expectedWhite),
    );

    const blackAfter = Math.round(
      blackBefore + K_FACTOR * (blackScore - expectedBlack),
    );

    const pgn = game.chess.pgn();
    const moves = game.chess.history({ verbose: true });

    const savedGame = await client.query(
      `INSERT INTO games (
         white_player_id,
         black_player_id,
         result,
         status,
         pgn,
         moves,
         white_rating_before,
         black_rating_before,
         white_rating_after,
         black_rating_after,
         completed_at
       )
       VALUES ($1, $2, $3, 'completed', $4, $5::jsonb, $6, $7, $8, $9, NOW())
       RETURNING id`,
      [
        whiteId,
        blackId,
        result,
        pgn,
        JSON.stringify(moves),
        whiteBefore,
        blackBefore,
        whiteAfter,
        blackAfter,
      ],
    );

    await client.query("UPDATE users SET rating = $1 WHERE id = $2", [
      whiteAfter,
      whiteId,
    ]);

    await client.query("UPDATE users SET rating = $1 WHERE id = $2", [
      blackAfter,
      blackId,
    ]);

    await client.query("COMMIT");

    return {
      gameId: savedGame.rows[0].id,
      result,
      whiteRating: { before: whiteBefore, after: whiteAfter },
      blackRating: { before: blackBefore, after: blackAfter },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
