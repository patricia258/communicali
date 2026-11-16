begin;
create table public.site_content_drafts (
 id text primary key check(id='home'),
 conteudo jsonb not null default '{}'::jsonb,
 versao integer not null default 1,
 updated_at timestamptz not null default now()
);
create table public.site_content_published (
 id text primary key check(id='home'),
 conteudo jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
create function public.validate_site_content() returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 if jsonb_typeof(new.conteudo) <> 'object' then raise exception 'Conteúdo inválido'; end if;
 if (select count(*) from jsonb_each(new.conteudo)) > 250 or exists(select 1 from jsonb_each(new.conteudo) as v where length(v.key)>100 or jsonb_typeof(v.value)<>'string' or length(v.value #>> '{}')>5000) then raise exception 'Conteúdo inválido'; end if;
 if tg_table_name='site_content_drafts' and tg_op='UPDATE' then new.versao := old.versao+1; end if;
 new.updated_at := now();
 return new;
end $$;
create trigger validate_home_draft before insert or update on public.site_content_drafts for each row execute function public.validate_site_content();
create trigger validate_home_published before insert or update on public.site_content_published for each row execute function public.validate_site_content();
alter table public.site_content_drafts enable row level security;
alter table public.site_content_published enable row level security;
create policy content_drafts_admin on public.site_content_drafts for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy content_public_read on public.site_content_published for select to anon,authenticated using(true);
create policy content_publish_admin on public.site_content_published for all to authenticated using(public.is_admin()) with check(public.is_admin());
revoke all on public.site_content_drafts,public.site_content_published from anon,authenticated;
grant select,insert,update on public.site_content_drafts,public.site_content_published to authenticated;
grant select on public.site_content_published to anon;
grant all on public.site_content_drafts,public.site_content_published to service_role;
insert into public.site_content_drafts(id) values('home');
create function public.publish_site_home(p_versao integer) returns void language plpgsql security invoker set search_path=pg_catalog,public as $$
declare dados jsonb;
begin
 if not public.is_admin() then raise exception 'Acesso negado'; end if;
 select conteudo into dados from public.site_content_drafts where id='home' and versao=p_versao for update;
 if not found then raise exception 'O conteúdo foi atualizado. Recarregue a página.'; end if;
 insert into public.site_content_published(id,conteudo) values('home',dados) on conflict(id) do update set conteudo=excluded.conteudo;
end $$;
revoke all on function public.publish_site_home(integer) from public,anon;
grant execute on function public.publish_site_home(integer) to authenticated;
commit;
