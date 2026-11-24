import http from 'node:http';
import { randomBytes, randomUUID, createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import { createReadStream, mkdirSync, existsSync } from 'node:fs';
import { stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, databasePath } from './db.mjs';
import { readInterests, validateInterests, validatePostCategories, personalizedFeed } from './music-personalization.mjs';

const HOST = '127.0.0.1';
const PORT = Number(process.env.MELODICA_API_PORT || '8787');
const SESSION_AGE_SECONDS = 60 * 60 * 24 * 14;
const MB = 1024 * 1024;
 
const mediaTypes = {
  'image/jpeg': {extension:'jpg', max:5*MB, signature:b=>b.length>=4 && b[0]===0xff && b[1]===0xd8 && b[2]===0xff},
  'image/png': {extension:'png', max:5*MB, signature:b=>b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))},
  'image/webp': {extension:'webp', max:5*MB, signature:b=>b.length>=12 && b.toString('ascii',0,4)==='RIFF' && b.toString('ascii',8,12)==='WEBP'},
  'image/gif': {extension:'gif', max:5*MB, signature:b=>b.length>=6 && ['GIF87a','GIF89a'].includes(b.toString('ascii',0,6))},
  'video/mp4': {extension:'mp4', max:50*MB, signature:b=>b.length>=12 && b.toString('ascii',4,8)==='ftyp'},
  'video/webm': {extension:'webm', max:50*MB, signature:b=>b.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])) && b.subarray(0,4096).includes(Buffer.from('webm'))},
  'audio/webm': {extension:'weba', max:20*MB, signature:b=>b.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])) && b.subarray(0,4096).includes(Buffer.from('webm'))},
  'audio/mpeg': {extension:'mp3', max:20*MB, signature:b=>b.length>=4 && (b.toString('ascii',0,3)==='ID3' || (b[0]===0xff && (b[1]&0xe0)===0xe0 && (b[1]&0x06)!==0))},
  'audio/wav': {extension:'wav', max:20*MB, signature:b=>b.length>=12 && b.toString('ascii',0,4)==='RIFF' && b.toString('ascii',8,12)==='WAVE'},
  'audio/x-wav': {extension:'wav', max:20*MB, signature:b=>b.length>=12 && b.toString('ascii',0,4)==='RIFF' && b.toString('ascii',8,12)==='WAVE'},
  'audio/ogg': {extension:'ogg', max:20*MB, signature:b=>b.toString('ascii',0,4)==='OggS' && ['OpusHead','vorbis'].some(codec=>b.subarray(0,4096).includes(Buffer.from(codec)))},
  'video/ogg': {extension:'ogv', max:50*MB, signature:b=>b.toString('ascii',0,4)==='OggS' && b.subarray(0,4096).includes(Buffer.from('theora'))},
};
const mimeByExtension = {jpg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',mp4:'video/mp4',webm:'video/webm',weba:'audio/webm',mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg',ogv:'video/ogg'};
const uploadsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data', 'uploads');
mkdirSync(uploadsDir, {recursive:true});
async function readUploadBody(req, max) {
  const size = Number(req.headers['content-length']);
  if (Number.isFinite(size) && size>max) throw httpError(`O arquivo excede o limite de ${max/MB} MB.`,413);
  const chunks=[];
  let total=0;
  for await (const chunk of req) {
    total+=chunk.length;
    if (total>max) throw httpError(`O arquivo excede o limite de ${max/MB} MB.`,413);
    chunks.push(chunk);
  }
  if (!total) throw httpError('O arquivo está vazio.');
  return Buffer.concat(chunks,total);
}

const allowedTables = new Set(['profiles','communities','community_members','posts','post_votes','comments','saved_posts','follows']);
const columns = {
  profiles: ['display_name','bio','location','primary_instrument','account_type','experience_level','avatar_url','banner_url','website_url'],
  communities: ['name','slug','description','category','accent','avatar_url','banner_url'],
  community_members: ['community_id','user_id'], posts: ['author_id','community_id','title','content','post_type','media_url','tags','genres','instruments','artists','topics'],
  post_votes: ['post_id','user_id'], comments: ['post_id','author_id','content','parent_comment_id'],
  saved_posts: ['post_id','user_id'], follows: ['follower_id','following_id']
};
const writeIdentity = {
  profiles: 'id', communities: 'creator_id', community_members: 'user_id', posts: 'author_id',
  post_votes: 'user_id', comments: 'author_id', saved_posts: 'user_id', follows: 'follower_id'
};
const loginAttempts = new Map();
const now = () => new Date().toISOString();
const hash = x => createHash('sha256').update(x).digest('hex');
const passwordHash = password => {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
};
const checkPassword = (password, stored) => {
  if (!stored?.includes(':')) return false;
  const [salt, derived] = stored.split(':');
  const expected = Buffer.from(derived, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
};
const respond = (res, code, data) => {
  res.writeHead(code, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' });
  res.end(JSON.stringify(data));
};
const httpError = (message, status=400) => Object.assign(new Error(message), {status});
const safeJsonArray = value => {try {return JSON.parse(value);}catch {throw httpError('Classificação musical inválida.');}};
const userFromCookie = req => {
  const token = /(?:^|;\s*)melodica_session=([^;]+)/.exec(req.headers.cookie || '')?.[1];
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const row = db.prepare(`SELECT u.id,u.email,s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.expires_at>?`).get(hash(token), Math.floor(Date.now()/1000));
  return row ? { id:row.id, email:row.email } : null;
};
const setSession = (res, id) => {
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (?,?,?)').run(hash(token), id, Math.floor(Date.now()/1000)+SESSION_AGE_SECONDS);
  res.setHeader('Set-Cookie',`melodica_session=${token}; Path=/api; Max-Age=${SESSION_AGE_SECONDS}; HttpOnly; SameSite=Lax`);
};
const clearSession = (req, res) => {
  const token = /(?:^|;\s*)melodica_session=([^;]+)/.exec(req.headers.cookie || '')?.[1];
  if(token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token));
  res.setHeader('Set-Cookie','melodica_session=; Path=/api; Max-Age=0; HttpOnly; SameSite=Lax');
};
const publicUser = u => u ? { id:u.id, email:u.email } : null;
const all = table => db.prepare(`SELECT * FROM ${table}`).all();
const projection = (record, fields) => {
  if(fields === '*' || !fields) return record;
   
  const names = fields.split(',').map(v=>v.trim()).filter(v=>/^[a-z_]+$/.test(v));
  if(!names.length) return record;
  return Object.fromEntries(names.map(k=>[k,record[k] ?? null]));
};
const enrich = (table, record) => {
  if(table === 'posts') {
    const author = db.prepare('SELECT username,display_name,account_type,avatar_url FROM profiles WHERE id=?').get(record.author_id) || null;
    const community = record.community_id ? db.prepare('SELECT name,slug FROM communities WHERE id=?').get(record.community_id) || null : null;
    const votes = db.prepare('SELECT user_id FROM post_votes WHERE post_id=?').all(record.id);
    const count = db.prepare('SELECT count(*) AS count FROM comments WHERE post_id=?').get(record.id).count;
    const saved = db.prepare('SELECT user_id FROM saved_posts WHERE post_id=?').all(record.id);
    return {...record,author,community,post_votes:votes,comments:[{count}],saved_posts:saved};
  }
  if(table === 'comments') return {
    ...record,
    author:db.prepare('SELECT username,display_name,avatar_url FROM profiles WHERE id=?').get(record.author_id) || null,
    mentions:db.prepare(`SELECT pr.id,pr.username FROM comment_mentions cm
      JOIN profiles pr ON pr.id=cm.user_id WHERE cm.comment_id=?`).all(record.id),
  };
  if(table === 'communities') return {...record,community_members:db.prepare('SELECT user_id FROM community_members WHERE community_id=?').all(record.id)};
  return record;
};
const jsonBody = async req => {
  let data='';
  for await(const part of req){
    data+=part.toString();
    if(data.length>32_000) throw httpError('Solicitação muito grande.',413);
  }
  try {return data ? JSON.parse(data) : {}}catch {throw httpError('JSON inválido.');}
};
const validateUser = body => {
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const profile = body.options?.data || body.metadata || {};
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254) throw httpError('Informe um e-mail válido.');
  if(password.length<8 || password.length>128) throw httpError('A senha deve ter de 8 a 128 caracteres.');
  const username = String(profile.username || email.split('@')[0]).trim().toLowerCase();
  if(!/^[a-z0-9_]{3,24}$/.test(username)) throw httpError('O nome de usuário deve ter de 3 a 24 caracteres (letras, números e _).');
  const displayName = String(profile.display_name || username).trim().slice(0,60);
  if(displayName.length < 2) throw httpError('Informe seu nome.');
  return {email,password,username,displayName,profile};
};
const preventBruteForce = key => {
  const previous = loginAttempts.get(key) || {n:0,start:Date.now()};
  const current = Date.now()-previous.start>15*60_000 ? {n:0,start:Date.now()} : previous;
  if(current.n>=15) throw httpError('Muitas tentativas. Tente novamente em 15 minutos.',429);
  current.n++;
  loginAttempts.set(key,current);
  if(loginAttempts.size>2000) loginAttempts.clear();
};
const validValue = (table, payload) => {
  if(!payload || typeof payload !== 'object' || Array.isArray(payload)) throw httpError('Dados inválidos.');
  const out={};
  for(const [key,value] of Object.entries(payload)) {
    if(columns[table].includes(key)) {
      if(typeof value === 'string' && value.length>12_000) throw httpError('Texto excede o limite.');
      if(value!==null && typeof value!=='string' && typeof value!=='number' && !Array.isArray(value)) throw httpError('Campo inválido.');
      out[key] = Array.isArray(value) ? JSON.stringify(value) : value;
    }
  }
  return out;
};
 
const validateCommunity = (payload, creating=false) => {
  if (creating || 'name' in payload) {
    if (typeof payload.name !== 'string' || payload.name.trim().length < 3 || payload.name.trim().length > 60)
      throw httpError('O nome da comunidade deve ter de 3 a 60 caracteres.');
    payload.name = payload.name.trim();
  }
  if (creating || 'slug' in payload) {
    if (typeof payload.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.slug) || payload.slug.length < 3 || payload.slug.length > 48)
      throw httpError('O identificador deve ter entre 3 e 48 caracteres: letras minúsculas, números e hífens.');
  }
  if ('description' in payload) {
    if (typeof payload.description !== 'string' || payload.description.trim().length > 500)
      throw httpError('A descrição deve ter no máximo 500 caracteres.');
    payload.description = payload.description.trim();
  }
  if ('category' in payload && (payload.category !== null && (typeof payload.category !== 'string' || payload.category.length > 40)))
    throw httpError('Categoria inválida.');
  if ('accent' in payload && payload.accent !== null && (typeof payload.accent !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(payload.accent)))
    throw httpError('Escolha uma cor válida.');
  for (const field of ['avatar_url','banner_url']) {
    if (!(field in payload) || payload[field] === null) continue;
    if (typeof payload[field] !== 'string') throw httpError('Imagem inválida.');
    let uri;
    try { uri=new URL(payload[field]); } catch { throw httpError('Envie uma imagem pelo Melodica.'); }
    const file=/^\/api\/uploads\/([0-9a-f-]{36}\.(?:jpg|png|webp|gif))$/.exec(uri.pathname)?.[1];
    if (uri.protocol !== 'http:' || !['127.0.0.1','localhost'].includes(uri.hostname) || uri.port !== String(PORT) || !file || !existsSync(path.join(uploadsDir,file)))
      throw httpError('Selecione uma imagem enviada ao Melodica.');
  }
  return payload;
};
const sqlInsert = (table, data) => {
  const keys=Object.keys(data);
  db.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>data[k]));
};
const parseFilters = filters => Array.isArray(filters) && filters.length<=12 && filters.every(f=>f && /^[a-z_]+$/.test(f.column) && ['eq','neq','in'].includes(f.operator));
const matching = (row,filters) => filters.every(f=>{
  if(!(f.column in row)) return false;
  if(f.operator==='eq') return row[f.column] === f.value;
  if(f.operator==='neq') return row[f.column] !== f.value;
  return Array.isArray(f.value) && f.value.includes(row[f.column]);
});

const server = http.createServer(async(req,res)=>{
  try {
    const origin = req.headers.origin;
     
    if(origin) {
      const allowed = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if(!allowed) throw httpError('Origem não autorizada.',403);
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary','Origin');
      res.setHeader('Access-Control-Allow-Credentials','true');
      res.setHeader('Access-Control-Allow-Headers','content-type');
      res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE,OPTIONS');
    }
    if(req.method==='OPTIONS') {res.writeHead(204);res.end();return;}
    const url = new URL(req.url || '/',`http://${HOST}:${PORT}`);
    if(req.method==='GET' && url.pathname==='/api/health') {respond(res,200,{ok:true,engine:'SQLite local'});return;}
    if(!url.pathname.startsWith('/api/')) throw httpError('Rota não encontrada.',404);
     
    const mediaMatch = /^\/api\/uploads\/([0-9a-f-]{36}\.(?:jpg|png|webp|gif|mp4|webm|weba|mp3|wav|ogg|ogv))$/.exec(url.pathname);
    if ((req.method==='GET' || req.method==='HEAD') && mediaMatch) {
      const filename=mediaMatch[1];
      const extension=filename.split('.').pop();
      const filepath=path.join(uploadsDir,filename);
      let fileInfo;
      try {fileInfo=await stat(filepath);} catch (error) {
        if(error.code==='ENOENT') throw httpError('Arquivo não encontrado.',404);
        throw error;
      }
      const headers={'Content-Type':mimeByExtension[extension], 'X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes','Cache-Control':'public, max-age=31536000, immutable'};
      let start=0,end=fileInfo.size-1,status=200;
      if (req.headers.range) {
        const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if(!range || (!range[1] && !range[2])) {
          res.writeHead(416,{...headers,'Content-Range':`bytes */${fileInfo.size}`});res.end();return;
        }
        if(!range[1]) {const suffix=Number(range[2]);start=Math.max(0,fileInfo.size-suffix);}
        else {start=Number(range[1]);if(range[2])end=Math.min(end,Number(range[2]));}
        if(start>=fileInfo.size || end<start) {
          res.writeHead(416,{...headers,'Content-Range':`bytes */${fileInfo.size}`});res.end();return;
        }
        status=206;
        headers['Content-Range']=`bytes ${start}-${end}/${fileInfo.size}`;
      }
      headers['Content-Length']=String(end-start+1);
      res.writeHead(status,headers);
      if(req.method==='HEAD') res.end();
      else createReadStream(filepath,{start,end}).on('error',()=>res.destroy()).pipe(res);
      return;
    }
    if(req.method==='POST' && url.pathname==='/api/uploads') {
      const user=userFromCookie(req);
      if(!user) throw httpError('Entre em sua conta para enviar arquivos.',401);
      const type=String(req.headers['content-type']||'').split(';')[0].toLowerCase();
      const config=mediaTypes[type];
      if(!config) throw httpError('Formato não permitido. Use JPG, PNG, WebP, GIF, MP4, WebM, MP3, WAV ou OGG.',415);
      const buffer=await readUploadBody(req,config.max);
      if(!config.signature(buffer)) throw httpError('O conteúdo do arquivo não corresponde ao formato informado.',415);
      const filename=`${randomUUID()}.${config.extension}`;
      await writeFile(path.join(uploadsDir,filename),buffer,{flag:'wx'});
      respond(res,201,{path:`/api/uploads/${filename}`});
      return;
    }
    if(req.method !== 'GET' && origin && !req.headers['content-type']?.startsWith('application/json')) throw httpError('Tipo de requisição inválido.',415);
    const user = userFromCookie(req);
    if(req.method==='GET' && url.pathname==='/api/auth/me') {respond(res,200,{user:publicUser(user)});return;}
    if(req.method==='POST' && url.pathname==='/api/auth/register') {
      preventBruteForce(`register:${req.socket.remoteAddress}`);
      const input = validateUser(await jsonBody(req));
      if(db.prepare('SELECT id FROM users WHERE email=?').get(input.email)) throw httpError('Já existe uma conta com esse email.',409);
      if(db.prepare('SELECT id FROM profiles WHERE username=?').get(input.username)) throw httpError('Esse nome de usuário já está em uso.',409);
      const id = randomUUID();
      db.exec('BEGIN');
      try {
        db.prepare('INSERT INTO users(id,email,password_hash) VALUES (?,?,?)').run(id,input.email,passwordHash(input.password));
        db.prepare('INSERT INTO profiles(id,username,display_name,account_type,experience_level,primary_instrument,genres) VALUES (?,?,?,?,?,?,?)')
          .run(id,input.username,input.displayName,String(input.profile.account_type || 'MUSICIAN'),String(input.profile.experience_level || 'BEGINNER'),String(input.profile.primary_instrument || ''),JSON.stringify(input.profile.favorite_genre ? [input.profile.favorite_genre] : []));
        db.exec('COMMIT');
      } catch(err){db.exec('ROLLBACK');throw err;}
      setSession(res,id);respond(res,201,{user:{id,email:input.email}});return;
    }
    if(req.method==='POST' && url.pathname==='/api/auth/login') {
      preventBruteForce(`login:${req.socket.remoteAddress}`);
      const body=await jsonBody(req);
      const email=String(body.email || '').trim().toLowerCase();
      const password=String(body.password || '');
      const account=db.prepare('SELECT id,email,password_hash FROM users WHERE email=?').get(email);
       
      if(!account || !checkPassword(password, account.password_hash)) throw httpError('Email ou senha incorretos.',401);
      setSession(res,account.id);respond(res,200,{user:{id:account.id,email:account.email}});return;
    }
    if(req.method==='POST' && url.pathname==='/api/auth/logout') {
      clearSession(req,res);respond(res,200,{ok:true});return;
    }
    if(req.method==='POST' && url.pathname==='/api/auth/change-password') {
      if(!user) throw httpError('Você precisa estar conectado para mudar a senha.',401);
      const {password} = await jsonBody(req);
      if(typeof password !== 'string' || password.length<8 || password.length>128) throw httpError('Use uma senha de 8 a 128 caracteres.');
      db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(passwordHash(password), user.id);
      db.prepare('DELETE FROM sessions WHERE user_id=? AND token_hash NOT IN (SELECT token_hash FROM sessions WHERE user_id=? ORDER BY expires_at DESC LIMIT 1)').run(user.id,user.id);
      respond(res,200,{user});return;
    }
     
    if(url.pathname==='/api/interests') {
      if(!user) throw httpError('Entre em sua conta para personalizar a Melodica.',401);
      if(req.method==='GET') {respond(res,200,{interests:readInterests(db,user.id)});return;}
      if(req.method==='PUT') {
        const payload=validateInterests(await jsonBody(req));
        db.prepare(`INSERT INTO user_music_interests(user_id,genres,instruments_played,instruments_learning,artists,topics,completed,updated_at)
          VALUES (?,?,?,?,?,?,1,?) ON CONFLICT(user_id) DO UPDATE SET
          genres=excluded.genres,instruments_played=excluded.instruments_played,
          instruments_learning=excluded.instruments_learning,artists=excluded.artists,topics=excluded.topics,
          completed=1,updated_at=excluded.updated_at`).run(user.id,...['genres','instruments_played','instruments_learning','artists','topics'].map(k=>JSON.stringify(payload[k])),now());
        respond(res,200,{interests:readInterests(db,user.id)});return;
      }
      throw httpError('Método não permitido.',405);
    }
    if(req.method==='GET' && url.pathname==='/api/feed/recommendations') {
      if(!user) throw httpError('Entre em sua conta para acessar o feed.',401);
      const sort=url.searchParams.get('sort')==='popular'?'popular':'recent';
      const limit=Math.min(50,Math.max(1,Number(url.searchParams.get('limit'))||30));
      const posts=personalizedFeed(db,user.id,sort,limit).map(post=>enrich('posts',post));
      respond(res,200,{posts});return;
    }
     
    if(req.method==='GET' && url.pathname==='/api/search') {
      if(!user) throw httpError('Entre em sua conta para pesquisar.',401);
      const term=String(url.searchParams.get('q')||'').trim().slice(0,100);
      if(term.length<2) {respond(res,200,{users:[],posts:[]});return;}
      const like=`%${term.replace(/[\\%_]/g, x=>'\\'+x)}%`;
      const users=db.prepare(`SELECT id,username,display_name,avatar_url FROM profiles WHERE username LIKE ? ESCAPE '\\' OR display_name LIKE ? ESCAPE '\\' ORDER BY display_name LIMIT 12`).all(like,like);
      const posts=db.prepare(`SELECT p.id,p.title,p.content,p.created_at,p.author_id,pr.username,pr.display_name
        FROM posts p JOIN profiles pr ON pr.id=p.author_id
        WHERE p.title LIKE ? ESCAPE '\\' OR COALESCE(p.content,'') LIKE ? ESCAPE '\\'
        ORDER BY p.created_at DESC LIMIT 12`).all(like,like);
      respond(res,200,{users,posts});return;
    }
    if(url.pathname==='/api/following' && req.method==='GET') {
      if(!user) throw httpError('Entre em sua conta para ver quem você segue.',401);
       
      const following=db.prepare(`SELECT pr.id,pr.username,pr.display_name,pr.avatar_url,
        pr.account_type,pr.primary_instrument,f.created_at AS followed_at
        FROM follows f JOIN profiles pr ON pr.id=f.following_id
        WHERE f.follower_id=? ORDER BY pr.display_name COLLATE NOCASE ASC,pr.username ASC`).all(user.id);
      respond(res,200,{following});return;
    }
     
    if (url.pathname === '/api/notifications' && req.method === 'GET') {
      if (!user) throw httpError('Entre em sua conta para ver notificações.',401);
      const notifications=db.prepare(`SELECT n.id,n.kind,n.message_id,n.comment_id,n.post_id,n.created_at,n.read_at,
        pr.id AS actor_id,pr.username AS actor_username,pr.display_name AS actor_name,pr.avatar_url AS actor_avatar,
        m.content AS message_preview,c.content AS comment_preview
        FROM notifications n JOIN profiles pr ON pr.id=n.actor_id
        LEFT JOIN messages m ON m.id=n.message_id
        LEFT JOIN comments c ON c.id=n.comment_id
        WHERE n.recipient_id=? ORDER BY n.created_at DESC,n.rowid DESC LIMIT 80`).all(user.id);
      const unread=db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE recipient_id=? AND read_at IS NULL').get(user.id).n;
      const unreadMessages=db.prepare('SELECT COUNT(*) AS n FROM messages WHERE recipient_id=? AND read_at IS NULL').get(user.id).n;
      respond(res,200,{notifications,unread,unread_messages:unreadMessages});return;
    }
    if (url.pathname === '/api/notifications/read' && req.method === 'POST') {
      if (!user) throw httpError('Entre em sua conta para acessar notificações.',401);
      const body=await jsonBody(req);
      if(body.all === true) {
        db.prepare('UPDATE notifications SET read_at=CURRENT_TIMESTAMP WHERE recipient_id=? AND read_at IS NULL').run(user.id);
      } else if(typeof body.id==='string' && /^[0-9a-f-]{36}$/i.test(body.id)) {
        db.prepare('UPDATE notifications SET read_at=CURRENT_TIMESTAMP WHERE id=? AND recipient_id=? AND read_at IS NULL').run(body.id,user.id);
      } else throw httpError('Selecione uma notificação válida.');
      respond(res,200,{ok:true});return;
    }
    if(url.pathname==='/api/conversations' && req.method==='GET') {
      if(!user) throw httpError('Entre em sua conta para ver mensagens.',401);
       
      const conversations=db.prepare(`SELECT m.id,m.created_at,m.sender_id,m.recipient_id,m.content,m.post_id,
        pr.id AS other_id,pr.username,pr.display_name,pr.avatar_url,po.title AS post_title,
        (SELECT COUNT(*) FROM messages unread WHERE unread.sender_id=pr.id AND unread.recipient_id=? AND unread.read_at IS NULL) AS unread_count
        FROM messages m JOIN profiles pr ON pr.id=(CASE WHEN m.sender_id=? THEN m.recipient_id ELSE m.sender_id END)
        LEFT JOIN posts po ON po.id=m.post_id
        WHERE m.sender_id=? OR m.recipient_id=? ORDER BY m.created_at DESC,m.rowid DESC`).all(user.id,user.id,user.id,user.id);
      const seen=new Set();
      respond(res,200,{conversations:conversations.filter(row=>{if(seen.has(row.other_id))return false;seen.add(row.other_id);return true;})});return;
    }
    if(url.pathname==='/api/messages') {
      if(!user) throw httpError('Entre em sua conta para enviar ou ler mensagens.',401);
      if(req.method==='GET') {
        const other=String(url.searchParams.get('with')||'');
        if(!/^[0-9a-f-]{36}$/.test(other)) throw httpError('Destinatário inválido.');
        if(!db.prepare('SELECT id FROM profiles WHERE id=?').get(other)) throw httpError('Usuário não encontrado.',404);
         
        db.prepare('UPDATE messages SET read_at=CURRENT_TIMESTAMP WHERE recipient_id=? AND sender_id=? AND read_at IS NULL').run(user.id,other);
        db.prepare(`UPDATE notifications SET read_at=CURRENT_TIMESTAMP WHERE recipient_id=? AND kind='MESSAGE'
          AND actor_id=? AND read_at IS NULL`).run(user.id,other);
        const messages=db.prepare(`SELECT m.id,m.sender_id,m.recipient_id,m.post_id,m.content,m.created_at,
          p.title AS post_title, pr.username AS sender_username, pr.display_name AS sender_name
          FROM messages m LEFT JOIN posts p ON p.id=m.post_id JOIN profiles pr ON pr.id=m.sender_id
          WHERE (m.sender_id=? AND m.recipient_id=?) OR (m.sender_id=? AND m.recipient_id=?)
          ORDER BY m.created_at DESC,m.rowid DESC LIMIT 200`).all(user.id,other,other,user.id).reverse();
        respond(res,200,{messages});return;
      }
      if(req.method==='POST') {
        const body=await jsonBody(req);
        const recipientId=String(body.recipient_id||'');
        const postId=body.post_id==null?null:String(body.post_id);
        const content=String(body.content||'').trim();
        if(!recipientId || recipientId===user.id) throw httpError('Selecione outro músico.');
        if(!db.prepare('SELECT id FROM profiles WHERE id=?').get(recipientId)) throw httpError('Destinatário inexistente.',404);
        if(postId && !db.prepare('SELECT id FROM posts WHERE id=?').get(postId)) throw httpError('Publicação não encontrada.',404);
        if(!postId && !content) throw httpError('Escreva uma mensagem.');
        if(content.length>2000) throw httpError('A mensagem deve ter no máximo 2.000 caracteres.');
        const id=randomUUID();
        db.exec('BEGIN');
        try {
          db.prepare('INSERT INTO messages(id,sender_id,recipient_id,post_id,content) VALUES(?,?,?,?,?)').run(id,user.id,recipientId,postId,content);
          db.prepare(`INSERT INTO notifications(id,recipient_id,actor_id,kind,message_id,post_id) VALUES(?,?,?,'MESSAGE',?,?)`)
            .run(randomUUID(),recipientId,user.id,id,postId);
          db.exec('COMMIT');
        } catch(error) {db.exec('ROLLBACK');throw error;}
        const message=db.prepare('SELECT id,sender_id,recipient_id,post_id,content,created_at FROM messages WHERE id=?').get(id);
        respond(res,201,{message});return;
      }
      throw httpError('Método não permitido.',405);
    }
    const match = /^\/api\/data\/([a-z_]+)$/.exec(url.pathname);
    if(!match || !allowedTables.has(match[1])) throw httpError('Rota não encontrada.',404);
    const table=match[1];
    if(!user) throw httpError('Entre em sua conta para continuar.',401);
    if(req.method==='GET') {
      let filters=[];
      try {filters=JSON.parse(url.searchParams.get('filters') || '[]');} catch {throw httpError('Filtro inválido.');}
      if(!parseFilters(filters)) throw httpError('Filtro inválido.');
      if(table==='saved_posts') filters.push({column:'user_id',operator:'eq',value:user.id});
      let rows=all(table).filter(row=>matching(row,filters));
      const orderColumn=url.searchParams.get('order');
      if(orderColumn && /^[a-z_]+$/.test(orderColumn) && rows.length && orderColumn in rows[0]){
        const ascending=url.searchParams.get('ascending')==='true';
        rows.sort((a,b)=> (String(a[orderColumn]??'') < String(b[orderColumn]??'') ? -1 : String(a[orderColumn]??'')>String(b[orderColumn]??'') ? 1 : 0)*(ascending?1:-1));
      }
      const limit=Number(url.searchParams.get('limit') || '1000');
      rows=rows.slice(0, Math.max(0, Math.min(1000,Number.isFinite(limit)?limit:1000)));
      const fields=url.searchParams.get('select') || '*';
      rows=rows.map(r=> fields.includes('(') ? enrich(table,r) : projection(r,fields));
      respond(res,200,{data:rows});return;
    }
    if(req.method==='POST') {
      const body = validValue(table,await jsonBody(req));
      if(table==='profiles') throw httpError('Não é possível criar perfis manualmente.',403);
      const identity=writeIdentity[table];
      if(identity!=='creator_id' && body[identity] !== user.id) throw httpError('Ação não autorizada.',403);
      if(table==='communities') {
        validateCommunity(body, true);
        body.creator_id=user.id;
      }
      if(table==='posts' && (!body.title || String(body.title).trim().length<3)) throw httpError('O título precisa ter pelo menos 3 caracteres.');
      let mentionRecipients=[];
      if(table==='comments') {
        body.content=String(body.content||'').trim();
        if(body.content.length<2 || body.content.length>2000) throw httpError('O comentário deve ter de 2 a 2.000 caracteres.');
        if(!db.prepare('SELECT id FROM posts WHERE id=?').get(body.post_id)) throw httpError('Publicação não encontrada.',404);
        if(body.parent_comment_id && !db.prepare('SELECT id FROM comments WHERE id=? AND post_id=?').get(body.parent_comment_id,body.post_id)) throw httpError('Comentário pai inválido.');
        const usernames=[...body.content.matchAll(/(^|[^a-zA-Z0-9_@])@([a-z0-9_]{3,24})(?![a-zA-Z0-9_])/gi)]
          .map(match=>match[2].toLowerCase());
         
        for(const username of new Set(usernames)) {
          const mentioned=db.prepare('SELECT id,username FROM profiles WHERE username=?').get(username);
          if(!mentioned) continue;
          if(mentioned.id===user.id) continue;
          if(!db.prepare('SELECT 1 FROM follows WHERE follower_id=? AND following_id=?').get(user.id,mentioned.id))
            throw httpError(`Para marcar @${mentioned.username}, você precisa seguir esse músico.`,403);
          mentionRecipients.push(mentioned.id);
        }
      }
      if(table==='posts') {
        body.post_type=body.post_type || 'TEXT';
        if(!['TEXT','IMAGE','VIDEO','AUDIO'].includes(body.post_type)) throw httpError('Tipo de publicação inválido.');
        if(body.post_type!=='TEXT') {
          let uri;
          try {uri=new URL(String(body.media_url||''));}catch{throw httpError('É necessário enviar um arquivo de mídia.');}
          const ext=/^\/api\/uploads\/[0-9a-f-]{36}\.([a-z0-9]+)$/.exec(uri.pathname)?.[1];
          const expected=body.post_type==='IMAGE'?['jpg','png','webp','gif']:body.post_type==='AUDIO'?['mp3','wav','ogg','weba']:['mp4','webm','ogv'];
          if(!['localhost','127.0.0.1'].includes(uri.hostname) || uri.port!==String(PORT) || uri.protocol!=='http:' || !ext || !expected.includes(ext) || !existsSync(path.join(uploadsDir,uri.pathname.split('/').pop()))) throw httpError('Selecione um arquivo válido enviado ao Melodica.');
        } else body.media_url=null;
      }
      if(table==='posts') {
        const metadata=validatePostCategories(Object.fromEntries(['genres','instruments','artists','topics'].map(k=>[k,body[k]===undefined?[]:typeof body[k]==='string'?safeJsonArray(body[k]):body[k]])));
        for(const [key,values] of Object.entries(metadata))body[key]=JSON.stringify(values);
      }
      if(table==='posts' && body.community_id && !db.prepare('SELECT 1 FROM communities WHERE id=?').get(body.community_id)) throw httpError('Comunidade inválida.');
      if(table==='community_members' && !db.prepare('SELECT 1 FROM communities WHERE id=?').get(body.community_id)) throw httpError('Comunidade inválida.');
      body.id=randomUUID();
      if(table==='communities') {
         
        db.exec('BEGIN');
        try {
          sqlInsert(table,{...body,member_count:1});
          db.prepare('INSERT INTO community_members(id,community_id,user_id,role) VALUES(?,?,?,?)')
            .run(randomUUID(),body.id,user.id,'OWNER');
          db.exec('COMMIT');
        } catch(error) {db.exec('ROLLBACK');throw error;}
      } else if(table==='comments') {
        db.exec('BEGIN');
        try {
          sqlInsert(table,body);
          for(const recipientId of mentionRecipients) {
            db.prepare('INSERT INTO comment_mentions(comment_id,user_id) VALUES(?,?)').run(body.id,recipientId);
            db.prepare(`INSERT INTO notifications(id,recipient_id,actor_id,kind,comment_id,post_id) VALUES(?,?,?,'MENTION',?,?)`)
              .run(randomUUID(),recipientId,user.id,body.id,body.post_id);
          }
          db.exec('COMMIT');
        } catch(error) {db.exec('ROLLBACK');throw error;}
      } else {
        sqlInsert(table,body);
        if(table==='community_members') db.prepare('UPDATE communities SET member_count=member_count+1 WHERE id=?').run(body.community_id);
      }
      const stored=db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(body.id);
      respond(res,201,{data:enrich(table,stored)});return;
    }
    if(req.method==='PATCH' || req.method==='DELETE') {
      let filters=[];
      try {filters=JSON.parse(url.searchParams.get('filters')||'[]');}catch {throw httpError('Filtro inválido.');}
      if(!parseFilters(filters) || !filters.length) throw httpError('Escolha o registro que deseja modificar.');
      const matchingRows=all(table).filter(r=>matching(r,filters));
      const identity=writeIdentity[table];
      const own=matchingRows.filter(r=>r[identity]===user.id);
      if(own.length!==matchingRows.length) throw httpError('Ação não autorizada.',403);
      if(!['profiles','posts','comments','communities'].includes(table) && req.method==='PATCH') throw httpError('Esta edição não é permitida.',403);
      const patch=req.method==='PATCH' ? validValue(table,await jsonBody(req)) : null;
      if(patch) {
        for(const field of ['author_id','creator_id','id','user_id','follower_id','following_id','post_id','community_id','parent_comment_id']) delete patch[field];
      }
      if(patch && table==='communities') {
         
        delete patch.slug;
        validateCommunity(patch);
      }
      if(patch && table==='posts') {
        const metadataKeys=['genres','instruments','artists','topics'].filter(key=>key in patch);
        if(metadataKeys.length) {
          const values=validatePostCategories(Object.fromEntries(metadataKeys.map(k=>[k,typeof patch[k]==='string'?safeJsonArray(patch[k]):patch[k]])));
          for(const key of metadataKeys)patch[key]=JSON.stringify(values[key]);
        }
      }
      if(patch && (table==='profiles' || table==='communities' || table==='posts') && !Object.keys(patch).length) throw httpError('Nenhuma alteração válida.');
      for(const row of own) {
        if(req.method==='DELETE' && table==='community_members' &&
          db.prepare('SELECT creator_id FROM communities WHERE id=?').get(row.community_id)?.creator_id===user.id)
          throw httpError('O criador não pode sair de sua própria comunidade.',403);
        if(req.method==='DELETE') {
          db.prepare(`DELETE FROM ${table} WHERE id=?`).run(row.id);
          if(table==='community_members') db.prepare('UPDATE communities SET member_count=max(0,member_count-1) WHERE id=?').run(row.community_id);
        } else {
          const updates=Object.entries(patch);
          if(updates.length) db.prepare(`UPDATE ${table} SET ${updates.map(([k])=>`${k}=?`).join(',')} WHERE id=?`).run(...updates.map(([,v])=>v),row.id);
        }
      }
      respond(res,200,{data:own});return;
    }
    throw httpError('Método não suportado.',405);
  } catch(err) {
    const message=String(err?.message || 'Erro interno');
    const status=err.status || (/UNIQUE constraint failed/.test(message)?409: /FOREIGN KEY constraint failed/.test(message)?400: 500);
    if(status===500) console.error('Erro de API:',err);
    respond(res,status,{message:status===500?'Falha interna no banco de dados.':message});
  }
});
server.listen(PORT, HOST,()=>console.log(`\n✔ Backend Melodica SQLite: http://${HOST}:${PORT}/api/health\n✔ Banco persistente: ${databasePath}\n`));
