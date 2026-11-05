-- Convidado de quem (para a equipe de apoio levar os crachás certos) e check-in junto com o responsável:
-- kids chegam com o adulto responsável; um acompanhante pode chegar junto com quem o trouxe.

alter table public.form_responses add column if not exists convidado_de text, add column if not exists junto_com_email text, add column if not exists chegou_em timestamptz;
alter table public.registrations add column if not exists convidado_de text;
alter table public.guests add column if not exists convidado_de text;
alter table public.edition_kids add column if not exists convidado_de text, add column if not exists responsavel_email text, add column if not exists chegou_em timestamptz;

drop function if exists public.communicali_pessoas_edicao(uuid);
create function public.communicali_pessoas_edicao(p_edition uuid)
returns table (fonte text, id uuid, categoria text, nome text, email text, whatsapp text, situacao text, detalhe text, vezes integer, criado_em timestamptz, nivel text, nota text, chegou_em timestamptz, convidado_de text, junto_com text)
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
      public.communicali_situacao_etapa(fr.stage) situacao, 'Formulário de inscrição'::text detalhe, fr.submitted_at criado_em, fr.admin_note nota,
      fr.chegou_em proprio, fr.convidado_de, lower(btrim(fr.junto_com_email)) junto_email
      from public.form_responses fr join public.forms f on f.id = fr.form_id join public.editions e on e.form_inscricao = f.slug where e.id = p_edition
    union all
    select 'registro', r.id, coalesce(r.categoria, case when r.indicado_por is null then 'Participante' else 'Convidado' end), r.nome, r.email, r.whatsapp,
      public.communicali_situacao_registro(r.status, r.situacao),
      case when r.indicado_por is null then 'Página do site' else 'Link de convite' end || case when r.status = 'espera' and r.situacao is null then ' · lista de espera' else '' end,
      r.created_at, r.nota, null::timestamptz, coalesce(r.convidado_de, (select m.nome from public.members m where m.id = r.indicado_por)), null::text
      from public.registrations r where r.edition_id = p_edition
    union all
    select 'convidado', g.id, coalesce(g.categoria, 'Convidado'), g.nome, g.email, null, public.communicali_situacao_convidado(g.status, g.situacao),
      'Convite pelo passaporte', g.created_at, g.nota, null::timestamptz, coalesce(g.convidado_de, (select m.nome from public.members m where m.id = g.member_id)), null::text
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
$$;
revoke all on function public.communicali_pessoas_edicao(uuid) from public, anon;
grant execute on function public.communicali_pessoas_edicao(uuid) to authenticated;

create or replace function public.communicali_definir_convidado_de(p_fonte text, p_id uuid, p_nome text)
returns void language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare v text := nullif(left(btrim(coalesce(p_nome, '')), 160), '');
begin
  if not public.is_admin() then raise exception 'Acesso restrito.'; end if;
  if p_fonte = 'form' then update public.form_responses set convidado_de = v where id = p_id;
  elsif p_fonte = 'registro' then update public.registrations set convidado_de = v where id = p_id;
  elsif p_fonte = 'convidado' then update public.guests set convidado_de = v where id = p_id;
  elsif p_fonte = 'manual' then update public.edition_kids set convidado_de = v where id = p_id;
  end if;
end;
$$;
revoke all on function public.communicali_definir_convidado_de(text, uuid, text) from public, anon;
grant execute on function public.communicali_definir_convidado_de(text, uuid, text) to authenticated;

-- "Faz check-in junto com": e-mail de quem traz a pessoa. Vazio desliga.
create or replace function public.communicali_definir_junto(p_fonte text, p_id uuid, p_email text)
returns void language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare v text := nullif(lower(btrim(coalesce(p_email, ''))), '');
begin
  if not public.is_admin() then raise exception 'Acesso restrito.'; end if;
  if p_fonte = 'form' then update public.form_responses set junto_com_email = v where id = p_id;
  elsif p_fonte = 'manual' then update public.edition_kids set responsavel_email = v where id = p_id;
  else raise exception 'Para esta pessoa, o check-in é feito por ela mesma.';
  end if;
end;
$$;
revoke all on function public.communicali_definir_junto(text, uuid, text) from public, anon;
grant execute on function public.communicali_definir_junto(text, uuid, text) to authenticated;

-- Check-in: registra também quem chega junto (kids do responsável, acompanhante) e devolve os nomes para a tela de sucesso.
create or replace function public.communicali_registrar_presenca(p_edition uuid, p_member uuid, p_origem text)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog', 'public' as $function$
declare
  v_id uuid; v_codigo text; m public.members%rowtype; e public.editions%rowtype; v_junto text[];
begin
  select * into e from public.editions where id = p_edition;
  insert into public.checkins (edition_id, member_id, origem) values (p_edition, p_member, p_origem)
  on conflict (edition_id, member_id) do nothing returning id into v_id;
  insert into public.point_events (member_id, edition_id, acao, pontos) values (p_member, p_edition, 'presenca', 10)
  on conflict (member_id, edition_id, acao) do nothing;
  update public.members set cracha_status = 'disponivel', updated_at = now() where id = p_member and cracha_status = 'nao_disponivel';
  select * into m from public.members where id = p_member;
  perform public.communicali_creditar_convidado(p_edition, m.email);
  perform public.communicali_creditar_indicacao(p_edition, p_member, m.email);
  update public.edition_kids set chegou_em = coalesce(chegou_em, now()) where edition_id = p_edition and lower(btrim(responsavel_email)) = lower(m.email) and situacao <> 'nao_vai';
  update public.form_responses fr set chegou_em = coalesce(fr.chegou_em, now()) from public.forms f
   where f.id = fr.form_id and f.slug = e.form_inscricao and lower(btrim(fr.junto_com_email)) = lower(m.email);
  select array_agg(x.nome order by x.nome) into v_junto from (
    select k.nome from public.edition_kids k where k.edition_id = p_edition and lower(btrim(k.responsavel_email)) = lower(m.email) and k.situacao <> 'nao_vai'
    union all
    select fr.respondent_name from public.form_responses fr join public.forms f on f.id = fr.form_id where f.slug = e.form_inscricao and lower(btrim(fr.junto_com_email)) = lower(m.email)
  ) x;
  select codigo into v_codigo from public.checkins where edition_id = p_edition and member_id = p_member;
  return jsonb_build_object('nome', coalesce(nullif(m.apelido, ''), m.nome), 'categoria', m.categoria, 'edicao', e.titulo, 'selo', e.selo, 'codigo', v_codigo, 'repetido', v_id is null, 'junto', coalesce(to_jsonb(v_junto), '[]'::jsonb));
end;
$function$;

-- Dados pedidos pela Patrícia em 05/11: quem é convidado de quem, e quem chega junto.
update public.form_responses fr set categoria = 'Convidado', convidado_de = 'Patrícia Lima'
  from public.forms f where f.id = fr.form_id and f.slug = 'coffee-rh-cwb' and lower(fr.respondent_email) in ('cintia.santos@ecx.com.br', 'joaorolvr2@gmail.com', 'inaieduarte.id@gmail.com');
update public.form_responses fr set convidado_de = 'Marcio J Silva', junto_com_email = 'worhk@outlook.com'
  from public.forms f where f.id = fr.form_id and f.slug = 'coffee-rh-cwb' and fr.respondent_name ilike 'Cleia%';
update public.edition_kids set responsavel_email = 'contato@calirh.com' where responsavel = 'Patrícia Lima';
update public.edition_kids set responsavel_email = 'worhk@outlook.com' where responsavel = 'Marcio J Silva';
