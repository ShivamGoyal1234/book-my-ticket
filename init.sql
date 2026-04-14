CREATE TABLE IF NOT EXISTS seats (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    isbooked INT DEFAULT 0
);

INSERT INTO seats (isbooked)
SELECT 0 FROM generate_series(1, 120)
WHERE NOT EXISTS (SELECT 1 FROM seats LIMIT 1);

CREATE TABLE IF NOT EXISTS users (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    email               VARCHAR(255) UNIQUE NOT NULL,
    password            VARCHAR(255) NOT NULL,
    reset_token         VARCHAR(255),
    reset_token_expires TIMESTAMP,
    created_at          TIMESTAMP DEFAULT NOW()
);
