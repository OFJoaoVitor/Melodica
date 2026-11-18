/** Integração de notificações/menções, sem tocar no banco de produção. */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const temp=mkdtempSync(path.join(tmpdir(),'melodica-notifications-'));
const backend=path.join(temp,'backend');mkdirSync(backend);
for(const file of ['server.mjs','db.mjs','music-personalization.mjs'])
  copyFileSync(path.join(root,'backend',file),path.join(backend,file));
const port=25000+Math.floor(Math.random()*7000);
const child=spawn(process.execPath,[path.join(backend,'server.mjs')], { env:{...process.env,MELODICA_API_PORT:String(port)},stdio:'ignore' });
const request=async (path, method='GET', body, cookie) => {
  const response=await fetch(`http://127.0.0.1:${port}/api${path}`,{
    method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),
  });
  return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
};
async function account(username){
  const result=await request('/auth/register','POST',{email:`${username}@example.com`,password:'SomeSecure1234!',options:{data:{username,display_name:username}}});
  assert.equal(result.status,201,JSON.stringify(result.data));
  return {id:result.data.user.id,cookie:result.cookie};
}
const inbox=account=>request('/notifications','GET',undefined,account.cookie);
try{
  let online=false;
  for(let i=0;i<80;i++){
    if(child.exitCode!==null)throw new Error('Servidor encerrou antes do teste');
    try{if((await request('/health')).status===200){online=true;break;}}catch{}
    await sleep(60);
  }
  assert.ok(online,'Servidor local não respondeu');
  const ana=await account('ana_musica');
  const bruno=await account('bruno_musica');
  const carla=await account('carla_musica');
  assert.equal((await request('/notifications')).status,401);
  assert.equal((await inbox(bruno)).data.unread,0);

  const createdPost=await request('/data/posts','POST',{author_id:ana.id,title:'Primeira música',content:'teste'},ana.cookie);
  assert.equal(createdPost.status,201,JSON.stringify(createdPost.data));
  const postId=createdPost.data.data.id;
  const commented=async content=>request('/data/comments','POST',{author_id:ana.id,post_id:postId,content},ana.cookie);

  const denied=await commented('Vamos tocar @bruno_musica?');
  assert.equal(denied.status,403,'Não permite marcar não seguidores');
  assert.equal((await inbox(bruno)).data.unread,0);
  assert.equal((await request('/data/follows','POST',{follower_id:ana.id,following_id:bruno.id},ana.cookie)).status,201);
  const mention=await commented('Tudo certo @bruno_musica? Chama @bruno_musica também!');
  assert.equal(mention.status,201,JSON.stringify(mention.data));
  assert.equal(mention.data.data.mentions.length,1);
  assert.equal(mention.data.data.mentions[0].username,'bruno_musica');
  assert.equal((await inbox(bruno)).data.unread,1,'Menção repetida gera apenas um aviso');
  assert.equal((await commented('Oi @carla_musica')).status,403,'Marcações fora da lista de seguidos bloqueadas');
  assert.equal((await inbox(carla)).data.unread,0);
  const beforeDm=await inbox(bruno);
  const dm=await request('/messages','POST',{recipient_id:bruno.id,content:'Nova demo por DM'},ana.cookie);
  assert.equal(dm.status,201,JSON.stringify(dm.data));
  const unread=await inbox(bruno);
  assert.equal(unread.data.unread,2);
  assert.equal(unread.data.unread_messages,1);
  assert.deepEqual(unread.data.notifications.map(n=>n.kind).sort(),['MENTION','MESSAGE']);
  assert.equal((await inbox(carla)).data.unread,0);
  assert.equal((await inbox(ana)).data.unread,0,'Não avisa o autor');
  assert.equal((await request('/conversations','GET',undefined,bruno.cookie)).data.conversations[0].unread_count,1);
  const messageNotification=unread.data.notifications.find(n=>n.kind==='MESSAGE');
  const unauthorized=await request('/notifications/read','POST',{id:messageNotification.id},carla.cookie);
  assert.equal(unauthorized.status,200);
  assert.equal((await inbox(bruno)).data.unread,2,'Outra conta não pode ler notificações alheias');
  const history=await request(`/messages?with=${ana.id}`,'GET',undefined,bruno.cookie);
  assert.equal(history.status,200);
  assert.equal(history.data.messages.length,1);
  const afterRead=await inbox(bruno);
  assert.equal(afterRead.data.unread_messages,0);
  assert.equal(afterRead.data.unread,1,'Ler conversa apenas limpa avisos da conversa');
  assert.equal((await request('/conversations','GET',undefined,bruno.cookie)).data.conversations[0].unread_count,0);
  assert.equal((await request('/notifications/read','POST',{all:true},bruno.cookie)).status,200);
  assert.equal((await inbox(bruno)).data.unread,0);
  assert.equal((await request('/notifications/read','POST',{id:'invalido'},bruno.cookie)).status,400);
  console.log('✔ Notificações: DM, badges, menções seguidas, privacidade e leitura aprovados.');
}finally{
  child.kill('SIGTERM');await sleep(160);
  rmSync(temp,{recursive:true,force:true});
}
