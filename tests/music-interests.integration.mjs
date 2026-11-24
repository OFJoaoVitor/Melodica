 




import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = mkdtempSync(path.join(os.tmpdir(), 'melodica-interests-'));
mkdirSync(path.join(temp, 'backend'));
for (const file of ['db.mjs', 'server.mjs', 'music-personalization.mjs']) {
  cpSync(path.join(root, 'backend', file), path.join(temp, 'backend', file));
}
const netServer = net.createServer();
const port = await new Promise((resolve, reject) => {
  netServer.once('error', reject);
  netServer.listen(0, '127.0.0.1', () => {
    const available = netServer.address().port;
    netServer.close(() => resolve(available));
  });
});
const base = `http://127.0.0.1:${port}/api`;
let backend;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function startBackend() {
  backend = spawn(process.execPath, ['backend/server.mjs'], {
    cwd: temp, env: { ...process.env, MELODICA_API_PORT: String(port) }, stdio: 'ignore',
  });
  for (let attempt = 0; attempt < 120; attempt++) {
    if (backend.exitCode !== null) throw new Error('Servidor de testes encerrou inesperadamente.');
    try {
      const response = await fetch(`${base}/health`);
      if (response.ok) return;
    } catch {  }
    await delay(60);
  }
  throw new Error('Servidor não iniciou.');
}
async function stopBackend() {
  if (!backend || backend.exitCode !== null) return;
  const child = backend;
  await new Promise(resolve => {
    child.once('exit', resolve);
    child.kill();
    setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); }, 1000).unref();
  });
}
function client() {
  let cookie = '';
  return {
    async call(route, method = 'GET', payload) {
      const response = await fetch(base + route, {
        method,
        headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
        ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
      });
      const updated = response.headers.get('set-cookie');
      if (updated) cookie = updated.split(';')[0];
      return { status: response.status, body: await response.json() };
    },
  };
}
const alice = client(), bob = client(), stranger = client();
const unique = Date.now().toString(36);
const interests = (genres, extra = {}) => ({
  genres, instruments_played: [], instruments_learning: [], artists: [], topics: [], ...extra,
});
try {
  await startBackend();
  assert.equal((await stranger.call('/interests')).status, 401);
  const a = await alice.call('/auth/register', 'POST', { email: `alice${unique}@example.com`, password: 'Pass123456!', options: { data: { username: `alice${unique}`, display_name: 'Alice Musical' } } });
  const b = await bob.call('/auth/register', 'POST', { email: `bob${unique}@example.com`, password: 'Pass123456!', options: { data: { username: `bob${unique}`, display_name: 'Bob Musical' } } });
  assert.equal(a.status, 201);
  assert.equal(b.status, 201);
  const aliceId = a.body.user.id, bobId = b.body.user.id;
  assert.equal((await alice.call('/interests')).body.interests.completed, false);
  assert.deepEqual((await alice.call('/feed/recommendations')).body.posts, []);
  assert.equal((await alice.call('/interests', 'PUT', interests([]))).status, 400);
  assert.equal((await alice.call('/interests', 'PUT', interests(['Metal', 'Inventado']))).status, 400);

  assert.equal((await alice.call('/interests', 'PUT', interests(['Gospel e Worship', 'Jazz', 'Jazz'], { instruments_played: ['Contrabaixo'], artists: ['Kirk Franklin', 'Kirk Franklin'], topics: ['Harmonia'] }))).status, 200);
  assert.deepEqual((await alice.call('/interests')).body.interests.genres, ['Gospel e Worship', 'Jazz']);
  assert.equal((await bob.call('/interests', 'PUT', interests(['Metal'], { instruments_played: ['Guitarra'], artists: ['Metallica'] }))).status, 200);
  assert.equal((await alice.call('/interests', 'PUT', interests(['Gospel e Worship'], { user_id: bobId }))).status, 200);
  assert.deepEqual((await bob.call('/interests')).body.interests.genres, ['Metal']);

  const basePost = { author_id: bobId, title: 'Postagem musical', content: 'Um novo som', post_type: 'TEXT', media_url: null };
  const gospel = await bob.call('/data/posts', 'POST', { ...basePost, title: 'Kirk Franklin Gospel Worship', genres: ['Gospel e Worship'], instruments: ['Contrabaixo'], topics: ['Harmonia'] });
  const metal = await bob.call('/data/posts', 'POST', { ...basePost, title: 'Metallica guitarra metal', genres: ['Metal'], instruments: ['Guitarra'], artists: ['Metallica'] });
  assert.equal(gospel.status, 201);
  assert.equal(metal.status, 201);
  const gospelId = gospel.body.data.id, metalId = metal.body.data.id;
  assert.equal((await alice.call('/feed/recommendations')).body.posts[0].id, gospelId);
  assert.equal((await bob.call('/feed/recommendations')).body.posts[0].id, metalId);
  assert.equal((await alice.call('/interests', 'PUT', interests(['Metal'], { artists: ['Metallica'] }))).status, 200);
  assert.equal((await alice.call('/feed/recommendations')).body.posts[0].id, metalId);
  assert.equal((await alice.call('/data/comments', 'POST', { post_id: gospelId, author_id: aliceId, content: 'Gostei!' })).status, 201);
  assert.equal((await alice.call('/data/post_votes', 'POST', { post_id: gospelId, user_id: aliceId })).status, 201);
  assert.equal((await alice.call('/messages', 'POST', { recipient_id: bobId, post_id: gospelId, content: 'Confira!' })).status, 201);
  await stopBackend();
  await startBackend();
  assert.deepEqual((await alice.call('/interests')).body.interests.genres, ['Metal']);
  assert.equal((await alice.call('/feed/recommendations')).body.posts[0].id, metalId);
  assert.equal((await alice.call('/auth/logout', 'POST', {})).status, 200);
  assert.equal((await alice.call('/interests')).status, 401);
  const logged = await alice.call('/auth/login', 'POST', { email: `alice${unique}@example.com`, password: 'Pass123456!' });
  assert.equal(logged.status, 200);
  assert.deepEqual((await alice.call('/interests')).body.interests.genres, ['Metal']);
  assert.ok(existsSync(path.join(temp, 'backend', 'data', 'melodica.sqlite')));
  console.log('PASS: cadastro, sessão, logout, login, validação, contas independentes, comentários, curtidas, compartilhamentos, ranking, edição e persistência.');
} finally {
  await stopBackend();
  rmSync(temp, { recursive: true, force: true });
}
