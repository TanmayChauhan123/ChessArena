
CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,

    white_player_id INTEGER NOT NULL REFERENCES users(id),
    black_player_id INTEGER NOT NULL REFERENCES users(id),

    result VARCHAR(10),
    status VARCHAR(20) NOT NULL DEFAULT 'active',

    pgn TEXT,
    moves JSONB NOT NULL DEFAULT '[]'::jsonb,

    white_rating_before INTEGER,
    black_rating_before INTEGER,
    white_rating_after INTEGER,
    black_rating_after INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,

    CHECK (white_player_id <> black_player_id),
    CHECK (result IS NULL OR result IN ('white', 'black', 'draw')),
    CHECK (status IN ('active', 'completed', 'abandoned'))
);

CREATE INDEX IF NOT EXISTS idx_games_white_player
ON games(white_player_id);

CREATE INDEX IF NOT EXISTS idx_games_black_player
ON games(black_player_id);

CREATE INDEX IF NOT EXISTS idx_games_completed_at
ON games(completed_at);
