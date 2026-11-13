-- Lista da recepção no link da equipe de apoio: quem está confirmado, com busca e marcação de chegada, sem login (pelo token do apoio).
alter table public.registrations add column if not exists chegou_em timestamptz;
alter table public.guests add column if not exists chegou_em timestamptz;

create or replace function public.communicali_apoio_lista(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path to 'pg_catalog','public' as $$
declare v_ed uuid;
begin
  select d.edition_id into v_ed from public.dinamicas d where d.token_apoio = p_token;
  if v_ed is null then return null; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('fonte', x.fonte, 'id', x.id, 'nome', x.nome, 'categoria', x.categoria, 'email', x.email, 'chegou_em', x.chegou_em) order by x.nome)
    from (
      with base as (
        select 'form'::text fonte, fr.id, coalesce(fr.categoria, 'Participante') categoria,
          btrim(coalesce(fr.respondent_name, '') || case when nullif(btrim(fr.answers ->> 'sobrenome'), '') is not null and position(lower(btrim(fr.answers ->> 'sobrenome')) in lower(coalesce(fr.respondent_name, ''))) = 0 then ' ' || btrim(fr.answers ->> 'sobrenome') else '' end) nome,
          lower(btrim(fr.respondent_email)) email, public.communicali_situacao_etapa(fr.stage) situacao, fr.chegou_em proprio
          from public.form_responses fr join public.forms f on f.id = fr.form_id join public.editions e on e.form_inscricao = f.slug where e.id = v_ed
        union all
        select 'registro', r.id, coalesce(r.categoria, case when r.indicado_por is null then 'Participante' else 'Convidado' end), r.nome, lower(btrim(r.email)),
          public.communicali_situacao_registro(r.status, r.situacao), r.chegou_em
          from public.registrations r where r.edition_id = v_ed
        union all
        select 'convidado', g.id, coalesce(g.categoria, 'Convidado'), g.nome, lower(btrim(g.email)), public.communicali_situacao_convidado(g.status, g.situacao), g.chegou_em
          from public.guests g where g.edition_id = v_ed
        union all
        select 'manual', k.id, k.categoria, k.nome, lower(nullif(btrim(k.email), '')), k.situacao, k.chegou_em
          from public.edition_kids k where k.edition_id = v_ed
        union all
        select 'organizacao', m.id, 'Organização', m.nome, lower(m.email), 'confirmado', null::timestamptz
          from public.members m where m.categoria in ('fundadora', 'organizador')
      )
      select b.fonte, b.id, b.categoria, b.nome, b.email,
        coalesce((select min(c.checked_in_at) from public.checkins c join public.members m on m.id = c.member_id where b.email is not null and lower(m.email) = b.email and c.edition_id = v_ed), b.proprio) chegou_em
      from base b where b.situacao = 'confirmado'
    ) x), '[]'::jsonb);
end $$;

create or replace function public.communicali_apoio_chegada(p_token uuid, p_fonte text, p_id uuid, p_chegou boolean) returns boolean
language plpgsql volatile security definer set search_path to 'pg_catalog','public' as $$
declare v_ed uuid; v timestamptz := case when p_chegou then now() end; n integer := 0;
begin
  select d.edition_id into v_ed from public.dinamicas d where d.token_apoio = p_token;
  if v_ed is null then raise exception 'Link inválido'; end if;
  if p_fonte = 'form' then
    update public.form_responses fr set chegou_em = case when p_chegou then coalesce(fr.chegou_em, v) end
      from public.forms f join public.editions e on e.form_inscricao = f.slug where fr.id = p_id and f.id = fr.form_id and e.id = v_ed;
  elsif p_fonte = 'manual' then update public.edition_kids set chegou_em = case when p_chegou then coalesce(chegou_em, v) end where id = p_id and edition_id = v_ed;
  elsif p_fonte = 'registro' then update public.registrations set chegou_em = case when p_chegou then coalesce(chegou_em, v) end where id = p_id and edition_id = v_ed;
  elsif p_fonte = 'convidado' then update public.guests set chegou_em = case when p_chegou then coalesce(chegou_em, v) end where id = p_id and edition_id = v_ed;
  else raise exception 'Esta pessoa não pode ser marcada aqui.';
  end if;
  get diagnostics n = row_count;
  return n > 0;
end $$;

grant execute on function public.communicali_apoio_lista(uuid), public.communicali_apoio_chegada(uuid, text, uuid, boolean) to anon, authenticated;
