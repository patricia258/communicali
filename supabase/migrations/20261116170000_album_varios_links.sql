-- Vários links por álbum (fotos, vídeos...), cada um com o nome do botão, e contagem de acessos por link.
alter table public.edition_albums add column if not exists links jsonb not null default '[]'::jsonb;

create or replace function public.validar_album_links() returns trigger language plpgsql security invoker set search_path = pg_catalog, public as $$
declare item jsonb; ids text[] := '{}';
begin
  if jsonb_typeof(new.links) is distinct from 'array' or jsonb_array_length(new.links) > 6 then raise exception 'Use até 6 links.'; end if;
  for item in select value from jsonb_array_elements(new.links) loop
    if jsonb_typeof(item) is distinct from 'object' then raise exception 'Link inválido.'; end if;
    if coalesce(item->>'id','') !~ '^[a-z0-9-]{1,40}$' then raise exception 'Identificador de link inválido.'; end if;
    if (item->>'id') = any(ids) then raise exception 'Identificador de link repetido.'; end if;
    ids := array_append(ids, item->>'id');
    if char_length(btrim(coalesce(item->>'rotulo',''))) not between 1 and 60 then raise exception 'O nome do botão precisa ter de 1 a 60 letras.'; end if;
    if coalesce(item->>'url','') !~ '^https://[^\s@]+$' or char_length(item->>'url') > 2048 then raise exception 'Use um link começando com https://.'; end if;
  end loop;
  return new;
end $$;
drop trigger if exists validar_album_links on public.edition_albums;
create trigger validar_album_links before insert or update on public.edition_albums for each row execute function public.validar_album_links();

update public.edition_albums
   set links = jsonb_build_array(jsonb_build_object('id','fotos','rotulo','Acesse aqui as suas fotos','url',album_url))
 where album_url is not null and album_url ~ '^https://[^\s@]+$' and links = '[]'::jsonb;

alter table public.edition_album_clicks add column if not exists link_id text;

create or replace view public.edition_album_link_stats with (security_invoker = true) as
  select edition_id, coalesce(link_id, 'fotos') as link_id,
         count(*) filter (where tipo = 'album')::integer as cliques,
         count(distinct email_informado) filter (where tipo = 'album')::integer as pessoas
    from public.edition_album_clicks group by edition_id, coalesce(link_id, 'fotos');
revoke all on public.edition_album_link_stats from anon;
grant select on public.edition_album_link_stats to authenticated, service_role;

create or replace view public.edition_album_email_link_stats with (security_invoker = true) as
  select edition_id, email_informado, coalesce(link_id, 'fotos') as link_id, count(*)::integer as cliques
    from public.edition_album_clicks where tipo = 'album' group by edition_id, email_informado, coalesce(link_id, 'fotos');
revoke all on public.edition_album_email_link_stats from anon;
grant select on public.edition_album_email_link_stats to authenticated, service_role;
