-- Sala do convidado: uma etapa liberada por vez, controlada pela pessoa do apoio com um link próprio (sem login).
alter table public.dinamicas add column if not exists etapa_sala text not null default 'boasvindas' check (etapa_sala in ('boasvindas','votacao','palavras','pesquisa'));
alter table public.dinamicas add column if not exists token_apoio uuid not null default gen_random_uuid();
create unique index if not exists dinamicas_token_apoio_idx on public.dinamicas(token_apoio);

create or replace function public.communicali_sala_estado(p_slug text) returns jsonb
language sql stable security definer set search_path to 'pg_catalog','public' as $$
  select jsonb_build_object('etapa', coalesce(d.etapa_sala,'boasvindas'), 'form_pesquisa', e.form_pesquisa)
    from public.editions e left join public.dinamicas d on d.edition_id = e.id
   where e.slug = lower(btrim(coalesce(p_slug,'')));
$$;

create or replace function public.communicali_apoio_estado(p_token uuid) returns jsonb
language sql stable security definer set search_path to 'pg_catalog','public' as $$
  select jsonb_build_object('titulo', e.titulo, 'etapa', d.etapa_sala,
         'checkins', (select count(*) from public.checkins c where c.edition_id = e.id))
    from public.dinamicas d join public.editions e on e.id = d.edition_id where d.token_apoio = p_token;
$$;

create or replace function public.communicali_apoio_definir(p_token uuid, p_etapa text) returns jsonb
language plpgsql security definer set search_path to 'pg_catalog','public' as $$
declare v_ed uuid; v_slug text;
begin
  if p_etapa not in ('boasvindas','votacao','palavras','pesquisa') then raise exception 'Etapa inválida'; end if;
  select d.edition_id, e.slug into v_ed, v_slug from public.dinamicas d join public.editions e on e.id = d.edition_id where d.token_apoio = p_token;
  if v_ed is null then raise exception 'Link inválido'; end if;
  update public.dinamicas set etapa_sala = p_etapa,
    status_1 = case p_etapa when 'palavras' then 'aberta' when 'pesquisa' then 'encerrada' else status_1 end,
    status_2 = case p_etapa when 'palavras' then 'aberta' when 'pesquisa' then 'encerrada' else status_2 end
   where edition_id = v_ed;
  update public.polls set status = case p_etapa when 'boasvindas' then 'rascunho' when 'votacao' then 'ativa' else 'encerrada' end
   where edition_id = v_ed and slug = v_slug;
  return public.communicali_apoio_estado(p_token);
end $$;

grant execute on function public.communicali_sala_estado(text), public.communicali_apoio_estado(uuid), public.communicali_apoio_definir(uuid, text) to anon, authenticated;
-- Antes de o apoio liberar a votação, ela fica fechada.
update public.polls set status = 'rascunho' where slug = 'fundadora' and not exists (select 1 from public.poll_votes v where v.poll_id = polls.id);
