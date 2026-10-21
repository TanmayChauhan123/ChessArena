import pool from "../../config/database.js";

export const getUserGameHistory = async (userId) => {
  const query = `
    SELECT
      g.id,
      g.result,
      g.status,
      g.white_player_id,
      g.black_player_id,
      g.white_rating_before,
      g.white_rating_after,
      g.black_rating_before,
      g.black_rating_after,
      g.completed_at,
      CASE
        WHEN g.white_player_id = $1 THEN opponent.username
        ELSE opponent.username
      END AS opponent_username,
      CASE
        WHEN g.white_player_id = $1 THEN 'white'
        ELSE 'black'
      END AS player_color,
      CASE
        WHEN g.white_player_id = $1
          THEN g.white_rating_before
        ELSE g.black_rating_before
      END AS player_rating_before,
      CASE
        WHEN g.white_player_id = $1
          THEN g.white_rating_after
        ELSE g.black_rating_after
      END AS player_rating_after
    FROM games g
    JOIN users opponent
      ON opponent.id = CASE
        WHEN g.white_player_id = $1 THEN g.black_player_id
        ELSE g.white_player_id
      END
    WHERE
      (g.white_player_id = $1 OR g.black_player_id = $1)
      AND g.status = 'completed'
    ORDER BY g.completed_at DESC NULLS LAST, g.id DESC;
  `;

  const { rows } = await pool.query(query, [userId]);

  return rows;
};
