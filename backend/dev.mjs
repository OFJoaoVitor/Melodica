import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = spawn(process.execPath, [path.join(root,'backend/server.mjs')], { cwd:root, stdio:'inherit' });
const vite = spawn(process.execPath, [path.join(root,'node_modules/vite/bin/vite.js'),'dev'],{cwd:root,stdio:'inherit'});
const children=[backend,vite];
let stopped=false;
function stop(code=0){if(stopped)return; stopped=true; for(const child of children) if(child.exitCode===null) child.kill();process.exitCode=code;}
for(const child of children){child.on('error',e=>{console.error(e);stop(1)});child.on('exit',code=>{if(!stopped) stop(code??1);});}
process.on('SIGINT',()=>stop());
process.on('SIGTERM',()=>stop());
