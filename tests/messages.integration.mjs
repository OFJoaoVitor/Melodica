/** Testes da funcionalidade de DM e da lista de pessoas seguidas; banco temporário isolado. */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const temp=mkdtempSync(path.join(tmpdir(),'melodica-messages-'));
const backend=path.join(temp,'backend');mkdirSync(backend);
for(const file of ['server.mjs','db.mjs','music-personalization.mjs'])
  copyFileSync(path.join(root,'backend',file),path.join(backend,file));
const port=20000+Math.floor(Math.random()*8000);
const server=spawn(process.execPath,[path.join(backend,'server.mjs')],{
  env:{...process.env,MELODICA_API_PORT:String(port)},stdio:'ignore',
});
const base=`http://127.0.0.1:${port}/api`;
const request=async (url,method='GET',body,session) => {
  const response=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(session?{Cookie:session}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  return {status:response.status,headers:response.headers,body:await response.json()};
};
const register=async username => {
  const result=await request('/auth/register','POST',{
    email:`${username}@example.com`,password:'Test123456!',options:{data:{username,display_name:username}},
  });
  assert.equal(result.status,201,JSON.stringify(result.body));
  return {id:result.body.user.id,cookie:result.headers.get('set-cookie').split(';')[0]};
};
try {
  let ready=false;
  for(let i=0;i<80;i++) {
    if(server.exitCode!==null) throw new Error('Backend encerrou antes dos testes');
    try {if((await request('/health')).status===200){ready=true;break;}} catch {}
    await sleep(70);
  }
  assert.ok(ready,'Backend não inicializou');
  const ana=await register('ana_music');
  const bruno=await register('bruno_music');
  const carla=await register('carla_music');
  assert.equal((await request('/following','GET')).status,401);
  assert.deepEqual((await request('/following','GET',undefined,ana.cookie)).body.following,[]);
  // Ana segue Bruno; Bruno não segue Ana nem Carla.
  const follow=await request('/data/follows','POST',{follower_id:ana.id,following_id:bruno.id},ana.cookie);
  assert.equal(follow.status,201,JSON.stringify(follow.body));
  const contacts=(await request('/following','GET',undefined,ana.cookie)).body.following;
  assert.equal(contacts.length,1);
  assert.equal(contacts[0].id,bruno.id);
  assert.equal(contacts[0].username,'bruno_music');
  assert.equal((await request('/following','GET',undefined,bruno.cookie)).body.following.length,0);
  assert.deepEqual((await request('/conversations','GET',undefined,ana.cookie)).body.conversations,[]);
  assert.equal((await request(`/messages?with=${bruno.id}`,'GET',undefined,ana.cookie)).body.messages.length,0);
  const first=await request('/messages','POST',{recipient_id:bruno.id,post_id:null,content:'Oi, vamos tocar juntos?'},ana.cookie);
  assert.equal(first.status,201,JSON.stringify(first.body));
  assert.equal(first.body.message.sender_id,ana.id);
  assert.equal(first.body.message.recipient_id,bruno.id);
  const reply=await request('/messages','POST',{recipient_id:ana.id,content:'Vamos!'},bruno.cookie);
  assert.equal(reply.status,201,JSON.stringify(reply.body));
  const history=(await request(`/messages?with=${bruno.id}`,'GET',undefined,ana.cookie)).body.messages;
  assert.equal(history.length,2);
  assert.deepEqual(history.map(m=>m.content),['Oi, vamos tocar juntos?','Vamos!']);
  assert.equal((await request('/conversations','GET',undefined,ana.cookie)).body.conversations[0].other_id,bruno.id);
  assert.equal((await request('/conversations','GET',undefined,bruno.cookie)).body.conversations[0].other_id,ana.id);
  assert.equal((await request('/conversations','GET',undefined,carla.cookie)).body.conversations.length,0);
  assert.equal((await request(`/messages?with=${bruno.id}`,'GET',undefined,carla.cookie)).body.messages.length,0);
  assert.equal((await request('/messages','POST',{recipient_id:ana.id,content:'teste'},ana.cookie)).status,400);
  assert.equal((await request('/messages','POST',{recipient_id:bruno.id,content:'  '},ana.cookie)).status,400);
  assert.equal((await request('/messages','POST',{recipient_id:bruno.id,content:'x'.repeat(2001)},ana.cookie)).status,400);
  // Remover seguir não remove as mensagens já trocadas.
  const filters=encodeURIComponent(JSON.stringify([{column:'follower_id',operator:'eq',value:ana.id},{column:'following_id',operator:'eq',value:bruno.id}]));
  assert.equal((await request(`/data/follows?filters=${filters}`,'DELETE',undefined,ana.cookie)).status,200);
  assert.equal((await request('/following','GET',undefined,ana.cookie)).body.following.length,0);
  assert.equal((await request(`/messages?with=${bruno.id}`,'GET',undefined,ana.cookie)).body.messages.length,2);
  console.log('✔ DMs: seguidores, envio, resposta, histórico, autenticação e privacidade aprovados.');
} finally {
  server.kill('SIGTERM');
  await sleep(180);
  rmSync(temp,{recursive:true,force:true});
}
