#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {getDb} from './lib/db.mjs';
import {reads,entities,display,runRead,policyDetails,resolve,insert,transaction,draft,exportData,outputFile,normalise,makeEffective} from './lib/domain.mjs';
import {importVcomply} from './lib/import.mjs';
const raw=process.argv.slice(2),args=[],opts={};
for(let i=0;i<raw.length;i++){const a=raw[i];if(!a.startsWith('--'))args.push(a);else{const eq=a.indexOf('='),key=a.slice(2,eq<0?undefined:eq);if(['json','dry-run','help'].includes(key)){if(eq>=0)throw Error(key+' takes no value');opts[key]=true;}else{const value=eq>=0?a.slice(eq+1):raw[++i];if(value===undefined||value.startsWith('--'))throw Error('Missing value for '+key);opts[key]=value;}}}
const [command,ref,third]=args;
const help=`Policy Management CLI\nRead: ${[...Object.keys(reads),'weekly-review','insights','policy <reference>'].join(', ')}\nWrite: add <entity> --file=<record.json>; make-effective <revision>; acknowledge <assignment> --evidence=<text>; close-exception <reference> --resolution=<text>; review-policy <policy> --date=<date> --evidence=<text>; log <policy> --text=<note>\nDraft: draft-weekly-review; draft-review-brief <policy>; draft-reminders\nImport: import vcomply <folder> [--mapping=<file>] [--dry-run]\nExport: export\nAll commands accept --json. Writes require --actor=<name>.\nEntities: ${Object.keys(entities).join(', ')}`;
if(!command||opts.help||command==='help'){console.log(help);process.exit(0);}
const allowed=new Set(['json','actor','dry-run','mapping','file','resolution','date','evidence','text']);
let db;
try {
 for(const k of Object.keys(opts))if(!allowed.has(k))throw Error('Unknown option: --'+k);
 if(opts['dry-run']&&command!=='import')throw Error('--dry-run is supported by import only');
 const known=[...Object.keys(reads),'weekly-review','insights','policy','add','make-effective','acknowledge','close-exception','review-policy','log','draft-weekly-review','draft-review-brief','draft-reminders','import','export'];
 if(!known.includes(command))throw Error('Unknown command: '+command+'\n'+help);
 const actor=opts.actor||'operator';db=await getDb();let result;
 if(Object.hasOwn(reads,command)||['weekly-review','insights'].includes(command))result=await runRead(db,command);
 else if(command==='policy')result=await policyDetails(db,ref);
 else if(command==='import'){if(!opts['dry-run']&&!opts.actor?.trim())throw Error('--actor is required for import writes');if(ref!=='vcomply')throw Error('Only import vcomply is supported');result=await importVcomply(db,third,{dry:!!opts['dry-run'],mapping:opts.mapping?JSON.parse(readFileSync(opts.mapping,'utf8')):{},actor});}
 else if(command==='export'){const data=await exportData(db);result={file:outputFile('exports','policies-'+Date.now()+'.json',JSON.stringify(data,null,2)+'\n'),counts:Object.fromEntries(Object.entries(data).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[k,v.length]))};}
 else if(command.startsWith('draft-'))result=await draft(db,command.slice(6),ref);
 else {
 if(!opts.actor?.trim())throw Error('--actor is required for writes');
 result=await transaction(db,async()=>{
  if(command==='add'){if(!opts.file)throw Error('--file is required');if(ref==='acknowledgements')throw Error('Use acknowledge to record evidence with actor');return [await insert(db,ref,JSON.parse(readFileSync(opts.file,'utf8')))];}
  if(command==='make-effective')return makeEffective(db,ref);
  if(command==='acknowledge'){const a=await resolve(db,'assignments',ref);if(!opts.evidence?.trim())throw Error('--evidence is required');return [await insert(db,'acknowledgements',{source_id:'ACK-'+crypto.randomUUID(),assignment_id:a.id,evidence:opts.evidence,recorded_by:actor})];}
  if(command==='close-exception'){const e=await resolve(db,'exceptions',ref);if(e.status!=='open')throw Error('Exception already closed');if(!opts.resolution?.trim())throw Error('--resolution is required');return db.query("update exceptions set status='closed',resolution=$1 where id=$2 returning source_id,status,resolution",[opts.resolution,e.id]);}
  if(command==='review-policy'){const p=await resolve(db,'policies',ref);if(!opts.evidence?.trim())throw Error('--evidence is required');const {review_on}=normalise('policies',{review_on:opts.date});if(!review_on)throw Error('--date is required');const today=(await db.query('select current_date::text as d'))[0].d;if(review_on<=today)throw Error('Next review date must be in the future');await insert(db,'notes',{source_id:'NOTE-'+crypto.randomUUID(),policy_id:p.id,body:'Review completed: '+opts.evidence,author:actor});return db.query('update policies set review_on=$1 where id=$2 returning source_id,review_on',[review_on,p.id]);}
  if(command==='log'){const p=await resolve(db,'policies',ref);if(!opts.text?.trim())throw Error('--text is required');return [await insert(db,'notes',{source_id:'NOTE-'+crypto.randomUUID(),policy_id:p.id,body:opts.text,author:actor})];}
  throw Error('Unsupported command');
 },{actor});}
 console.log(opts.json?JSON.stringify(result,null,2):display(result));
} catch(e) { console.error(opts.json?JSON.stringify({error:e.message}):'Error: '+e.message);process.exitCode=1; }
finally { if(db)await db.close(); }
