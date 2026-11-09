import express from 'express';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function createApp(databasePath) {
  if (databasePath !== ':memory:') mkdirSync(dirname(resolve(databasePath)), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec(`CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`);
  const app = express();
  app.disable('x-powered-by');
  app.use(express.static(fileURLToPath(new URL('../public/', import.meta.url))));
  app.use(express.json({ limit: '100kb' }));
  app.param('id', (req, res, next, id) => {
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
      return res.status(400).json({ error: 'ID must be a positive safe integer.' });
    }
    req.noteId = Number(id);
    next();
  });
  function validate(req, res, next) {
    const b = req.body;
    if (!b || typeof b !== 'object' || Array.isArray(b))
      return res.status(400).json({ error: 'Provide a JSON object with title and content.' });
    const errors = [];
    for (const [key, max] of [['title', 120], ['content', 10000]]) {
      if (typeof b[key] !== 'string' || !b[key].trim() || b[key].trim().length > max)
        errors.push(`${key} must be a non-empty string of at most ${max} characters.`);
    }
    if (Object.keys(b).some(key => !['title', 'content'].includes(key)))
      errors.push('Only title and content are allowed.');
    if (errors.length) return res.status(400).json({ error: 'Validation failed.', details: errors });
    req.note = { title: b.title.trim(), content: b.content.trim() };
    next();
  }
  const find = id => db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
  app.get('/notes', (req, res) => res.json(db.prepare('SELECT * FROM notes ORDER BY id').all()));
  app.get('/notes/:id', (req, res) => {
    const note = find(req.noteId);
    return note ? res.json(note) : res.status(404).json({ error: 'Note not found.' });
  });
  app.post('/notes', validate, (req, res) => {
    const now = new Date().toISOString();
    const result = db.prepare('INSERT INTO notes (title, content, createdAt, updatedAt) VALUES (?, ?, ?, ?)')
      .run(req.note.title, req.note.content, now, now);
    const note = find(Number(result.lastInsertRowid));
    res.location(`/notes/${note.id}`).status(201).json(note);
  });
  app.put('/notes/:id', validate, (req, res) => {
    if (!find(req.noteId)) return res.status(404).json({ error: 'Note not found.' });
    db.prepare('UPDATE notes SET title = ?, content = ?, updatedAt = ? WHERE id = ?')
      .run(req.note.title, req.note.content, new Date().toISOString(), req.noteId);
    res.json(find(req.noteId));
  });
  app.delete('/notes/:id', (req, res) => {
    const result = db.prepare('DELETE FROM notes WHERE id = ?').run(req.noteId);
    if (!result.changes) return res.status(404).json({ error: 'Note not found.' });
    res.json({ message: 'Note deleted.' });
  });
  app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON body.' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'JSON body exceeds 100kb.' });
    console.error('Request failed:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  });
  return { app, close: () => db.close() };
}
