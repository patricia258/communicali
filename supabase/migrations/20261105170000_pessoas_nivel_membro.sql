-- Pessoas da edição: devolve também o nível da pessoa no passaporte, quando ela já é membro.
drop function if exists public.communicali_pessoas_edicao(uuid);
create function public.communicali_pessoas_edicao(p_edition uuid)
returns table (fonte text, id uuid, categoria text, nome text, email text, whatsapp text, situacao text, detalhe text, vezes integer, criado_em timestamptz, nivel text)
language plpgsql stable security definer set search_path to 'pg_catalog', 'public' as $$
declare v_rotulo text := public.communicali_rotulo_edicao(p_edition);
begin
  if not public.is_admin() then raise exception 'Acesso restrito.'; end if;
  return query
  with base as (
    select 'form'::text fonte, fr.id, coalesce(fr.categoria, 'Participante') categoria, coalesce(fr.respondent_name, '') nome, lower(btrim(fr.respondent_email)) email,
      fr.answers ->> (select q ->> 'id' from jsonb_array_elements(f.questions) q where q ->> 'kind' = 'phone' limit 1) whatsapp,
      public.communicali_situacao_etapa(fr.stage) situacao, 'Formulário de inscrição'::text detalhe, fr.submitted_at criado_em
      from public.form_responses fr join public.forms f on f.id = fr.form_id join public.editions e on e.form_inscricao = f.slug where e.id = p_edition
    union all
    select 'registro', r.id, coalesce(r.categoria, case when r.indicado_por is null then 'Participante' else 'Convidado' end), r.nome, r.email, r.whatsapp,
      public.communicali_situacao_registro(r.status, r.situacao),
      case when r.indicado_por is null then 'Página do site' else 'Convite de ' || coalesce((select m.nome from public.members m where m.id = r.indicado_por), 'membro') end
        || case when r.status = 'espera' and r.situacao is null then ' · lista de espera' else '' end,
      r.created_at
      from public.registrations r where r.edition_id = p_edition
    union all
    select 'convidado', g.id, coalesce(g.categoria, 'Convidado'), g.nome, g.email, null, public.communicali_situacao_convidado(g.status, g.situacao),
      'Convite de ' || coalesce((select m.nome from public.members m where m.id = g.member_id), 'membro'), g.created_at
      from public.guests g where g.edition_id = p_edition
    union all
    select 'manual', k.id, k.categoria, k.nome, lower(nullif(btrim(k.email), '')), k.whatsapp, k.situacao,
      concat_ws(' · ', 'Adicionado à mão', k.funcao, case when k.idade is not null then k.idade || ' anos' end, case when k.responsavel is not null then 'Responsável: ' || k.responsavel end), k.created_at
      from public.edition_kids k where k.edition_id = p_edition
    union all
    select * from (select distinct on (s.cpf) 'staff', s.id, 'Staff', s.nome, s.email, s.whatsapp, 'confirmado', s.funcao, s.created_at
      from public.staff s where v_rotulo = any(s.eventos) order by s.cpf, s.created_at desc) st
    union all
    select * from (select distinct on (s.cpf) 'assistente', s.id, 'Staff', s.assistente_nome, null::text, s.assistente_whatsapp, 'confirmado',
      concat_ws(' · ', 'Assistente de ' || split_part(s.nome, ' ', 1), s.assistente_funcao), s.created_at
      from public.staff s where v_rotulo = any(s.eventos) and nullif(btrim(s.assistente_nome), '') is not null order by s.cpf, s.created_at desc) sa
    union all
    select * from (select distinct on (fo.documento) 'fornecedor', fo.id, 'Fornecedor', fo.nome, fo.email, fo.whatsapp, 'confirmado', fo.categoria, fo.created_at
      from public.fornecedores fo where v_rotulo = any(fo.eventos) order by fo.documento, fo.created_at desc) fn
    union all
    select 'organizacao', m.id, 'Organização', m.nome, lower(m.email), m.whatsapp, 'confirmado', case m.categoria when 'fundadora' then 'Fundadora' else 'Organização' end, m.created_at
      from public.members m where m.categoria in ('fundadora', 'organizador')
  )
  select b.fonte, b.id, b.categoria, b.nome, b.email, b.whatsapp, b.situacao, b.detalhe,
    (select count(distinct c.edition_id)::integer from public.checkins c join public.members m on m.id = c.member_id where b.email is not null and lower(m.email) = b.email and c.edition_id <> p_edition),
    b.criado_em,
    -- Nível no passaporte (membro, conector, embaixador...), para a lista da recepção separar quem já é membro.
    (select m.categoria from public.members m where b.email is not null and lower(m.email) = b.email limit 1)
  from base b;
end;
$$;
revoke all on function public.communicali_pessoas_edicao(uuid) from public, anon;
grant execute on function public.communicali_pessoas_edicao(uuid) to authenticated;

