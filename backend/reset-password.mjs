/** Recuperação administrativa de senha para este banco local. */
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { randomBytes,scryptSync } from 'node:crypto';
import { db } from './db.mjs';

const rl=readline.createInterface({input,output});
try {
  const email=(process.argv[2] || await rl.question('Email da conta: ')).trim().toLowerCase();
  const user=db.prepare('SELECT id FROM users WHERE email=?').get(email);
  if(!user){console.error('Conta não encontrada neste banco local.');process.exitCode=1;}
  else {
    const password=await rl.question('Nova senha (vai aparecer no terminal): ');
    if(password.length<8||password.length>128){console.error('A senha deve ter de 8 a 128 caracteres.');process.exitCode=1;}
    else {
      const salt=randomBytes(16).toString('hex');
      const stored=`${salt}:${scryptSync(password,salt,64).toString('hex')}`;
      db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(stored,user.id);
      db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);
      console.log('Senha redefinida. Entre usando a nova senha.');
    }
  }
} finally {rl.close();db.close();}
