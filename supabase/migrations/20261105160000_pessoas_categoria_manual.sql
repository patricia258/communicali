-- Pessoas da edição, segunda volta: quem já estava conferido (contatado antes da mudança) fica Confirmado;
-- a categoria pode ser trocada pela organização; qualquer pessoa pode ser adicionada à mão (não só kids);
-- o assistente que o staff leva também aparece como Staff.

update public.form_responses fr set stage = 'Confirmado'
  from public.forms f where f.id = fr.form_id and fr.stage = 'Contatado' and exists (select 1 from public.editions e where e.form_inscricao = f.slug);

alter table public.form_responses add column if not exists categoria text check (categoria in ('Participante', 'Convidado', 'Kids', 'Staff', 'Fornecedor', 'Organização'));
alter table public.registrations add column if not exists categoria text check (categoria in ('Participante', 'Convidado', 'Kids', 'Staff', 'Fornecedor', 'Organização'));
alter table public.guests add column if not exists categoria text check (categoria in ('Participante', 'Convidado', 'Kids', 'Staff', 'Fornecedor', 'Organização'));

-- edition_kids vira o cadastro manual de qualquer pessoa da edição.
alter table public.edition_kids
  add column if not exists categoria text not null default 'Kids' check (categoria in ('Participante', 'Convidado', 'Kids', 'Staff', 'Fornecedor', 'Organização')),
  add column if not exists funcao text,
  add column if not exists email text,
  add column if not exists whatsapp text;
comment on table public.edition_kids is 'Pessoas adicionadas à mão na edição (kids, assistente, convidado de última hora...).';

drop function if exists public.communicali_pessoas_edicao(uuid);
create function public.communicali_pessoas_edicao(p_edition uuid)
returns table (fonte text, id uuid, categoria text, nome text, email text, whatsapp text, situacao text, detalhe text, vezes integer, criado_em timestamptz)
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
    b.criado_em
  from base b;
end;
$$;
revoke all on function public.communicali_pessoas_edicao(uuid) from public, anon;
grant execute on function public.communicali_pessoas_edicao(uuid) to authenticated;

create or replace function public.communicali_definir_situacao(p_fonte text, p_ids uuid[], p_situacao text)
returns integer language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare v integer;
begin
  if not public.is_admin() then raise exception 'Acesso restrito.'; end if;
  if p_situacao not in ('inscrito', 'contatado', 'confirmado', 'sem_resposta', 'nao_vai') then raise exception 'Situação inválida.'; end if;
  if p_fonte = 'form' then
    update public.form_responses set stage = case p_situacao when 'inscrito' then 'Inscrito' when 'contatado' then 'Contatado' when 'confirmado' then 'Confirmado' when 'sem_resposta' then 'Sem resposta' else 'Não vai' end,
      contacted_at = case when p_situacao <> 'inscrito' then coalesce(contacted_at, now()) else contacted_at end
     where id = any(p_ids);
  elsif p_fonte = 'registro' then update public.registrations set situacao = p_situacao where id = any(p_ids);
  elsif p_fonte = 'convidado' then update public.guests set situacao = p_situacao where id = any(p_ids);
  elsif p_fonte in ('manual', 'kids') then update public.edition_kids set situacao = p_situacao where id = any(p_ids);
  else raise exception 'Esta pessoa não tem situação para mudar aqui.';
  end if;
  get diagnostics v = row_count;
  return v;
end;
$$;

create or replace function public.communicali_definir_categoria(p_fonte text, p_ids uuid[], p_categoria text)
returns integer language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare v integer;
begin
  if not public.is_admin() then raise exception 'Acesso restrito.'; end if;
  if p_categoria not in ('Participante', 'Convidado', 'Kids', 'Staff', 'Fornecedor', 'Organização') then raise exception 'Categoria inválida.'; end if;
  if p_fonte = 'form' then update public.form_responses set categoria = p_categoria where id = any(p_ids);
  elsif p_fonte = 'registro' then update public.registrations set categoria = p_categoria where id = any(p_ids);
  elsif p_fonte = 'convidado' then update public.guests set categoria = p_categoria where id = any(p_ids);
  elsif p_fonte = 'manual' then update public.edition_kids set categoria = p_categoria where id = any(p_ids);
  else raise exception 'A categoria desta pessoa vem do cadastro de staff, fornecedor ou organização.';
  end if;
  get diagnostics v = row_count;
  return v;
end;
$$;
revoke all on function public.communicali_definir_categoria(text, uuid[], text) from public, anon;
grant execute on function public.communicali_definir_categoria(text, uuid[], text) to authenticated;

-- Quem foi adicionado à mão com e-mail e está confirmado também recebe os e-mails de quem vai.
create or replace function public.communicali_destinatarios(p_edition uuid)
returns table (email text, nome text, acionado boolean) language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select distinct on (t.email) t.email, t.nome, t.acionado from (
    select lower(r.email) as email, r.nome, public.communicali_situacao_registro(r.status, r.situacao) = 'confirmado' as acionado
      from public.registrations r where r.edition_id = p_edition and public.communicali_situacao_registro(r.status, r.situacao) <> 'nao_vai'
    union all
    select lower(btrim(fr.respondent_email)), fr.respondent_name, fr.stage = 'Confirmado'
      from public.form_responses fr join public.forms f on f.id = fr.form_id join public.editions e on e.form_inscricao = f.slug
     where e.id = p_edition and fr.respondent_email like '%@%' and coalesce(fr.stage, '') <> 'Não vai'
    union all
    select g.email, g.nome, public.communicali_situacao_convidado(g.status, g.situacao) = 'confirmado'
      from public.guests g where g.edition_id = p_edition and public.communicali_situacao_convidado(g.status, g.situacao) <> 'nao_vai'
    union all
    select lower(btrim(k.email)), k.nome, k.situacao = 'confirmado'
      from public.edition_kids k where k.edition_id = p_edition and k.email like '%@%' and k.categoria <> 'Kids' and k.situacao <> 'nao_vai'
  ) t order by t.email, t.acionado desc;
$$;
revoke all on function public.communicali_destinatarios(uuid) from public, anon, authenticated;
grant execute on function public.communicali_destinatarios(uuid) to service_role;
