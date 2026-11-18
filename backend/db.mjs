import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const here = path.dirname(fileURLToPath(import.meta.url));
const storage = path.join(here, 'data');
mkdirSync(storage, { recursive: true });
export const databasePath = path.join(storage, 'melodica.sqlite');
export const db = new DatabaseSync(databasePath);
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS profiles (
 id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 username TEXT NOT NULL UNIQUE COLLATE NOCASE,
 display_name TEXT NOT NULL, bio TEXT DEFAULT '', avatar_url TEXT,
 banner_url TEXT, location TEXT DEFAULT '', website_url TEXT,
 account_type TEXT NOT NULL DEFAULT 'MUSICIAN', primary_instrument TEXT,
 experience_level TEXT NOT NULL DEFAULT 'BEGINNER', genres TEXT DEFAULT '[]',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS communities (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
 description TEXT NOT NULL DEFAULT '', category TEXT, accent TEXT,
 avatar_url TEXT, banner_url TEXT, creator_id TEXT REFERENCES users(id),
 member_count INTEGER NOT NULL DEFAULT 0, is_seed INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS community_members (
 id TEXT PRIMARY KEY, community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 role TEXT NOT NULL DEFAULT 'MEMBER', joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE (community_id,user_id)
);
CREATE TABLE IF NOT EXISTS posts (
 id TEXT PRIMARY KEY, author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 community_id TEXT REFERENCES communities(id) ON DELETE SET NULL,
 title TEXT NOT NULL, content TEXT, post_type TEXT DEFAULT 'TEXT', media_url TEXT,
 tags TEXT DEFAULT '[]', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS post_votes (
 id TEXT PRIMARY KEY, post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(post_id,user_id)
);
CREATE TABLE IF NOT EXISTS saved_posts (
 id TEXT PRIMARY KEY, post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(post_id,user_id)
);
CREATE TABLE IF NOT EXISTS comments (
 id TEXT PRIMARY KEY, post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
 author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 parent_comment_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
 content TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS messages (
 id TEXT PRIMARY KEY,
 sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 post_id TEXT REFERENCES posts(id) ON DELETE SET NULL,
 content TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(sender_id <> recipient_id)
);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post_id,created_at);
CREATE TABLE IF NOT EXISTS follows (
 id TEXT PRIMARY KEY, follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(follower_id,following_id), CHECK(follower_id <> following_id)
);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_members_user ON community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_follows_user ON follows(follower_id);
`);
// Migração segura para instalações antigas: mantém postagens, usuários e mídias.
const postColumns = new Set(db.prepare('PRAGMA table_info(posts)').all().map(col=>col.name));
for (const key of ['genres','instruments','artists','topics']) {
  if (!postColumns.has(key)) db.exec(`ALTER TABLE posts ADD COLUMN ${key} TEXT NOT NULL DEFAULT '[]'`);
}
db.exec(`
CREATE TABLE IF NOT EXISTS user_music_interests (
 user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 genres TEXT NOT NULL DEFAULT '[]',
 instruments_played TEXT NOT NULL DEFAULT '[]',
 instruments_learning TEXT NOT NULL DEFAULT '[]',
 artists TEXT NOT NULL DEFAULT '[]',
 topics TEXT NOT NULL DEFAULT '[]',
 completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0,1)),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_interests_completed ON user_music_interests(completed);
`);
// Notificações persistentes e menções. Migração incremental, sem apagar dados existentes.
const messageColumns = new Set(db.prepare('PRAGMA table_info(messages)').all().map(col=>col.name));
if (!messageColumns.has('read_at')) db.exec('ALTER TABLE messages ADD COLUMN read_at TEXT');
db.exec(`
CREATE TABLE IF NOT EXISTS comment_mentions (
 comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 PRIMARY KEY (comment_id,user_id)
);
CREATE TABLE IF NOT EXISTS notifications (
 id TEXT PRIMARY KEY,
 recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('MESSAGE','MENTION')),
 message_id TEXT REFERENCES messages(id) ON DELETE CASCADE,
 comment_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
 post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 read_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(recipient_id,read_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(recipient_id,read_at);
`);
const seeds = [
 ['Rock','rock','Riffs, bandas e tudo que faz barulho do jeito certo.','Gênero','#2563eb'],
 ['Guitarra','guitarra','Técnica, pedais, tons e solos.','Instrumento','#1d4ed8'],
 ['Violão','violao','Dedilhados, MPB, bossa e composição acústica.','Instrumento','#0ea5e9'],
 ['Canto','canto','Técnica vocal, aquecimento e interpretação.','Instrumento','#3b82f6'],
 ['Metal','metal','Bandas, gravações e afinações.','Gênero','#1e3a8a'],
 ['Jazz','jazz','Harmonia, improviso e jam sessions.','Gênero','#38bdf8'],
 ['Produção Musical','producao-musical','Mixagem, masterização, DAWs e home studio.','Produção','#2563eb'],
 ['Música Clássica','musica-classica','Repertório, orquestras e partituras.','Gênero','#60a5fa'],
 ['Gospel','gospel','Worship, louvor, corinhos e música cristã.','Gênero','#1d4ed8'],
 ['Contrabaixo','contrabaixo','Groove, técnica, timbres e linhas de baixo.','Instrumento','#0ea5e9'],
];
const insertCommunity = db.prepare('INSERT OR IGNORE INTO communities (id,name,slug,description,category,accent,is_seed) VALUES (?,?,?,?,?,?,1)');
for(const [name,slug,description,category,accent] of seeds){
  insertCommunity.run(randomUUID(),name,slug,description,category,accent);
}
