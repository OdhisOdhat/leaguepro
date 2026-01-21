
import express from 'express';
import cors from 'cors';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

let db: any;

async function setupDb() {
  db = await open({
    filename: path.join(__dirname, '../../data/league.db'),
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT,
      teamId TEXT
    );
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      data TEXT
    );
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      data TEXT
    );
  `);

  // Seed default admin if not exists
  const admin = await db.get('SELECT * FROM users WHERE role = ?', ['ADMIN']);
  if (!admin) {
    await db.run(
      'INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)',
      ['u-admin', 'admin', 'admin123', 'ADMIN']
    );
  }
  console.log('Database initialized with Auth support');
}

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  const { username, password, role, teamId } = req.body;
  try {
    const id = `u-${Date.now()}`;
    await db.run(
      'INSERT INTO users (id, username, password, role, teamId) VALUES (?, ?, ?, ?, ?)',
      [id, username, password, role, teamId]
    );
    res.status(201).json({ id, username, role, teamId });
  } catch (e) {
    res.status(400).json({ error: 'Username already exists' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
  if (user) {
    res.json({ id: user.id, username: user.username, role: user.role, teamId: user.teamId });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Resources Routes
app.get('/api/teams', async (req, res) => {
  const teams = await db.all('SELECT data FROM teams');
  res.json(teams.map((t: any) => JSON.parse(t.data)));
});

app.post('/api/teams', async (req, res) => {
  const team = req.body;
  await db.run('INSERT OR REPLACE INTO teams (id, data) VALUES (?, ?)', [team.id, JSON.stringify(team)]);
  res.status(201).json(team);
});

app.get('/api/matches', async (req, res) => {
  const matches = await db.all('SELECT data FROM matches');
  res.json(matches.map((m: any) => JSON.parse(m.data)));
});

app.post('/api/matches', async (req, res) => {
  const match = req.body;
  await db.run('INSERT OR REPLACE INTO matches (id, data) VALUES (?, ?)', [match.id, JSON.stringify(match)]);
  res.status(201).json(match);
});

app.put('/api/matches/:id', async (req, res) => {
  const match = req.body;
  await db.run('UPDATE matches SET data = ? WHERE id = ?', [JSON.stringify(match), req.params.id]);
  res.json(match);
});

setupDb().then(() => {
  app.listen(port, () => {
    console.log(`Backend running with Auth at http://localhost:${port}`);
  });
});
