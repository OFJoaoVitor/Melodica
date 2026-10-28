import http from 'node:http';
import { randomBytes, randomUUID, createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import { db, databasePath } from './db.mjs';

const HOST = '127.0.0.1';
const PORT = Number(process.env.MELODICA_API_PORT || '8787');
const SESSION_AGE_SECONDS = 60 * 60 * 24 * 14;
const allowedTables = new Set(['profiles','communities','community_members','posts','post_votes','comments','saved_posts','follows']);
const columns = {
  profiles: ['display_name','bio','location','primary_instrument','account_type','experience_level','avatar_url','banner_url','website_url'],
  communities: ['name','slug','description','category','accent'],
  community_members: ['community_id','user_id'], posts: ['author_id','community_id','title','content','post_type','media_url','tags'],
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
  // Supabase-style select expressions for nested results are built separately.
  const names = fields.split(',').map(v=>v.trim()).filter(v=>/^[a-z_]+$/.test(v));
  if(!names.length) return record;
  return Object.fromEntries(names.map(k=>[k,record[k] ?? null]));
};
const enrich = (table, record) => {
  if(table === 'posts') {
    const author = db.prepare('SELECT username,display_name,account_type FROM profiles WHERE id=?').get(record.author_id) || null;
    const community = record.community_id ? db.prepare('SELECT name,slug FROM communities WHERE id=?').get(record.community_id) || null : null;
    const votes = db.prepare('SELECT user_id FROM post_votes WHERE post_id=?').all(record.id);
    const count = db.prepare('SELECT count(*) AS count FROM comments WHERE post_id=?').get(record.id).count;
    const saved = db.prepare('SELECT user_id FROM saved_posts WHERE post_id=?').all(record.id);
    return {...record,author,community,post_votes:votes,comments:[{count}],saved_posts:saved};
  }
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
    // Browsers may access this server only from local development pages.
    if(origin) {
      const allowed = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if(!allowed) throw httpError('Origem não autorizada.',403);
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary','Origin');
      res.setHeader('Access-Control-Allow-Credentials','true');
      res.setHeader('Access-Control-Allow-Headers','content-type');
      res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,OPTIONS');
    }
    if(req.method==='OPTIONS') {res.writeHead(204);res.end();return;}
    const url = new URL(req.url || '/',`http://${HOST}:${PORT}`);
    if(req.method==='GET' && url.pathname==='/api/health') {respond(res,200,{ok:true,engine:'SQLite local'});return;}
    if(!url.pathname.startsWith('/api/')) throw httpError('Rota não encontrada.',404);
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
      // Avoid leaking if the account exists.
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
      if(table==='communities') body.creator_id=user.id;
      if(table==='posts' && (!body.title || String(body.title).trim().length<3)) throw httpError('O título precisa ter pelo menos 3 caracteres.');
      if(table==='comments' && (!body.content || !String(body.content).trim())) throw httpError('Comentário vazio.');
      if(table==='posts' && body.community_id && !db.prepare('SELECT 1 FROM communities WHERE id=?').get(body.community_id)) throw httpError('Comunidade inválida.');
      if(table==='community_members' && !db.prepare('SELECT 1 FROM communities WHERE id=?').get(body.community_id)) throw httpError('Comunidade inválida.');
      body.id=randomUUID();
      sqlInsert(table,body);
      if(table==='community_members') db.prepare('UPDATE communities SET member_count=member_count+1 WHERE id=?').run(body.community_id);
      respond(res,201,{data:body});return;
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
      if(patch && (table==='profiles' || table==='communities' || table==='posts') && !Object.keys(patch).length) throw httpError('Nenhuma alteração válida.');
      for(const row of own) {
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
