import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const command=process.argv[2];
const run=args=>{const r=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js',...args],{stdio:'inherit'});if(r.status!==0)process.exit(r.status??1)};
if(command==='login')run(['login']);
else if(command==='create-db')run(['d1','create','movie-evenings-db']);
else{
 const config=JSON.parse(readFileSync('cloudflare.config.json','utf8'));if(!/^[a-f0-9]{32}$/i.test(config.account_id)||!/^[a-f0-9-]{36}$/i.test(config.database_id)){console.error('Fill account_id and database_id in cloudflare.config.json, then rebuild before deployment.');process.exit(1)}
 if(command==='migrate')run(['d1','migrations','apply','DB','--remote','--config','dist/server/wrangler.json']);
 else if(command==='secrets'){const text=readFileSync('.dev.vars','utf8');const raw=text.match(/^ADMIN_CREDENTIALS=(.+)$/m)?.[1];if(!raw)throw Error('Run the private admin setup first.');const credentials=JSON.parse(raw);const r=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','secret','bulk','--config','dist/server/wrangler.json'],{input:JSON.stringify({ADMIN_CREDENTIALS:JSON.stringify(credentials)}),stdio:['pipe','inherit','inherit']});process.exit(r.status??1)}
 else if(command==='deploy')run(['deploy','--config','dist/server/wrangler.json']);
 else{console.error('Use login, create-db, migrate, secrets, or deploy.');process.exit(1)}
}
