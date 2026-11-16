-- Preparada; não aplicada remotamente. O desenho, os botões e as regras dos e-mails permanecem no renderer existente.
begin;
create table public.email_templates(
 id text primary key check(id ~ '^(edicao|fluxo):[a-z_]+$'),
 rascunho jsonb not null default '{"assunto":"","corpo":""}',
 publicado jsonb,
 version integer not null default 1,
 updated_at timestamptz not null default now(),
 publicado_em timestamptz
);
create function public.validar_email_template()returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
declare c jsonb; v text;
begin
 for c in select new.rascunho union all select new.publicado where new.publicado is not null loop
  if jsonb_typeof(c) is distinct from 'object' or jsonb_typeof(c->'assunto') is distinct from 'string' or jsonb_typeof(c->'corpo') is distinct from 'string' or length(c->>'assunto')>240 or length(c->>'corpo')>12000 or c->>'assunto' ~ E'[\r\n]' then raise exception 'Modelo inválido.';end if;
  for v in select (regexp_matches((c->>'assunto')||' '||(c->>'corpo'),'\{\{\s*([^}]+?)\s*\}\}','g'))[1] loop
   if btrim(v) not in ('nome','encontro','data','horario','local','motivo','prazo','visitas') then raise exception 'Variável desconhecida.';end if;
  end loop;
 end loop;
 new.updated_at:=now();if tg_op='UPDATE' then new.version:=old.version+1;if new.publicado is distinct from old.publicado then new.publicado_em:=case when new.publicado is null then null else now() end;else new.publicado_em:=old.publicado_em;end if;
 else new.version:=1;new.publicado_em:=case when new.publicado is null then null else now() end;end if;return new;
end $$;
revoke all on function public.validar_email_template() from public;
create trigger validar_email_template before insert or update on public.email_templates for each row execute function public.validar_email_template();
alter table public.email_templates enable row level security;
create policy email_templates_admin on public.email_templates for all to authenticated using(public.is_admin()) with check(public.is_admin());
revoke all on public.email_templates from anon,authenticated;
grant select,insert,update on public.email_templates to authenticated;
grant all on public.email_templates to service_role;
create table public.email_activity(
 id uuid primary key default gen_random_uuid(),email text not null,modelo text not null,edition_id uuid references public.editions(id) on delete set null,
 assunto text not null,situacao text not null check(situacao in ('enviado','erro')),resend_id text,erro text,
 entrega text,aberto_em timestamptz,clicado_em timestamptz,created_at timestamptz not null default now()
);
create index email_activity_data on public.email_activity(created_at desc);
alter table public.email_activity enable row level security;
create policy email_activity_admin_read on public.email_activity for select to authenticated using(public.is_admin());
revoke all on public.email_activity from anon,authenticated;
grant select on public.email_activity to authenticated;
grant all on public.email_activity to service_role;
commit;
