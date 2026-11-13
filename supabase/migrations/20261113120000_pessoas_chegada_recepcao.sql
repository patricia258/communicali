-- Hora de chegada marcada pela recepção também aparece no painel para quem veio do site e por convite.
CREATE OR REPLACE FUNCTION public.communicali_pessoas_edicao(p_edition uuid)
 RETURNS TABLE(fonte text, id uuid, categoria text, nome text, email text, whatsapp text, situacao text, detalhe text, vezes integer, criado_em timestamp with time zone, nivel text, nota text, chegou_em timestamp with time zone, convidado_de text, junto_com text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare v_rotulo text := public.communicali_rotulo_edicao(p_edition);
begin
  if not public.is_admin() then raise exception 'Acesso restrito.'; end if;
  return query
  with base as (
    select 'form'::text fonte, fr.id, coalesce(fr.categoria, 'Participante') categoria,
      btrim(coalesce(fr.respondent_name, '') || case when nullif(btrim(fr.answers ->> 'sobrenome'), '') is not null and position(lower(btrim(fr.answers ->> 'sobrenome')) in lower(coalesce(fr.respondent_name, ''))) = 0 then ' ' || btrim(fr.answers ->> 'sobrenome') else '' end) nome,
      lower(btrim(fr.respondent_email)) email,
      fr.answers ->> (select q ->> 'id' from jsonb_array_elements(f.questions) q where q ->> 'kind' = 'phone' limit 1) whatsapp,
      public.communicali_situacao_etapa(fr.stage) situacao, 'Formulário de inscrição'::text detalhe, fr.submitted_at criado_em, fr.admin_note nota,
      fr.chegou_em proprio, fr.convidado_de, lower(btrim(fr.junto_com_email)) junto_email
      from public.form_responses fr join public.forms f on f.id = fr.form_id join public.editions e on e.form_inscricao = f.slug where e.id = p_edition
    union all
    select 'registro', r.id, coalesce(r.categoria, case when r.indicado_por is null then 'Participante' else 'Convidado' end), r.nome, r.email, r.whatsapp,
      public.communicali_situacao_registro(r.status, r.situacao),
      case when r.indicado_por is null then 'Página do site' else 'Link de convite' end || case when r.status = 'espera' and r.situacao is null then ' · lista de espera' else '' end,
      r.created_at, r.nota, r.chegou_em, coalesce(r.convidado_de, (select m.nome from public.members m where m.id = r.indicado_por)), null::text
      from public.registrations r where r.edition_id = p_edition
    union all
    select 'convidado', g.id, coalesce(g.categoria, 'Convidado'), g.nome, g.email, null, public.communicali_situacao_convidado(g.status, g.situacao),
      'Convite pelo passaporte', g.created_at, g.nota, g.chegou_em, coalesce(g.convidado_de, (select m.nome from public.members m where m.id = g.member_id)), null::text
      from public.guests g where g.edition_id = p_edition
    union all
    select 'manual', k.id, k.categoria, k.nome, lower(nullif(btrim(k.email), '')), k.whatsapp, k.situacao,
      concat_ws(' · ', 'Adicionado à mão', k.funcao, case when k.idade is not null then k.idade || ' anos' end, case when k.responsavel is not null then 'Responsável: ' || k.responsavel end), k.created_at, k.nota,
      k.chegou_em, k.convidado_de, lower(btrim(k.responsavel_email))
      from public.edition_kids k where k.edition_id = p_edition
    union all
    select * from (select distinct on (s.cpf) 'staff', s.id, 'Staff', s.nome, s.email, s.whatsapp, 'confirmado', s.funcao, s.created_at, null::text, null::timestamptz, null::text, null::text
      from public.staff s where v_rotulo = any(s.eventos) order by s.cpf, s.created_at desc) st
    union all
    select * from (select distinct on (s.cpf) 'assistente', s.id, 'Staff', s.assistente_nome, null::text, s.assistente_whatsapp, 'confirmado',
      concat_ws(' · ', 'Assistente de ' || split_part(s.nome, ' ', 1), s.assistente_funcao), s.created_at, null::text, null::timestamptz, null::text, lower(s.email)
      from public.staff s where v_rotulo = any(s.eventos) and nullif(btrim(s.assistente_nome), '') is not null order by s.cpf, s.created_at desc) sa
    union all
    select * from (select distinct on (fo.documento) 'fornecedor', fo.id, 'Fornecedor', fo.nome, fo.email, fo.whatsapp, 'confirmado', fo.categoria, fo.created_at, null::text, null::timestamptz, null::text, null::text
      from public.fornecedores fo where v_rotulo = any(fo.eventos) order by fo.documento, fo.created_at desc) fn
    union all
    select 'organizacao', m.id, 'Organização', m.nome, lower(m.email), m.whatsapp, 'confirmado', case m.categoria when 'fundadora' then 'Fundadora' else 'Organização' end, m.created_at, null::text, null::timestamptz, null::text, null::text
      from public.members m where m.categoria in ('fundadora', 'organizador')
  )
  select b.fonte, b.id, b.categoria, b.nome, b.email, b.whatsapp, b.situacao, b.detalhe,
    (select count(distinct c.edition_id)::integer from public.checkins c join public.members m on m.id = c.member_id where b.email is not null and lower(m.email) = b.email and c.edition_id <> p_edition),
    b.criado_em,
    (select m.categoria from public.members m where b.email is not null and lower(m.email) = b.email limit 1),
    b.nota,
    coalesce((select min(c.checked_in_at) from public.checkins c join public.members m on m.id = c.member_id where b.email is not null and lower(m.email) = b.email and c.edition_id = p_edition), b.proprio),
    b.convidado_de,
    case when b.junto_email is null then null else coalesce(
      (select coalesce(nullif(btrim(m.nome), ''), m.email) from public.members m where lower(m.email) = b.junto_email limit 1),
      (select fr2.respondent_name from public.form_responses fr2 where lower(fr2.respondent_email) = b.junto_email order by fr2.submitted_at desc limit 1),
      (select s2.nome from public.staff s2 where lower(s2.email) = b.junto_email order by s2.created_at desc limit 1),
      b.junto_email) end
  from base b;
end;
$function$
;
