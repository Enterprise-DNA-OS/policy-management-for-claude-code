create table people (id uuid primary key default gen_random_uuid(), source_id text not null unique check(length(trim(source_id))>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), name text not null check(trim(name)<>''), department text not null, email text, active boolean not null default true, retention_review_on date);
create table policies (id uuid primary key default gen_random_uuid(), source_id text not null unique check(length(trim(source_id))>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), name text not null check(trim(name)<>''), owner_id uuid not null references people(id), category text not null check(category in ('safety','privacy','operations','conduct')), review_on date not null, archived boolean not null default false);
create table revisions (id uuid primary key default gen_random_uuid(), source_id text not null unique check(length(trim(source_id))>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), policy_id uuid not null references policies(id), name text not null, version text not null, author_id uuid not null references people(id), body text not null check(trim(body)<>''), status text not null default 'draft' check(status in ('draft','effective','superseded')), consultation_evidence text, effective_on date, unique(policy_id,version), check(status='draft' or effective_on is not null));
create table approvals (id uuid primary key default gen_random_uuid(), source_id text not null unique check(length(trim(source_id))>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), revision_id uuid not null references revisions(id), approver_id uuid not null references people(id), decision text not null check(decision in ('approved','rejected')), evidence text not null check(trim(evidence)<>''), decided_on date not null default current_date, unique(revision_id,approver_id));
create table assignments (id uuid primary key default gen_random_uuid(), source_id text not null unique check(length(trim(source_id))>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), revision_id uuid not null references revisions(id), person_id uuid not null references people(id), due_on date not null, unique(revision_id,person_id));
create table acknowledgements (id uuid primary key default gen_random_uuid(), source_id text not null unique check(length(trim(source_id))>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), assignment_id uuid not null unique references assignments(id), acknowledged_on date not null default current_date, evidence text not null check(trim(evidence)<>''), recorded_by text not null check(trim(recorded_by)<>''));
create table exceptions (id uuid primary key default gen_random_uuid(), source_id text not null unique check(length(trim(source_id))>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), policy_id uuid not null references policies(id), person_id uuid not null references people(id), name text not null, reason text not null check(trim(reason)<>''), expires_on date not null, status text not null default 'open' check(status in ('open','closed')), resolution text, check(status='open' or coalesce(length(trim(resolution)),0)>0));
create table notes (id uuid primary key default gen_random_uuid(), source_id text not null unique check(length(trim(source_id))>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), policy_id uuid not null references policies(id), body text not null check(trim(body)<>''), author text not null);
create unique index one_effective_revision on revisions(policy_id) where status='effective';
create table audit_log(id uuid primary key default gen_random_uuid(), entity text not null, record_id uuid not null, action text not null, actor text not null, before_row jsonb, after_row jsonb, created_at timestamptz not null default now());
create function touch_record() returns trigger language plpgsql as $$begin new.updated_at=clock_timestamp(); return new; end$$;
create function audit_record() returns trigger language plpgsql as $$begin insert into audit_log(entity,record_id,action,actor,before_row,after_row) values(TG_TABLE_NAME,coalesce(new.id,old.id),TG_OP,coalesce(nullif(current_setting('policy.actor',true),''),'database-owner'),case when TG_OP<>'INSERT' then to_jsonb(old) end,case when TG_OP<>'DELETE' then to_jsonb(new) end);return coalesce(new,old);end$$;
create function immutable_record() returns trigger language plpgsql as $$begin raise exception 'Evidence is immutable; add a new version or corrective note';end$$;
create function guard_revision() returns trigger language plpgsql as $$begin
 if TG_OP='UPDATE' then
  if (old.status<>'draft' or exists(select 1 from approvals where revision_id=old.id)) and
     (new.body,new.version,new.author_id,new.policy_id,new.consultation_evidence,new.name) is distinct from (old.body,old.version,old.author_id,old.policy_id,old.consultation_evidence,old.name) then raise exception 'Approved or released content is immutable';end if;
  if old.status='superseded' and new is distinct from old then raise exception 'Superseded version is immutable';end if;
  if old.status='effective' and new.status not in ('effective','superseded') then raise exception 'Cannot reset effective version';end if;
 end if;
 if new.status='effective' and (TG_OP='INSERT' or old.status<>'effective') then
  if not exists(select 1 from approvals where revision_id=new.id and decision='approved') or exists(select 1 from approvals where revision_id=new.id and decision='rejected') then raise exception 'Independent approval required; rejected versions need a new revision';end if;
  if exists(select 1 from policies where id=new.policy_id and archived) then raise exception 'Archived policy cannot take effect';end if;
  if exists(select 1 from policies where id=new.policy_id and category='safety') and coalesce(trim(new.consultation_evidence),'')='' then raise exception 'Safety policy requires consultation evidence';end if;
  if new.effective_on>current_date then raise exception 'Effective date cannot be in the future';end if;
 end if;return new;end$$;
create trigger revision_guard before insert or update on revisions for each row execute function guard_revision();
create function guard_evidence() returns trigger language plpgsql as $$declare r revisions; a assignments;begin
 if TG_TABLE_NAME='approvals' then
  select * into r from revisions where id=new.revision_id for update;
  if r.status<>'draft' then raise exception 'Approval requires a draft version';end if;
  if new.approver_id=r.author_id then raise exception 'Independent approver required';end if;
  if not exists(select 1 from people where id=new.approver_id and active) then raise exception 'Approver must be active';end if;
  if new.decided_on>current_date then raise exception 'Future approval date';end if;
 elsif TG_TABLE_NAME='assignments' then
  select * into r from revisions where id=new.revision_id for update;
  if r.status<>'effective' then raise exception 'Assignment requires effective version';end if;
  if not exists(select 1 from people where id=new.person_id and active) then raise exception 'Recipient must be active';end if;
 else
  select * into a from assignments where id=new.assignment_id;
  select * into r from revisions where id=a.revision_id for update;
  if r.status<>'effective' then raise exception 'Acknowledgement requires current effective version';end if;
  if new.acknowledged_on>current_date or new.acknowledged_on<r.effective_on then raise exception 'Acknowledgement date outside effective period';end if;
 end if;return new;end$$;
create trigger approval_guard before insert on approvals for each row execute function guard_evidence();
create trigger assignment_guard before insert on assignments for each row execute function guard_evidence();
create trigger acknowledgement_guard before insert on acknowledgements for each row execute function guard_evidence();
create trigger audit_immutable before update or delete on audit_log for each row execute function immutable_record();

create trigger touch before update on people for each row execute function touch_record();
create trigger audit after insert or update or delete on people for each row execute function audit_record();
alter table people enable row level security;
revoke all on people from public;
create trigger touch before update on policies for each row execute function touch_record();
create trigger audit after insert or update or delete on policies for each row execute function audit_record();
alter table policies enable row level security;
revoke all on policies from public;
create trigger touch before update on revisions for each row execute function touch_record();
create trigger audit after insert or update or delete on revisions for each row execute function audit_record();
alter table revisions enable row level security;
revoke all on revisions from public;
create trigger touch before update on approvals for each row execute function touch_record();
create trigger audit after insert or update or delete on approvals for each row execute function audit_record();
alter table approvals enable row level security;
revoke all on approvals from public;
create trigger touch before update on assignments for each row execute function touch_record();
create trigger audit after insert or update or delete on assignments for each row execute function audit_record();
alter table assignments enable row level security;
revoke all on assignments from public;
create trigger touch before update on acknowledgements for each row execute function touch_record();
create trigger audit after insert or update or delete on acknowledgements for each row execute function audit_record();
alter table acknowledgements enable row level security;
revoke all on acknowledgements from public;
create trigger touch before update on exceptions for each row execute function touch_record();
create trigger audit after insert or update or delete on exceptions for each row execute function audit_record();
alter table exceptions enable row level security;
revoke all on exceptions from public;
create trigger touch before update on notes for each row execute function touch_record();
create trigger audit after insert or update or delete on notes for each row execute function audit_record();
alter table notes enable row level security;
revoke all on notes from public;
create trigger evidence_immutable before update or delete on approvals for each row execute function immutable_record();
create trigger evidence_immutable before update or delete on assignments for each row execute function immutable_record();
create trigger evidence_immutable before update or delete on acknowledgements for each row execute function immutable_record();
create trigger evidence_immutable before update or delete on notes for each row execute function immutable_record();
alter table audit_log enable row level security;
revoke all on audit_log from public;
create view v_register with (security_invoker=true) as
 select p.id,p.source_id,p.name,p.category,o.name as owner,p.review_on,p.review_on-current_date as review_days,r.id as revision_id,r.version,r.effective_on,p.archived from policies p join people o on o.id=p.owner_id left join revisions r on r.policy_id=p.id and r.status='effective';
create view v_acknowledgements with (security_invoker=true) as
 select a.id,a.source_id,p.name as policy,r.version,r.status as version_status,pe.name as person,pe.department,a.due_on,g.acknowledged_on,case when g.id is null then greatest(0,current_date-a.due_on) else 0 end as days_overdue,g.evidence from assignments a join revisions r on r.id=a.revision_id join policies p on p.id=r.policy_id join people pe on pe.id=a.person_id left join acknowledgements g on g.assignment_id=a.id;
create view v_review_queue with (security_invoker=true) as select * from v_register where not archived and review_on<=current_date+30;
create view v_approval_queue with (security_invoker=true) as select r.id,r.source_id,p.name as policy,r.version,a.name as author,count(ap.id)::int as decisions,count(ap.id) filter(where ap.decision='approved')::int as approvals,count(ap.id) filter(where ap.decision='rejected')::int as rejections from revisions r join policies p on p.id=r.policy_id join people a on a.id=r.author_id left join approvals ap on ap.revision_id=r.id where r.status='draft' group by r.id,p.name,a.name;
create view v_compliance with (security_invoker=true) as
 select 'POL-01'::text as rule,p.source_id as reference,'Policy review overdue'::text as issue from policies p where not archived and review_on<current_date
 union all select 'NZ-HSWA-01',r.source_id,'Safety version lacks consultation evidence' from revisions r join policies p on p.id=r.policy_id where p.category='safety' and r.status<>'superseded' and coalesce(trim(r.consultation_evidence),'')=''
 union all select 'NZ-IPP9',source_id,'Personal record retention review due' from people where retention_review_on is null or retention_review_on<current_date
 union all select 'POL-02',p.source_id,'Policy owner is inactive' from policies p join people pe on pe.id=p.owner_id where not p.archived and not pe.active
 union all select 'POL-03',source_id,'Policy exception expired' from exceptions where status='open' and expires_on<current_date;
create view v_attention with (security_invoker=true) as
 select rule as kind,reference,issue from v_compliance
 union all select 'ACK',source_id,'Acknowledgement overdue: '||person||' / '||policy from v_acknowledgements where acknowledged_on is null and days_overdue>0 and version_status='effective'
 union all select 'NO-VERSION',source_id,'No effective version: '||name from v_register where version is null and not archived;
