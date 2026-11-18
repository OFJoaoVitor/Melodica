/** Testes isolados da API local de comunidades, sem alterar o banco real. */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const temp=mkdtempSync(path.join(tmpdir(),'melodica-communities-'));
const backend=path.join(temp,'backend');mkdirSync(backend);
for(const file of ['server.mjs','db.mjs','music-personalization.mjs'])
  copyFileSync(path.join(root,'backend',file),path.join(backend,file));
const port=19000+Math.floor(Math.random()*8000);
const server=spawn(process.execPath,[path.join(backend,'server.mjs')],{
  env:{...process.env,MELODICA_API_PORT:String(port)},stdio:'ignore',
});
const base=`http://127.0.0.1:${port}/api`;
const request=async (url,method='GET',body,session) => {
  const response=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(session?{Cookie:session}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  return { status:response.status,headers:response.headers,body:await response.json() };
};
const register=async (username) => {
  const result=await request('/auth/register','POST',{
    email:`${username}@example.com`,password:'Test123456!',options:{data:{username,display_name:username}},
  });
  assert.equal(result.status,201,JSON.stringify(result.body));
  return {id:result.body.user.id,cookie:result.headers.get('set-cookie').split(';')[0]};
};
try {
  let ready=false;
  for(let tries=0;tries<75;tries++) {
    if(server.exitCode!==null) throw new Error('Servidor terminou antes dos testes.');
    try {const r=await request('/health');if(r.status===200){ready=true;break;}} catch { /* inicialização */ }
    await sleep(80);
  }
  assert.ok(ready,'Servidor não inicializou');
  const owner=await register('communityowner');
  const other=await register('communityguest');
  const slug='amantes-da-musica';
  const created=await request('/data/communities','POST',{
    name:'Amantes da Música',slug,description:'Compartilhe músicas favoritas!',category:'Geral',accent:'#3366cc',
    avatar_url:null,banner_url:null,
  },owner.cookie);
  assert.equal(created.status,201,JSON.stringify(created.body));
  const community=created.body.data;
  assert.equal(community.creator_id,owner.id);
  assert.equal(community.member_count,1);
  assert.ok(community.community_members.some(m=>m.user_id===owner.id));
  const qs=`?filters=${encodeURIComponent(JSON.stringify([{column:'id',operator:'eq',value:community.id}]))}&select=id,name,slug,description,category,accent,avatar_url,banner_url,creator_id,member_count,community_members(user_id)`;
  const fetched=await request('/data/communities'+qs,'GET',undefined,owner.cookie);
  assert.equal(fetched.status,200);
  assert.equal(fetched.body.data[0].name,'Amantes da Música');
  assert.equal(fetched.body.data[0].creator_id,owner.id);
  assert.equal((await request('/data/communities'+qs,'PATCH',{description:'Invadida'},other.cookie)).status,403);
  assert.equal((await request('/data/communities'+qs,'DELETE',undefined,other.cookie)).status,403);
  assert.equal((await request('/data/communities','POST',{name:'Comunidade repetida',slug},other.cookie)).status,409);
  assert.equal((await request('/data/communities','POST',{name:'X',slug:'xx'},owner.cookie)).status,400);
  const updated=await request('/data/communities'+qs,'PATCH',{
    name:'Amantes de Música',description:'Uma nova descrição',category:'Instrumento',accent:'#ef2244',
  },owner.cookie);
  assert.equal(updated.status,200,JSON.stringify(updated.body));
  assert.equal((await request('/data/communities'+qs,'GET',undefined,owner.cookie)).body.data[0].description,'Uma nova descrição');
  assert.equal((await request('/data/communities'+qs,'PATCH',{slug:'outro-slug'},owner.cookie)).status,400);
  const ownerMemberQuery=`?filters=${encodeURIComponent(JSON.stringify([{column:'community_id',operator:'eq',value:community.id},{column:'user_id',operator:'eq',value:owner.id}]))}`;
  assert.equal((await request('/data/community_members'+ownerMemberQuery,'DELETE',undefined,owner.cookie)).status,403);
  const join=await request('/data/community_members','POST',{community_id:community.id,user_id:other.id},other.cookie);
  assert.equal(join.status,201);
  assert.equal((await request('/data/communities'+qs,'GET',undefined,owner.cookie)).body.data[0].member_count,2);
  const otherMemberQuery=`?filters=${encodeURIComponent(JSON.stringify([{column:'community_id',operator:'eq',value:community.id},{column:'user_id',operator:'eq',value:other.id}]))}`;
  assert.equal((await request('/data/community_members'+otherMemberQuery,'DELETE',undefined,other.cookie)).status,200);
  assert.equal((await request('/data/communities'+qs,'GET',undefined,owner.cookie)).body.data[0].member_count,1);
  // Os campos de foto e capa aceitam somente arquivos realmente enviados ao backend.
  const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+XbCwAAAAASUVORK5CYII=','base64');
  const upload=await fetch(base+'/uploads',{method:'POST',headers:{Cookie:owner.cookie,'Content-Type':'image/png'},body:image});
  const uploadResult=await upload.json();
  assert.equal(upload.status,201,JSON.stringify(uploadResult));
  const imagePath=uploadResult.path;
  const imageUrl=`http://127.0.0.1:${port}${imagePath}`;
  assert.equal((await request('/data/communities'+qs,'PATCH',{avatar_url:imageUrl,banner_url:imageUrl},owner.cookie)).status,200);
  const withPhoto=(await request('/data/communities'+qs,'GET',undefined,owner.cookie)).body.data[0];
  assert.equal(withPhoto.avatar_url,imageUrl);
  assert.equal(withPhoto.banner_url,imageUrl);
  assert.equal((await request('/data/communities'+qs,'PATCH',{avatar_url:'https://example.org/malicious.png'},owner.cookie)).status,400);
  assert.equal((await request('/data/communities'+qs,'PATCH',{avatar_url:null},owner.cookie)).status,200);
  console.log('✔ Comunidades: criação, perfil, imagens, membros e permissões do criador aprovados.');
} finally {
  server.kill('SIGTERM');
  await sleep(180);
  rmSync(temp,{recursive:true,force:true});
}
