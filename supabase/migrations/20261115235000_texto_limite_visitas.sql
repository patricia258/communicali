-- Ajusta o texto do limite de 2 visitas (v23)
CREATE OR REPLACE FUNCTION public.communicali_registrar_presenca(p_edition uuid, p_member uuid, p_origem text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_id uuid; v_codigo text; m public.members%rowtype; e public.editions%rowtype; v_junto jsonb;
begin
  select * into e from public.editions where id = p_edition;
  select * into m from public.members where id = p_member;
  -- Regras v23: até 2 presenças antes da adesão aprovada, só em atividade aberta e gratuita.
  if m.adesao_status is distinct from 'aprovada' and e.elegivel_pre_membro
     and not exists (select 1 from public.checkins where edition_id = p_edition and member_id = p_member)
     and public.communicali_presencas_pre_membro(p_member) >= 2 then
    raise exception 'Você já fez as 2 visitas abertas e gratuitas antes de fazer parte da comunidade. Para continuar, peça para fazer parte da comunidade.';
  end if;
  insert into public.checkins (edition_id, member_id, origem) values (p_edition, p_member, p_origem)
  on conflict (edition_id, member_id) do nothing returning id into v_id;
  -- Milhas só depois da adesão aprovada; a presença anterior fica no histórico, sem crédito retroativo.
  if m.adesao_status = 'aprovada' then
    insert into public.point_events (member_id, edition_id, acao, pontos) values (p_member, p_edition, 'presenca', 10)
    on conflict (member_id, edition_id, acao) do nothing;
  end if;
  if m.adesao_status is distinct from 'aprovada' and m.estagio_entrada is null then
    update public.members set estagio_entrada = case when exists (select 1 from public.guests g where g.edition_id = p_edition and g.email = lower(m.email) and g.status in ('inscrito', 'confirmado', 'presente')) then 'convidado' else 'visitante' end
     where id = p_member;
  end if;
  update public.members set cracha_status = 'disponivel', updated_at = now() where id = p_member and cracha_status = 'nao_disponivel';
  select * into m from public.members where id = p_member;
  perform public.communicali_creditar_convidado(p_edition, m.email);
  perform public.communicali_creditar_indicacao(p_edition, p_member, m.email);
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'tipo', x.tipo, 'nome', x.nome, 'chegou', x.chegou) order by x.nome), '[]'::jsonb) into v_junto from (
    select k.id, 'kids' tipo, k.nome, k.chegou_em is not null chegou from public.edition_kids k
     where k.edition_id = p_edition and lower(btrim(k.responsavel_email)) = lower(m.email) and k.situacao <> 'nao_vai'
    union all
    select fr.id, 'form', btrim(fr.respondent_name || coalesce(' ' || nullif(btrim(fr.answers ->> 'sobrenome'), ''), '')), fr.chegou_em is not null
      from public.form_responses fr join public.forms f on f.id = fr.form_id where f.slug = e.form_inscricao and lower(btrim(fr.junto_com_email)) = lower(m.email)
  ) x;
  select codigo into v_codigo from public.checkins where edition_id = p_edition and member_id = p_member;
  return jsonb_build_object('nome', coalesce(nullif(m.apelido, ''), m.nome), 'categoria', case when m.adesao_status = 'aprovada' then m.categoria else coalesce(m.estagio_entrada, 'visitante') end, 'edicao', e.titulo, 'selo', e.selo, 'codigo', v_codigo, 'repetido', v_id is null, 'junto', v_junto);
end;
$function$
;
