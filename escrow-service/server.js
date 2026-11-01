const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const PROOF_STORAGE_DIR = process.env.PROOF_STORAGE_DIR || '/app/proof_media';

if (!fs.existsSync(PROOF_STORAGE_DIR)) {
  fs.mkdirSync(PROOF_STORAGE_DIR, { recursive: true });
}

app.get('/health', (req, res) => res.status(200).json({ status: 'UP', service: 'escrow-service' }));

app.get('/ledgers', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM escrow_ledgers ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/lock', async (req, res) => {
  const { jobId, userName, workerName, agreedAmount } = req.body;
  const gross = Number(agreedAmount);
  const flatFee = 25.00;
  const netPayout = Math.max(gross - flatFee, 0);

  try {
    const { rows } = await pool.query(
      `INSERT INTO escrow_ledgers (job_id, user_name, worker_name, agreed_amount, flat_platform_fee, worker_payout, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'HELD_IN_ESCROW')
       ON CONFLICT (job_id) DO UPDATE SET agreed_amount = $4, status = 'HELD_IN_ESCROW'
       RETURNING *`,
      [jobId, userName || 'Homeowner', workerName || 'Verified Worker', gross, flatFee, netPayout]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/proof/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const { beforePhoto, afterPhoto } = req.body;
  try {
    const proofManifest = path.join(PROOF_STORAGE_DIR, `proof_${jobId}.json`);
    fs.writeFileSync(proofManifest, JSON.stringify({ jobId, beforePhoto, afterPhoto, uploadedAt: new Date() }));

    const { rows } = await pool.query(
      `UPDATE escrow_ledgers
       SET before_photo_url = $1, after_photo_url = $2, status = 'PROOF_SUBMITTED'
       WHERE job_id = $3 RETURNING *`,
      [beforePhoto, afterPhoto, jobId]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/release/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const { expressPayout } = req.body;
  try {
    const current = await pool.query('SELECT * FROM escrow_ledgers WHERE job_id = $1', [jobId]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Escrow record not found' });

    const record = current.rows[0];
    const expressFee = expressPayout ? Number((record.agreed_amount * 0.02).toFixed(2)) : 0.00;
    const finalPayout = Number((record.agreed_amount - record.flat_platform_fee - expressFee).toFixed(2));

    const { rows } = await pool.query(
      `UPDATE escrow_ledgers
       SET express_fee = $1, worker_payout = $2, status = 'RELEASED_TO_WORKER'
       WHERE job_id = $3 RETURNING *`,
      [expressFee, finalPayout, jobId]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4003;
app.listen(PORT, () => console.log(`Escrow Service running on port ${PORT}`));
