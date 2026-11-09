import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app.js';

test('CRUD, validation, malformed input and database persistence', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'notes-api-'));
  const path = join(dir, 'test.sqlite');
  let api = createApp(path);
  let server = api.app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  let base = `http://127.0.0.1:${server.address().port}`;
  async function request(method, route, body, raw = false) {
    const res = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json' },
      ...(body !== undefined ? { body: raw ? body : JSON.stringify(body) } : {}) });
    return { status: res.status, body: await res.json() };
  }
  async function check(name, fn) { await t.test(name, fn); }
  let id;
  try {
    await check('Frontend and assets are served', async () => {
      const home = await fetch(base + '/'); assert.equal(home.status, 200); assert.match(await home.text(), /Rose Notes/);
      for (const file of ['/style.css', '/app.js']) { const r = await fetch(base + file); assert.equal(r.status, 200); assert.ok((await r.text()).length > 100); }
    });
    await check('GET empty list returns 200', async () => assert.deepEqual(await request('GET', '/notes'), { status: 200, body: [] }));
    await check('POST creates a note with 201', async () => {
      const r = await request('POST', '/notes', { title: 'Study', content: 'Review REST APIs' });
      assert.equal(r.status, 201); id = r.body.id; assert.equal(r.body.title, 'Study'); assert.ok(r.body.createdAt);
    });
    await check('GET list contains saved note', async () => { const r = await request('GET', '/notes'); assert.equal(r.status, 200); assert.equal(r.body.length, 1); });
    await check('GET one returns 200', async () => { const r = await request('GET', `/notes/${id}`); assert.equal(r.status, 200); assert.equal(r.body.content, 'Review REST APIs'); });
    await check('PUT replaces editable fields', async () => { const r = await request('PUT', `/notes/${id}`, { title: 'Updated', content: 'Finished' }); assert.equal(r.status, 200); assert.equal(r.body.title, 'Updated'); });
    await check('POST invalid title returns 400', async () => assert.equal((await request('POST', '/notes', { title: ' ', content: 'x' })).status, 400));
    await check('PUT missing content returns 400', async () => assert.equal((await request('PUT', `/notes/${id}`, { title: 'x' })).status, 400));
    await check('Malformed JSON returns 400', async () => assert.equal((await request('POST', '/notes', '{', true)).status, 400));
    await check('Invalid ID returns 400', async () => assert.equal((await request('GET', '/notes/abc')).status, 400));
    await check('Unknown route returns 404', async () => assert.equal((await request('GET', '/unknown')).status, 404));
    await check('Missing GET and PUT return 404', async () => {
      assert.equal((await request('GET', '/notes/999999')).status, 404);
      assert.equal((await request('PUT', '/notes/999999', { title: 'x', content: 'y' })).status, 404);
    });
    await check('SQLite retains data after closing and reopening database', async () => {
      await new Promise(resolve => server.close(resolve)); api.close();
      api = createApp(path); server = api.app.listen(0, '127.0.0.1');
      await new Promise(resolve => server.once('listening', resolve));
      base = `http://127.0.0.1:${server.address().port}`;
      assert.equal((await request('GET', `/notes/${id}`)).body.title, 'Updated');
    });
    await check('DELETE returns 200 and removes note', async () => { assert.equal((await request('DELETE', `/notes/${id}`)).status, 200); assert.equal((await request('GET', `/notes/${id}`)).status, 404); });
    await check('Repeated DELETE returns 404', async () => assert.equal((await request('DELETE', `/notes/${id}`)).status, 404));
  } finally { await new Promise(resolve => server.close(resolve)); api.close(); rmSync(dir, { recursive: true, force: true }); }
});
