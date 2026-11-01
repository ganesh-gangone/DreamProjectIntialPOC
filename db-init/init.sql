CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('USER', 'WORKER', 'ADMIN')),
    kyc_verified BOOLEAN DEFAULT FALSE,
    premium_badge BOOLEAN DEFAULT FALSE,
    worker_tier VARCHAR(16) DEFAULT 'BRONZE',
    strikes INT DEFAULT 0 CHECK (strikes <= 3),
    loyalty_points INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escrow_ledgers (
    escrow_id SERIAL PRIMARY KEY,
    job_id VARCHAR(64) UNIQUE NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    worker_name VARCHAR(100) NOT NULL,
    agreed_amount NUMERIC(10, 2) NOT NULL,
    flat_platform_fee NUMERIC(10, 2) NOT NULL,
    express_fee NUMERIC(10, 2) DEFAULT 0.00,
    worker_payout NUMERIC(10, 2) NOT NULL,
    status VARCHAR(24) DEFAULT 'HELD_IN_ESCROW',
    before_photo_url TEXT,
    after_photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO users (name, role, kyc_verified, premium_badge, worker_tier, loyalty_points)
VALUES 
  ('Martha (Senior Homeowner)', 'USER', TRUE, FALSE, 'BRONZE', 150),
  ('Raju (Master Plumber)', 'WORKER', TRUE, TRUE, 'GOLD', 0)
ON CONFLICT DO NOTHING;
