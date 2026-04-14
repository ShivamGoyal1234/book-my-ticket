CREATE TABLE IF NOT EXISTS seats (
    id          SERIAL PRIMARY KEY,
    movie_id    INT NOT NULL DEFAULT 1,
    seat_number INT NOT NULL,
    name        VARCHAR(255),
    isbooked    INT DEFAULT 0
);

INSERT INTO seats (movie_id, seat_number, isbooked)
SELECT m.id, s.n, 0
FROM generate_series(1, 3) AS m(id)
CROSS JOIN generate_series(1, 120) AS s(n)
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
