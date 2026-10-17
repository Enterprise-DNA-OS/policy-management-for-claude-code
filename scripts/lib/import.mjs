import {readFileSync,existsSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {parseCsv} from './csv.mjs';
import {entities,normalise,resolve,insert,transaction} from './domain.mjs';
// Canonical staging labels. VComply has no verified universal public CSV layout.
export const headers={
  "people": {
    "Source Id": "source_id",
    "Name": "name",
    "Department": "department",
    "Email": "email",
    "Active": "active",
    "Retention Review On": "retention_review_on"
  },
  "policies": {
    "Source Id": "source_id",
    "Name": "name",
    "Owner Id": "owner_id",
    "Category": "category",
    "Review On": "review_on",
    "Archived": "archived"
  },
  "revisions": {
    "Source Id": "source_id",
    "Policy Id": "policy_id",
    "Name": "name",
    "Version": "version",
    "Author Id": "author_id",
    "Body": "body",
    "Consultation Evidence": "consultation_evidence"
  },
  "approvals": {
    "Source Id": "source_id",
    "Revision Id": "revision_id",
    "Approver Id": "approver_id",
    "Decision": "decision",
    "Evidence": "evidence",
    "Decided On": "decided_on"
  },
  "exceptions": {
    "Source Id": "source_id",
    "Policy Id": "policy_id",
    "Person Id": "person_id",
    "Name": "name",
    "Reason": "reason",
    "Expires On": "expires_on"
  }
};
export async function importVcomply(db,folder,{dry=false,mapping={},actor='vcomply-import'}={}) {
 if(!folder)throw Error('Supply a folder of mapped VComply CSV staging files');
 const unsupported=readdirSync(folder).filter(f=>f.toLowerCase().endsWith('.csv')&&!Object.keys(headers).some(n=>f===n+'.csv'));if(unsupported.length)throw Error('Unsupported CSV files: '+unsupported.join(', '));
 for(const [name,map] of Object.entries(mapping)){if(!headers[name])throw Error('Unknown mapping entity: '+name);for(const dest of Object.values(map))if(!entities[name].fields.includes(dest))throw Error('Unsupported mapping destination: '+dest);}
 const batches=[];
 for(const name of Object.keys(headers)) {
  const file=path.join(folder,name+'.csv');if(!existsSync(file))continue;
  const rows=parseCsv(readFileSync(file,'utf8'));if(!rows.length)throw Error(name+'.csv is empty');
  const map={...headers[name],...(mapping[name]||{})};const lookup=new Map(Object.entries(map).map(([k,v])=>[k.toLowerCase(),v]));
  const unknown=Object.keys(rows[0]).filter(k=>!lookup.has(k.toLowerCase())&&!entities[name].fields.includes(k));
  const seen=new Set();
  const data=rows.map((row,i)=>{
   const out={};for(const [key,v] of Object.entries(row)){const dest=lookup.get(key.toLowerCase())||(entities[name].fields.includes(key)?key:null);if(dest){if(Object.hasOwn(out,dest))throw Error(name+': multiple columns map to '+dest);out[dest]=v;}}
   if(!out.source_id)throw Error(name+' row '+(i+2)+': missing source ID');if(seen.has(out.source_id))throw Error(name+': duplicate source ID '+out.source_id);seen.add(out.source_id);
   return normalise(name,out);
  });
  batches.push({name,data,ignored_columns:unknown});
 }
 if(!batches.length)throw Error('No supported CSV files found');
 return transaction(db,async()=>{
  const results=[];
  for(const {name,data,ignored_columns} of batches){let inserted=0,unchanged=0;
   for(const row of data){
    for(const [key,target] of Object.entries(entities[name].refs||{}))if(row[key])row[key]=(await resolve(db,target,row[key],{exact:true})).id;
    const old=(await db.query(`select * from ${name} where source_id=$1`,[row.source_id]))[0];
    if(old){for(const [k,v] of Object.entries(row)){const prior=old[k];if((v===null?prior!==null:typeof v==='number'?Number(prior)!==v:String(prior)!==String(v)))throw Error(name+' '+row.source_id+': changed '+k+'; reconcile explicitly, import does not overwrite');}unchanged++;}
    else {await insert(db,name,row,{exactRefs:true});inserted++;}
   }
   results.push({entity:name,inserted,unchanged,ignored_columns});
  }
  return {dry_run:dry,results};
 },{dry,actor});
}
