-- Passaporte: fundadora e organizadores veem o passaporte mesmo sem check-in (para conferir antes do encontro).
CREATE OR REPLACE FUNCTION public.communicali_meu_espaco()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare m public.members%rowtype; v_codigo text; v_conv integer;
begin
  m := public.communicali_eu();
  if m.id is null then return jsonb_build_object('membro', null); end if;
  -- A organização vê o passaporte mesmo antes do primeiro check-in.
  if m.categoria not in ('fundadora', 'organizador') and not exists (select 1 from public.checkins where member_id = m.id) then return jsonb_build_object('membro', null); end if;
  v_codigo := public.communicali_gerar_codigo(m.id);
  select count(*) into v_conv from public.point_events where member_id = m.id and (acao like 'convidado:%' or acao like 'indicacao:%');
  return jsonb_build_object(
    'membro', jsonb_build_object('nome', m.nome, 'apelido', m.apelido, 'email', m.email, 'foto_url', m.foto_url, 'categoria', m.categoria, 'codigo', v_codigo, 'temas', to_jsonb(m.temas), 'interesse_palestras', m.interesse_palestras, 'linkedin', m.linkedin),
    'pontos', coalesce((select sum(pontos) from public.point_events where member_id = m.id), 0),
    'encontros', (select count(*) from public.checkins where member_id = m.id),
    'carimbos', coalesce((select jsonb_agg(jsonb_build_object('slug', e.slug, 'titulo', e.titulo, 'selo', e.selo, 'data_evento', e.data_evento, 'local', e.local, 'cidade', e.cidade, 'capa_url', e.capa_url, 'carimbo_url', e.carimbo_url, 'fotos_url', e.fotos_url) order by e.data_evento)
      from public.checkins c join public.editions e on e.id = c.edition_id where c.member_id = m.id), '[]'::jsonb),
    'proximas', coalesce((select jsonb_agg(jsonb_build_object('slug', e.slug, 'titulo', e.titulo, 'data_evento', e.data_evento, 'horario', e.horario, 'local', e.local, 'cidade', e.cidade, 'capa_url', e.capa_url, 'inscricoes_abertas', e.inscricoes_abertas) order by e.data_evento)
      from public.editions e where e.publica and e.data_evento >= (now() at time zone 'America/Sao_Paulo')::date
        and not exists (select 1 from public.checkins c where c.edition_id = e.id and c.member_id = m.id)), '[]'::jsonb),
    'missoes', (select jsonb_agg(jsonb_build_object('slug', x.slug, 'titulo', x.titulo, 'descricao', x.descricao, 'nivel', x.nivel, 'modo', x.modo,
        'status', case
          when x.slug = 'convidados' and v_conv >= 2 then 'concluida'
          when x.slug = 'lugar' and exists (select 1 from public.recommendations r where r.member_id = m.id and r.tipo = 'lugar' and r.status = 'validada') then 'concluida'
          when x.slug = 'palestra' and exists (select 1 from public.point_events p where p.member_id = m.id and p.acao like 'palestra:%') then 'concluida'
          when x.slug = 'parceiro' and exists (select 1 from public.point_events p where p.member_id = m.id and p.acao like 'parceiro:%') then 'concluida'
          else coalesce((select mm.status from public.member_missions mm where mm.member_id = m.id and mm.mission_slug = x.slug), 'aberta') end) order by x.ordem)
      from public.missions x),
    'indicacoes', coalesce((select jsonb_agg(jsonb_build_object('nome', split_part(i.nome, ' ', 1), 'compareceu', i.compareceu) order by i.criado desc) from (
        select r.nome, r.created_at as criado, exists (select 1 from public.point_events p where p.member_id = m.id and p.acao = 'indicacao:' || r.id::text) as compareceu
          from public.registrations r where r.indicado_por = m.id and r.status <> 'cancelado'
        union all
        select g.nome, g.created_at, g.status = 'presente' from public.guests g where g.member_id = m.id and g.status <> 'cancelado') i), '[]'::jsonb),
    'recomendacoes', coalesce((select jsonb_agg(jsonb_build_object('nome', r.nome, 'tipo', r.tipo, 'status', r.status) order by r.created_at desc) from public.recommendations r where r.member_id = m.id), '[]'::jsonb)
  );
end;
$function$;
