import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
// Dependência exclusiva de teste: PG_TEST_MODULE=/caminho/para/@electric-sql/pglite
const { PGlite } = require(process.env.PG_TEST_MODULE || '@electric-sql/pglite');
const db = new PGlite(); let checks = 0;
const ok = (v) => { assert.ok(v); checks++; };
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
await db.exec(`create role anon; create role authenticated; create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.members(id uuid primary key,status text,categoria text);
create table public.partners(id uuid primary key,nome text,logo_url text,site_url text,ativo boolean,segredo text);
create table public.editions(id uuid primary key,capacidade integer);
create table public.registrations(id uuid primary key,edition_id uuid references public.editions(id),status text);
create function public.communicali_eu() returns public.members language sql stable security definer as $$select m from public.members m where id=auth.uid() and status='ativo'$$;
grant usage on schema auth to authenticated, anon; grant execute on function auth.uid() to authenticated,anon;
insert into public.members values ('${id(1)}','ativo','membro'),('${id(2)}','ativo','conector'),('${id(3)}','inativo','membro'),('${id(4)}','ativo','convidado'),('${id(5)}','ativo',null),('${id(6)}','ativo','kids');
insert into public.partners values ('${id(10)}','Empresa B',null,'https://example.com',true,'contato privado'),('${id(11)}','Empresa A',null,null,true,'negociação'),('${id(12)}','Inativa',null,null,false,'oculta');
insert into public.editions values ('${id(20)}',1),('${id(21)}',null),('${id(22)}',0);
insert into public.registrations values ('${id(30)}','${id(20)}','analise'),('${id(31)}','${id(20)}','analise');`);
for (const name of ['v21_vitrine_parceiros_membros.sql','v21_capacidade_confirmacoes.sql']) await db.exec(readFileSync(new URL(`../../docs/sql/${name}`,import.meta.url),'utf8'));
async function login(n, role='authenticated') { await db.exec(`reset role;set role ${role};select set_config('request.jwt.claim.sub','${n ? id(n) : ''}',false);`); }
async function fail(sql) { await assert.rejects(db.query(sql)); checks++; }
await login(null,'anon'); await fail('select public.communicali_parceiros_membros()');
await login(null); await fail('select public.communicali_parceiros_membros()');
for (const n of [3,4,5,6,999]) { await login(n); await fail('select public.communicali_parceiros_membros()'); }
for (const n of [1,2]) {
 await login(n); const d=(await db.query('select public.communicali_parceiros_membros() as d')).rows[0].d;
 ok(d.versao===1 && d.parceiros.length===2); ok(d.parceiros[0].nome==='Empresa A');
 ok(Object.keys(d.parceiros[0]).sort().join(',')==='id,logo_url,nome,site_url');
 ok(!JSON.stringify(d).includes('segredo') && !JSON.stringify(d).includes('contato privado'));
 await fail('select * from public.members'); await fail('update public.partners set ativo=false');
}
await db.exec('reset role');
ok((await db.query('select count(*)::int n from public.registrations')).rows[0].n===2);
await db.exec(`update public.registrations set status='inscrito' where id='${id(30)}'`);
await fail(`update public.registrations set status='inscrito' where id='${id(31)}'`);
ok((await db.query(`select status from public.registrations where id='${id(31)}'`)).rows[0].status==='analise');
await db.exec(`update public.registrations set status='inscrito' where id='${id(30)}'`);checks++;
await fail(`insert into public.registrations values ('${id(32)}','${id(20)}','inscrito')`);
await db.exec(`update public.registrations set status='espera' where id='${id(31)}'`);checks++;
await db.exec(`update public.registrations set status='cancelado' where id='${id(30)}';update public.registrations set status='inscrito' where id='${id(31)}'`);checks++;
await fail(`insert into public.registrations values ('${id(33)}','${id(22)}','inscrito')`);
await db.exec(`insert into public.registrations values ('${id(34)}','${id(21)}','inscrito')`);checks++;
await fail(`update public.registrations set edition_id='${id(20)}' where id='${id(34)}'`);
ok((await db.query(`select edition_id from public.registrations where id='${id(34)}'`)).rows[0].edition_id===id(21));
console.log(`${checks} verificações SQL aprovadas; banco isolado, sem dados reais. Concorrência entre conexões reais ainda requer PostgreSQL de homologação.`);
await db.close();
