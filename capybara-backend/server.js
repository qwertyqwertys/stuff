import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

// Increase body parser limits to 10MB to handle large base64 image uploads and avatars[cite: 5, 6]
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} request to ${req.url}`);
  next();
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect()
  .then(() => console.log('Connected to CockroachDB successfully!'))
  .catch(err => console.error('CockroachDB connection error:', err));

// --- API ROUTES ---

// 1. GET all messages (so old messages show up)[cite: 5, 6]
app.get('/api/messages', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM messages ORDER BY created_at ASC');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// 2. POST a new message (so new messages stick and save)[cite: 5, 6]
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
    // Generate a unique string ID to satisfy the primary key column requirement[cite: 5, 6]
    const id = Date.now().toString();

    const { rows } = await pool.query(
      `INSERT INTO messages 
        (id, username, content, image_url, user_id, avatar_url, frame_url, effect_url, reply_to) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        id,
        username || 'Anonymous',
        content,
        image_url || null,
        user_id || null,
        avatar_url || null,
        frame_url || null,
        effect_url || null,
        reply_to ? JSON.stringify(reply_to) : null
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating message:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. PUT (Edit) a message[cite: 5, 6]
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
    res.status(500).json({ error: err.message });
  }
});

// 4. PUT (Sync Global Profile across all messages by Username with Logs)
app.put('/api/profile', async (req, res) => {
  const { username, avatar_url, frame_url, effect_url } = req.body;

  if (!username) {
    console.log('[PROFILE SYNC ERROR] Missing username in request body.');
    return res.status(400).json({ error: 'Username is required for profile sync' });
  }

  try {
    console.log(`[PROFILE SYNC] Attempting to update messages for username: "${username.trim()}"`);
    
    const { rows } = await pool.query(
      `UPDATE messages 
       SET avatar_url = $1, 
           frame_url = $2, 
           effect_url = $3 
       WHERE username ILIKE $4
       RETURNING *`,
      [avatar_url || null, frame_url || null, effect_url || null, username.trim()]
    );
    
    console.log(`[PROFILE SYNC SUCCESS] Updated ${rows.length} message row(s) for "${username}"`);
    res.json({ success: true, updatedCount: rows.length });
  } catch (err) {
    console.error('[PROFILE SYNC ERROR] Database error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// 5. DELETE a message[cite: 5, 6]
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
