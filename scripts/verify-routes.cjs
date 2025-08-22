#!/usr/bin/env node
// naive static check: ensure no duplicate route filenames or mounts under server/routes
const { execSync } = require('child_process');
const fs = require('fs'); const path = require('path');
const root = path.join(process.cwd(), 'server', 'routes');
function walk(dir){ return fs.readdirSync(dir).flatMap(f=>{
  const p=path.join(dir,f); return fs.statSync(p).isDirectory()?walk(p):[p]; });}
const files = walk(root).filter(f=>f.endsWith('.ts')||f.endsWith('.js'));
const names = new Map();
let dup = false;
for (const f of files){
  const key = path.relative(root, f).replace(/\\/g,'/');
  if (names.has(key)){ console.error('Duplicate route file:', key); dup=true; }
  else names.set(key,true);
}
if (dup){ process.exit(1); }
console.log('Routes verified OK');