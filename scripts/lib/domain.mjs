import {writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {REPO_ROOT} from './db.mjs';
import {table} from './format.mjs';
export const entities={
  "people": {
    "label": "name",
    "fields": [
      "source_id",
      "name",
      "department",
      "email",
      "active",
      "retention_review_on"
    ]
  },
  "policies": {
    "label": "name",
    "fields": [
      "source_id",
      "name",
      "owner_id",
      "category",
      "review_on",
      "archived"
    ],
    "refs": {
      "owner_id": "people"
    }
  },
  "revisions": {
    "label": "name",
    "fields": [
      "source_id",
      "policy_id",
      "name",
      "version",
      "author_id",
      "body",
      "consultation_evidence"
    ],
    "refs": {
      "policy_id": "policies",
      "author_id": "people"
    }
  },
  "approvals": {
    "label": "source_id",
    "fields": [
      "source_id",
      "revision_id",
      "approver_id",
      "decision",
      "evidence",
      "decided_on"
    ],
    "refs": {
      "revision_id": "revisions",
      "approver_id": "people"
    }
  },
  "assignments": {
    "label": "source_id",
    "fields": [
      "source_id",
      "revision_id",
      "person_id",
      "due_on"
    ],
    "refs": {
      "revision_id": "revisions",
      "person_id": "people"
    }
  },
  "acknowledgements": {
    "label": "source_id",
    "fields": [
      "source_id",
      "assignment_id",
      "acknowledged_on",
      "evidence",
      "recorded_by"
    ],
    "refs": {
      "assignment_id": "assignments"
    }
  },
  "exceptions": {
    "label": "name",
    "fields": [
      "source_id",
      "policy_id",
      "person_id",
      "name",
      "reason",
      "expires_on"
    ],
    "refs": {
      "policy_id": "policies",
      "person_id": "people"
    }
  },
  "notes": {
    "label": "source_id",
    "fields": [
      "source_id",
      "policy_id",
      "body",
      "author"
    ],
    "refs": {
      "policy_id": "policies"
    }
  }
};
export const reads={
  "people": "select source_id,name,department,active,retention_review_on from people order by name",
  "register": "select source_id,name,category,owner,version,review_on,review_days from v_register where not archived order by name",
  "review-due": "select source_id,name,owner,version,review_on,review_days from v_review_queue order by review_on",
  "approval-desk": "select source_id,policy,version,author,decisions,approvals,rejections from v_approval_queue order by policy,version",
  "acknowledgements": "select source_id,policy,version,version_status,person,due_on,acknowledged_on,days_overdue from v_acknowledgements order by policy,person",
  "acknowledgements-due": "select source_id,policy,version,person,department,due_on,days_overdue from v_acknowledgements where acknowledged_on is null and version_status='effective' order by due_on,source_id",
  "exceptions": "select e.source_id,e.name,p.name as policy,pe.name as person,e.reason,e.expires_on,e.status from exceptions e join policies p on p.id=e.policy_id join people pe on pe.id=e.person_id where e.status='open' order by expires_on",
  "attention": "select * from v_attention order by kind,reference",
  "compliance": "select * from v_compliance order by rule,reference",
  "history": "select entity,record_id,action,actor,created_at from audit_log order by created_at desc,id limit 100"
};
export const questions=[
  [
    "Which overdue policies also have overdue acknowledgements?",
    "select p.name,p.review_on,count(a.id)::int as overdue_acknowledgements from policies p join revisions r on r.policy_id=p.id and r.status='effective' join assignments a on a.revision_id=r.id left join acknowledgements k on k.assignment_id=a.id where p.review_on<current_date and a.due_on<current_date and k.id is null group by p.id order by p.name"
  ],
  [
    "Which departments still owe acknowledgement of current versions?",
    "select department,count(*)::int as outstanding from v_acknowledgements where version_status='effective' and acknowledged_on is null group by department order by outstanding desc,department"
  ],
  [
    "Which people hold expired exceptions and outstanding acknowledgements?",
    "select distinct pe.name,p.name as policy from exceptions e join people pe on pe.id=e.person_id join policies p on p.id=e.policy_id join revisions r on r.policy_id=p.id and r.status='effective' join assignments a on a.revision_id=r.id and a.person_id=pe.id left join acknowledgements k on k.assignment_id=a.id where e.status='open' and e.expires_on<current_date and k.id is null order by pe.name"
  ],
  [
    "Which draft safety changes lack consultation evidence?",
    "select p.name,r.version,r.source_id from revisions r join policies p on p.id=r.policy_id where r.status='draft' and p.category='safety' and coalesce(trim(r.consultation_evidence),'')='' order by p.name"
  ],
  [
    "Which policy owners are inactive while reviews are overdue?",
    "select p.name,pe.name as owner,p.review_on from policies p join people pe on pe.id=p.owner_id where not pe.active and not p.archived and p.review_on<current_date order by p.name"
  ],
  [
    "Which active policies have no effective version?",
    "select name,owner,review_on from v_register where not archived and revision_id is null order by name"
  ],
  [
    "Which draft revisions have no independent decision?",
    "select policy,version,author from v_approval_queue where decisions=0 order by policy,version"
  ],
  [
    "Which current policies are unassigned to active people?",
    "select p.name,pe.name as unassigned_person from policies p join revisions r on r.policy_id=p.id and r.status='effective' cross join people pe where not p.archived and pe.active and not exists(select 1 from assignments a where a.revision_id=r.id and a.person_id=pe.id) order by p.name,pe.name"
  ],
  [
    "Which people need retention review and still own policies?",
    "select pe.name,pe.retention_review_on,count(p.id)::int as owned_policies from people pe join policies p on p.owner_id=pe.id where pe.retention_review_on is null or pe.retention_review_on<current_date group by pe.id order by pe.name"
  ],
  [
    "Which reviews fall due in the next month while acknowledgements remain open?",
    "select p.name,p.review_on,count(a.id)::int as outstanding from policies p join revisions r on r.policy_id=p.id and r.status='effective' join assignments a on a.revision_id=r.id left join acknowledgements k on k.assignment_id=a.id where p.review_on between current_date and current_date+30 and k.id is null group by p.id order by p.review_on"
  ]
];
export function display(value) {
 if(Array.isArray(value)) {
  if(!value.length)return '(none)';
  if(value[0].question)return value.map(x=>x.question+'\n'+display(x.rows)).join('\n\n');
  return table(value,Object.keys(value[0]).filter(k=>k!=='id').map(key=>({key,label:key,width:52})));
 }
 if(value && typeof value==='object')return Object.entries(value).map(([k,v])=>k+'\n'+(typeof v==='object'?display(v):String(v))).join('\n\n');
 return String(value);
}
export function entity(name) { if(!Object.hasOwn(entities,name))throw Error('Unknown entity. Use: '+Object.keys(entities).join(', ')); return entities[name]; }
export async function resolve(db,name,needle,{exact=false}={}) {
 const spec=entity(name); if(!needle || !String(needle).trim())throw Error('A record reference is required');
 const q=String(needle);
 let rows=await db.query(`select * from ${name} where source_id=$1 or id::text=$1`,[q]);
 if(!rows.length && !exact)rows=await db.query(`select * from ${name} where lower(${spec.label})=lower($1)`,[q]);
 if(!rows.length && !exact)rows=await db.query(`select * from ${name} where starts_with(id::text,$1) or position(lower($1) in lower(${spec.label}))>0 order by source_id`,[q]);
 if(rows.length!==1)throw Error(rows.length?'Ambiguous '+name+':\n'+display(rows.map(r=>({id:r.id,source_id:r.source_id,name:r[spec.label]}))):'No '+name+' matches '+q);
 return rows[0];
}
export function normalise(name,obj) {
 const spec=entity(name);if(!obj || Array.isArray(obj)||typeof obj!=='object')throw Error('Record must be an object');
 const out={};
 for(const [k,v] of Object.entries(obj)) {
  if(!spec.fields.includes(k))throw Error('Unsupported '+name+' field: '+k);
  if(v===null || v===''){out[k]=null;continue;}
  if(['archived','active'].includes(k)) {if(![true,false,'true','false'].includes(v))throw Error(k+' must be true or false');out[k]=v===true||v==='true';}
  else if([].includes(k)) {if(!Number.isFinite(Number(v)))throw Error(k+' must be finite');out[k]=Number(v);}
  else if(k.endsWith('_on')) {if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v))||!Number.isFinite(Date.parse(v+'T00:00:00Z'))||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw Error(k+' must be a real YYYY-MM-DD date');out[k]=v;}
  else out[k]=String(v).trim();
 }
 return out;
}
export async function insert(db,name,obj,{exactRefs=false}={}) {
 const spec=entity(name),data=normalise(name,obj);
 for(const [k,target] of Object.entries(spec.refs||{}))if(data[k])data[k]=(await resolve(db,target,data[k],{exact:exactRefs})).id;
 const keys=Object.keys(data);if(!keys.length)throw Error('Empty record');
 return (await db.query(`insert into ${name} (${keys.join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(data)))[0];
}
export async function transaction(db,fn,{dry=false,actor='operator'}={}) {
 await db.exec('BEGIN');
 try {await db.query("select set_config('policy.actor',$1,true)",[actor]);const result=await fn();await db.exec(dry?'ROLLBACK':'COMMIT');return result;}
 catch(e){await db.exec('ROLLBACK');throw e;}
}

export async function runRead(db,command) {
 if(Object.hasOwn(reads,command))return db.query(reads[command]);
 if(command==='insights'){const out=[];for(const [question,sql] of questions)out.push({question,rows:await db.query(sql)});return out;}
 if(command==='weekly-review')return {reviews:await runRead(db,'review-due'),acknowledgements:await runRead(db,'acknowledgements-due'),exceptions:await runRead(db,'exceptions'),attention:await runRead(db,'attention')};
 throw Error('Unknown read: '+command);
}
export async function policyDetails(db,ref) {
 const p=await resolve(db,'policies',ref);
 return {policy:[p],revisions:await db.query('select source_id,version,body,status,consultation_evidence,effective_on from revisions where policy_id=$1 order by created_at',[p.id]),notes:await db.query('select body,author,created_at from notes where policy_id=$1 order by created_at',[p.id])};
}
export async function makeEffective(db,ref) {
 const r=await resolve(db,'revisions',ref);
 await db.query('select id from policies where id=$1 for update',[r.policy_id]);
 const fresh=await resolve(db,'revisions',r.id);
 if(fresh.status!=='draft')throw Error('Only a draft revision can take effect');
 await db.query("update revisions set status='superseded' where policy_id=$1 and status='effective'",[r.policy_id]);
 return db.query("update revisions set status='effective',effective_on=current_date where id=$1 returning source_id,version,status,effective_on",[r.id]);
}
export function outputFile(folder,name,text) {
 const base=path.resolve(process.env.OUTPUT_DIR||REPO_ROOT,folder);mkdirSync(base,{recursive:true});
 const file=path.join(base,name);writeFileSync(file,text,{flag:'wx'});return file;
}
export async function draft(db,kind,ref) {
 let title,data;
 if(kind==='weekly-review'){title='Weekly policy review';data=await runRead(db,'weekly-review');}
 else if(kind==='review-brief'){const p=await resolve(db,'policies',ref);title='Review brief: '+p.name;data=await policyDetails(db,ref);}
 else if(kind==='reminders'){title='Acknowledgement follow-up preparation';data=await runRead(db,'acknowledgements-due');}
 else throw Error('Unknown draft');
 return {file:outputFile('drafts',kind+'-'+Date.now()+'-'+Math.random().toString(16).slice(2,8)+'.md','# '+title+'\n\nDRAFT. Check evidence and approve separately. Nothing sent.\n\n```text\n'+display(data)+'\n```\n')};
}
export async function exportData(db) {const out={format:'policy-management/v1',exported_at:new Date().toISOString()};for(const name of [...Object.keys(entities),'audit_log'])out[name]=await db.query(`select * from ${name} order by id`);return out;}
