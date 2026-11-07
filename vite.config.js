import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Request Logger (Logs every incoming API request to your terminal)
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} request to ${req.url}`);
  next();
});

// CockroachDB Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.connect()
  .then(() => console.log('Connected to CockroachDB successfully!'))
  .catch(err => console.error('CockroachDB connection error:', err));

// --- ROUTES ---

// 1. GET all messages
app.get('/api/messages', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM messages ORDER BY created_at ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// 2. POST new message
app.post('/api/messages', async (req, res) => {
  const {
    username,
    content,
    image_url,
    user_id,
    avatar_url,
    frame_url,
    effect_url,
    reply_to
  } = req.body;

  try {
    const { rows } = await pool.query(
      `INSERT INTO messages 
        (username, content, image_url, user_id, avatar_url, frame_url, effect_url, reply_to) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        username,
        content,
        image_url,
        user_id,
        avatar_url,
        frame_url,
        effect_url,
        reply_to ? JSON.stringify(reply_to) : null
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating message:', err);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// 3. PUT (Edit) message
app.put('/api/messages/:id', async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  try {
    const { rows } = await pool.query(
      'UPDATE messages SET content = $1 WHERE id = $2 RETURNING *',
      [content, id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating message:', err);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// 4. DELETE message
app.delete('/api/messages/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM messages WHERE id = $1', [id]);
    res.json({ message: 'Message deleted successfully' });
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
