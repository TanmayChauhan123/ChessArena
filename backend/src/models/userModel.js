import pool from "../config/database.js";

export const createUser = async (username, email, passwordHash) => {
  const query = `
        INSERT INTO users (username, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, username, email, rating, created_at
    `;

  const values = [username, email, passwordHash];

  const result = await pool.query(query, values);

  return result.rows[0];
};

export const findUserByEmail = async (email) => {
  const query = `
        SELECT *
        FROM users
        WHERE email = $1
    `;

  const result = await pool.query(query, [email]);

  return result.rows[0];
};

export const findUserById = async (id) => {
  const query = `
        SELECT id, username, email, rating, created_at
        FROM users
        WHERE id = $1
    `;

  const result = await pool.query(query, [id]);

  return result.rows[0];
};
