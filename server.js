// ============================================================
// Filledears API Server
// node server.js
// ============================================================
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'filledears-secret-key-2026';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public'))); // Serve frontend

// MySQL Pool
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'filledears',
    waitForConnections: true,
    connectionLimit: 10
});

// Auth Middleware
function auth(req, res, next) {
    const h = req.headers.authorization;
    if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    try {
        req.user = jwt.verify(h.split(' ')[1], JWT_SECRET);
        next();
    } catch { res.status(401).json({ error: 'Invalid token' }); }
}

function admin(req, res, next) {
    if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
    next();
}

// ============================================================
// AUTH
// ============================================================

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password || password.length < 6)
            return res.status(400).json({ error: 'Name, email and password (min 6 chars) required' });

        const [exist] = await db.execute('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
        if (exist.length) return res.status(409).json({ error: 'Email already registered' });

        const hash = await bcrypt.hash(password, 10);
        const [[cnt]] = await db.execute('SELECT COUNT(*) as c FROM users');
        const num = cnt.c + 1;

        const [r] = await db.execute(
            'INSERT INTO users (name, email, password_hash, user_number, last_visit_date, streak) VALUES (?, ?, ?, ?, CURDATE(), 1)',
            [name, email.toLowerCase(), hash, num]
        );

        const token = jwt.sign({ id: r.insertId, email, is_admin: false }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            token,
            user: { id: r.insertId, name, email, user_number: num, streak: 1, news_read_count: 0, is_admin: false }
        });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
        if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

        const user = rows[0];
        if (!await bcrypt.compare(password, user.password_hash))
            return res.status(401).json({ error: 'Invalid credentials' });

        // Streak logic
        const today = new Date().toISOString().slice(0,10);
        const yest = new Date(Date.now() - 86400000).toISOString().slice(0,10);
        let streak = user.streak || 1;
        const last = user.last_visit_date ? user.last_visit_date.toISOString().slice(0,10) : null;
        if (last === yest) streak++;
        else if (last !== today) streak = 1;

        await db.execute('UPDATE users SET last_visit_date = CURDATE(), streak = ? WHERE id = ?', [streak, user.id]);

        const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            token,
            user: {
                id: user.id, name: user.name, email: user.email,
                user_number: user.user_number, streak,
                news_read_count: user.news_read_count,
                profile_image: user.profile_image,
                is_admin: user.is_admin
            }
        });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/auth/me
app.get('/api/auth/me', auth, async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT id, name, email, user_number, last_visit_date, streak, news_read_count, profile_image, is_admin FROM users WHERE id = ?',
            [req.user.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'User not found' });
        res.json(rows[0]);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ============================================================
// USERS
// ============================================================

// PUT /api/users/profile
app.put('/api/users/profile', auth, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name required' });
        await db.execute('UPDATE users SET name = ? WHERE id = ?', [name, req.user.id]);
        res.json({ success: true, name });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/users/profile-image
app.put('/api/users/profile-image', auth, async (req, res) => {
    try {
        await db.execute('UPDATE users SET profile_image = ? WHERE id = ?', [req.body.image_base64 || null, req.user.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/users/track-read
app.post('/api/users/track-read', auth, async (req, res) => {
    try {
        await db.execute('UPDATE users SET news_read_count = news_read_count + 1 WHERE id = ?', [req.user.id]);
        const [[r]] = await db.execute('SELECT news_read_count FROM users WHERE id = ?', [req.user.id]);
        res.json({ news_read_count: r.news_read_count });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ============================================================
// NEWS
// ============================================================

// GET /api/news (public)
app.get('/api/news', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT n.*, u.name as author_name,
                COUNT(DISTINCT l.id) as likes_count,
                COUNT(DISTINCT c.id) as comments_count
            FROM news n
            JOIN users u ON n.author_id = u.id
            LEFT JOIN likes l ON l.news_id = n.id
            LEFT JOIN comments c ON c.news_id = n.id
            GROUP BY n.id
            ORDER BY n.published_date DESC
        `);
        res.json(rows);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/news/:id (public)
app.get('/api/news/:id', async (req, res) => {
    try {
        const nid = req.params.id;
        const [[n]] = await db.execute(`
            SELECT n.*, u.name as author_name FROM news n
            JOIN users u ON n.author_id = u.id WHERE n.id = ?`, [nid]);
        if (!n) return res.status(404).json({ error: 'News not found' });

        const [comments] = await db.execute(`
            SELECT c.*, u.name as user_name, u.profile_image as user_avatar
            FROM comments c JOIN users u ON c.user_id = u.id
            WHERE c.news_id = ? ORDER BY c.created_at DESC`, [nid]);

        const [likes] = await db.execute('SELECT user_id FROM likes WHERE news_id = ?', [nid]);

        res.json({ ...n, comments, likes: likes.map(l => l.user_id) });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/news (admin only)
app.post('/api/news', auth, admin, async (req, res) => {
    try {
        const { title, category, content, image_base64 } = req.body;
        if (!title || !category || !content)
            return res.status(400).json({ error: 'Title, category and content required' });

        const [r] = await db.execute(
            'INSERT INTO news (title, category, content, author_id, image_base64) VALUES (?, ?, ?, ?, ?)',
            [title, category, content, req.user.id, image_base64 || null]
        );
        res.status(201).json({ id: r.insertId, title, category, content, author_id: req.user.id });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ============================================================
// LIKES
// ============================================================

// POST /api/news/:id/like (toggle)
app.post('/api/news/:id/like', auth, async (req, res) => {
    try {
        const nid = req.params.id;
        const uid = req.user.id;
        const [exist] = await db.execute('SELECT id FROM likes WHERE news_id = ? AND user_id = ?', [nid, uid]);
        if (exist.length) {
            await db.execute('DELETE FROM likes WHERE news_id = ? AND user_id = ?', [nid, uid]);
            res.json({ liked: false });
        } else {
            await db.execute('INSERT INTO likes (news_id, user_id) VALUES (?, ?)', [nid, uid]);
            res.json({ liked: true });
        }
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ============================================================
// COMMENTS
// ============================================================

// POST /api/news/:id/comments
app.post('/api/news/:id/comments', auth, async (req, res) => {
    try {
        const nid = req.params.id;
        const { text } = req.body;
        if (!text || !text.trim()) return res.status(400).json({ error: 'Text required' });

        const [r] = await db.execute(
            'INSERT INTO comments (news_id, user_id, text) VALUES (?, ?, ?)',
            [nid, req.user.id, text.trim()]
        );
        const [[c]] = await db.execute(`
            SELECT c.*, u.name as user_name, u.profile_image as user_avatar
            FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?`, [r.insertId]);
        res.status(201).json(c);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/news/:id/comments
app.get('/api/news/:id/comments', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT c.*, u.name as user_name, u.profile_image as user_avatar
            FROM comments c JOIN users u ON c.user_id = u.id
            WHERE c.news_id = ? ORDER BY c.created_at DESC`, [req.params.id]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ============================================================
// STATS
// ============================================================

// GET /api/stats (public)
app.get('/api/stats', async (req, res) => {
    try {
        const [[u]] = await db.execute('SELECT COUNT(*) as count FROM users');
        const [[n]] = await db.execute('SELECT COUNT(*) as count FROM news');
        const [[c]] = await db.execute('SELECT COUNT(*) as count FROM comments');
        res.json({ users: u.count, news: n.count, comments: c.count });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ============================================================
// START
// ============================================================
app.listen(PORT, () => {
    console.log(`🚀 Filledears API running on http://localhost:${PORT}`);
    console.log(`📁 Frontend served from /public`);
});
