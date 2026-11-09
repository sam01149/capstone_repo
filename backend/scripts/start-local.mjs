import { spawn } from 'node:child_process';
import { mkdirSync, openSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url)),runtime=join(root,'tmp');
mkdirSync(runtime,{recursive:true});
async function reachable(url,validate){try{const response=await fetch(url,{signal:AbortSignal.timeout(2000)});if(!response.ok)throw new Error('Layanan merespons dengan error.');return validate?await validate(response):true;}catch(error){if(error.name==='TimeoutError')throw new Error('Port lokal tidak merespons. Periksa layanan yang sedang menggunakan port tersebut.');return false;}}
const definitions=[{name:'backend',directory:'backend',entry:'dist/main.js',args:[],url:'http://localhost:3000/health',validate:async r=>(await r.json()).data?.database==='up'},{name:'frontend',directory:'frontend',entry:'node_modules/vite/bin/vite.js',args:['--host','127.0.0.1'],url:'http://localhost:5173',validate:async r=>(await r.text()).includes('/src/main.jsx')}];
const running={};
for(const definition of definitions){
  if(await reachable(definition.url,definition.validate)){console.log(`${definition.name} sudah berjalan.`);continue;}
  const cwd=join(root,definition.directory),entry=resolve(cwd,definition.entry);
  if(!existsSync(entry))throw new Error(`Siapkan dependensi/build ${definition.name} terlebih dahulu. Lihat README.`);
  const child=spawn(process.execPath,[entry,...definition.args],{cwd,detached:true,windowsHide:true,stdio:['ignore',openSync(join(runtime,`${definition.name}-local.log`),'a'),openSync(join(runtime,`${definition.name}-local.err`),'a')]});
  child.on('error',()=>console.error(`Gagal menjalankan ${definition.name}. Periksa log di tmp.`));child.unref();running[definition.name]=child.pid;
}
writeFileSync(join(runtime,'last-start-processes.json'),JSON.stringify(running,null,2));
console.log('Buka http://localhost:5173. Akses uji lokal, jika sudah dibuat, ada di tmp/akses-uji-lokal.txt.');
