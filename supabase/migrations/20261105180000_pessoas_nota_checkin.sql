-- Pessoas da edição como lista única: nota interna em qualquer pessoa, hora do check-in na linha,
-- e o check-in reconhece também quem foi adicionado à mão com e-mail.

alter table public.registrations add column if not exists nota text;
alter table public.guests add column if not exists nota text;
alter table public.edition_kids add column if not exists nota text;

drop function if exists public.communicali_pessoas_edicao(uuid);
create function public.communicali_pessoas_edicao(p_edition uuid)
returns table (fonte text, id uuid, categoria text, nome text, email text, whatsapp text, situacao text, detalhe text, vezes integer, criado_em timestamptz, nivel text, nota text, chegou_em timestamptz)
language plpgsql stable security definer set search_path to 'pg_catalog', 'public' as $$
declare v_rotulo text := public.communicali_rotulo_edicao(p_edition);
begin
  if not public.is_admin() then raise exception 'Acesso restrito.'; end if;
  return query
  with base as (
    select 'form'::text fonte, fr.id, coalesce(fr.categoria, 'Participante') categoria,
      btrim(coalesce(fr.respondent_name, '') || case when nullif(btrim(fr.answers ->> 'sobrenome'), '') is not null and position(lower(btrim(fr.answers ->> 'sobrenome')) in lower(coalesce(fr.respondent_name, ''))) = 0 then ' ' || btrim(fr.answers ->> 'sobrenome') else '' end) nome,
      lower(btrim(fr.respondent_email)) email,
      fr.answers ->> (select q ->> 'id' from jsonb_array_elements(f.questions) q where q ->> 'kind' = 'phone' limit 1) whatsapp,
      public.communicali_situacao_etapa(fr.stage) situacao, 'Formulário de inscrição'::text detalhe, fr.submitted_at criado_em, fr.admin_note nota
      from public.form_responses fr join public.forms f on f.id = fr.form_id join public.editions e on e.form_inscricao = f.slug where e.id = p_edition
    union all
    select 'registro', r.id, coalesce(r.categoria, case when r.indicado_por is null then 'Participante' else 'Convidado' end), r.nome, r.email, r.whatsapp,
      public.communicali_situacao_registro(r.status, r.situacao),
      case when r.indicado_por is null then 'Página do site' else 'Convite de ' || coalesce((select m.nome from public.members m where m.id = r.indicado_por), 'membro') end
        || case when r.status = 'espera' and r.situacao is null then ' · lista de espera' else '' end,
      r.created_at, r.nota
      from public.registrations r where r.edition_id = p_edition
    union all
    select 'convidado', g.id, coalesce(g.categoria, 'Convidado'), g.nome, g.email, null, public.communicali_situacao_convidado(g.status, g.situacao),
      'Convite de ' || coalesce((select m.nome from public.members m where m.id = g.member_id), 'membro'), g.created_at, g.nota
      from public.guests g where g.edition_id = p_edition
    union all
    select 'manual', k.id, k.categoria, k.nome, lower(nullif(btrim(k.email), '')), k.whatsapp, k.situacao,
      concat_ws(' · ', 'Adicionado à mão', k.funcao, case when k.idade is not null then k.idade || ' anos' end, case when k.responsavel is not null then 'Responsável: ' || k.responsavel end), k.created_at, k.nota
      from public.edition_kids k where k.edition_id = p_edition
    union all
    select * from (select distinct on (s.cpf) 'staff', s.id, 'Staff', s.nome, s.email, s.whatsapp, 'confirmado', s.funcao, s.created_at, null::text
      from public.staff s where v_rotulo = any(s.eventos) order by s.cpf, s.created_at desc) st
    union all
    select * from (select distinct on (s.cpf) 'assistente', s.id, 'Staff', s.assistente_nome, null::text, s.assistente_whatsapp, 'confirmado',
      concat_ws(' · ', 'Assistente de ' || split_part(s.nome, ' ', 1), s.assistente_funcao), s.created_at, null::text
      from public.staff s where v_rotulo = any(s.eventos) and nullif(btrim(s.assistente_nome), '') is not null order by s.cpf, s.created_at desc) sa
    union all
    select * from (select distinct on (fo.documento) 'fornecedor', fo.id, 'Fornecedor', fo.nome, fo.email, fo.whatsapp, 'confirmado', fo.categoria, fo.created_at, null::text
      from public.fornecedores fo where v_rotulo = any(fo.eventos) order by fo.documento, fo.created_at desc) fn
    union all
    select 'organizacao', m.id, 'Organização', m.nome, lower(m.email), m.whatsapp, 'confirmado', case m.categoria when 'fundadora' then 'Fundadora' else 'Organização' end, m.created_at, null::text
      from public.members m where m.categoria in ('fundadora', 'organizador')
  )
  select b.fonte, b.id, b.categoria, b.nome, b.email, b.whatsapp, b.situacao, b.detalhe,
    (select count(distinct c.edition_id)::integer from public.checkins c join public.members m on m.id = c.member_id where b.email is not null and lower(m.email) = b.email and c.edition_id <> p_edition),
    b.criado_em,
    (select m.categoria from public.members m where b.email is not null and lower(m.email) = b.email limit 1),
    b.nota,
    (select min(c.checked_in_at) from public.checkins c join public.members m on m.id = c.member_id where b.email is not null and lower(m.email) = b.email and c.edition_id = p_edition)
  from base b;
end;
$$;
revoke all on function public.communicali_pessoas_edicao(uuid) from public, anon;
grant execute on function public.communicali_pessoas_edicao(uuid) to authenticated;

create or replace function public.communicali_definir_nota(p_fonte text, p_id uuid, p_nota text)
returns void language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare v text := nullif(left(btrim(coalesce(p_nota, '')), 2000), '');
begin
  if not public.is_admin() then raise exception 'Acesso restrito.'; end if;
  if p_fonte = 'form' then update public.form_responses set admin_note = v where id = p_id;
  elsif p_fonte = 'registro' then update public.registrations set nota = v where id = p_id;
  elsif p_fonte = 'convidado' then update public.guests set nota = v where id = p_id;
  elsif p_fonte = 'manual' then update public.edition_kids set nota = v where id = p_id;
  else raise exception 'A nota desta pessoa fica no cadastro dela.';
  end if;
end;
$$;
revoke all on function public.communicali_definir_nota(text, uuid, text) from public, anon;
grant execute on function public.communicali_definir_nota(text, uuid, text) to authenticated;

-- Check-in: além da página do site e do formulário, reconhece quem foi adicionado à mão com e-mail.
create or replace function public.communicali_inscricao(p_edition editions, p_email text)
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select coalesce(
    (select jsonb_build_object('nome', r.nome, 'sobrenome', '', 'whatsapp', r.whatsapp, 'cidade', r.cidade, 'empresa', r.empresa, 'cargo', r.cargo)
       from public.registrations r where r.edition_id = p_edition.id and r.email = lower(btrim(coalesce(p_email, ''))) and r.status <> 'cancelado' limit 1),
    (select r.answers from public.form_responses r join public.forms f on f.id = r.form_id
      where f.slug = p_edition.form_inscricao and lower(r.respondent_email) = lower(btrim(coalesce(p_email, '')))
      order by r.submitted_at desc limit 1),
    (select jsonb_build_object('nome', k.nome, 'sobrenome', '', 'whatsapp', k.whatsapp, 'cidade', null, 'empresa', null, 'cargo', k.funcao)
       from public.edition_kids k where k.edition_id = p_edition.id and lower(btrim(k.email)) = lower(btrim(coalesce(p_email, ''))) and k.categoria <> 'Kids' limit 1));
$$;
