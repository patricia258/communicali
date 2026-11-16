-- Preparada para revisão. Não aplicar em produção junto da demonstração estática.
begin;
create table public.edition_albums (
 edition_id uuid primary key references public.editions(id) on delete cascade,
 album_url text check (album_url is null or (length(album_url) <= 2048)),
 publicado boolean not null default false,
 updated_at timestamptz not null default now()
);
create table public.edition_album_photos (
 id uuid primary key default gen_random_uuid(),
 edition_id uuid not null references public.editions(id) on delete cascade,
 storage_path text not null unique,
 legenda text not null default '',
 public_preview boolean not null default false,
 ordem integer not null default 0,
 created_at timestamptz not null default now(),
 check (storage_path like edition_id::text || '/%')
);
create table public.edition_album_clicks (
 request_id uuid primary key,
 edition_id uuid not null references public.editions(id) on delete cascade,
 member_id uuid not null references public.members(id) on delete cascade,
 email_informado text not null,
 tipo text not null check(tipo in ('galeria','album')),
 created_at timestamptz not null default now()
);
alter table public.edition_album_clicks add column ciente_em timestamptz;
create index edition_album_clicks_edition on public.edition_album_clicks(edition_id, member_id);
alter table public.edition_albums enable row level security;
alter table public.edition_album_photos enable row level security;
alter table public.edition_album_clicks enable row level security;
create policy albums_admin on public.edition_albums for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy album_photos_admin on public.edition_album_photos for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy album_clicks_admin on public.edition_album_clicks for select to authenticated using (public.is_admin());
revoke all on public.edition_albums, public.edition_album_photos, public.edition_album_clicks from anon, authenticated;
grant select, insert, update, delete on public.edition_albums, public.edition_album_photos to authenticated;
grant select on public.edition_album_clicks to authenticated;
grant all on public.edition_albums, public.edition_album_photos, public.edition_album_clicks to service_role;
create view public.edition_album_stats with (security_invoker = true) as
 select edition_id, count(*) filter(where tipo='album')::integer as cliques, count(distinct email_informado) filter(where tipo='album')::integer as pessoas, count(*) filter(where tipo='galeria')::integer as visualizacoes from public.edition_album_clicks group by edition_id;
create view public.edition_album_email_stats with (security_invoker=true) as
 select edition_id,email_informado,count(*) filter(where tipo='galeria')::integer as galeria,count(*) filter(where tipo='album')::integer as album,max(created_at) as ultimo_acesso,min(ciente_em) filter(where tipo='album') as ciente_em from public.edition_album_clicks group by edition_id,email_informado;
revoke all on public.edition_album_email_stats from anon;
grant select on public.edition_album_email_stats to authenticated,service_role;
revoke all on public.edition_album_stats from anon;
grant select on public.edition_album_stats to authenticated, service_role;
-- Exclusiva do servidor. Apenas check-in validado, na edição solicitada, conta como presença.
create function public.communicali_album_presenca(p_slug text, p_email text) returns jsonb
language sql stable security invoker set search_path = pg_catalog, public as $$
 select jsonb_build_object('edition_id', e.id, 'member_id', m.id)
 from public.editions e join public.checkins c on c.edition_id=e.id join public.members m on m.id=c.member_id
 where e.publica and e.slug=p_slug and lower(btrim(m.email))=lower(btrim(p_email)) limit 1
$$;
revoke all on function public.communicali_album_presenca(text,text) from public, anon, authenticated;
grant execute on function public.communicali_album_presenca(text,text) to service_role;
-- Preserva links anteriores em área privada; elimina a exposição nos SELECTs e RPCs antigos.
insert into public.edition_albums(edition_id,album_url,publicado)
 select id,fotos_url,(fotos_url ~ '^https://') from public.editions where fotos_url is not null;
update public.editions set fotos_url=null where fotos_url is not null;
alter table public.editions add constraint editions_album_link_privado check (fotos_url is null);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values ('edition-albums','edition-albums',false,10485760,array['image/jpeg','image/png','image/webp']) on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;
create policy album_objects_admin on storage.objects for all to authenticated
 using (bucket_id='edition-albums' and public.is_admin())
 with check (bucket_id='edition-albums' and public.is_admin());
commit;
