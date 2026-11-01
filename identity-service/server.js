const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

app.get('/health', (req, res) => res.status(200).json({ status: 'UP', service: 'identity-service' }));

app.get('/users', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/verify-kyc', async (req, res) => {
  const { name, role, premium_badge } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (name, role, kyc_verified, premium_badge, worker_tier)
       VALUES ($1, $2, TRUE, $3, 'SILVER') RETURNING *`,
      [name, role || 'WORKER', Boolean(premium_badge)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`Identity Service running on port ${PORT}`));
