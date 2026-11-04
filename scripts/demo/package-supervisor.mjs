/** Package only verified static output. No source env, dependencies or server functions. */
import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
const source = resolve('apps/supervisor-demo/out');
const dest = resolve(process.env.DEMO_PACKAGE || '/tmp/eh-supervisor-publish');
await mkdir(dest, { recursive:true });
await cp(source, dest, { recursive:true });
const csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
await writeFile(join(dest, 'vercel.json'), JSON.stringify({ framework:null, buildCommand:null, installCommand:null, outputDirectory:null, trailingSlash:true,
  headers:[{ source:'/(.*)', headers:[{ key:'Content-Security-Policy', value:csp }, { key:'X-Content-Type-Options', value:'nosniff' }, { key:'Referrer-Policy', value:'no-referrer' }, { key:'X-Robots-Tag', value:'noindex, nofollow' }, { key:'Permissions-Policy', value:'camera=(), microphone=(), geolocation=()' }] }],
}, null, 2));
const files = [];
async function walk(dir, prefix = '') {
  for (const entry of await readdir(dir, { withFileTypes:true })) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) await walk(join(dir,entry.name),name+'/');
    else {
      if (/\.env|\.map$|\.pem$|\.key$|(^|\/)node_modules\//.test(name)) throw new Error(`Forbidden publish path ${name}`);
      const bytes = await readFile(join(dir,entry.name));
      files.push({ file:name, sha:createHash('sha1').update(bytes).digest('hex'), size:bytes.length });
    }
  }
}
await walk(dest);
await writeFile('/tmp/eh-supervisor-file-manifest.json',JSON.stringify(files));
console.log(JSON.stringify({ dest, files:files.length, bytes:files.reduce((n,f)=>n+f.size,0), functions:0 }));
