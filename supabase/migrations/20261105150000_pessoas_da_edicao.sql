-- Pessoas da edição num lugar só: participantes (formulário da edição ou página do site), convidados (link de convite),
-- kids (cadastro manual), staff, fornecedores e organização. Cada pessoa tem uma situação:
-- inscrito, contatado, confirmado, sem_resposta ou nao_vai. Só quem está confirmado recebe os e-mails de quem vai ao encontro.

-- Formulário da edição: a situação fica na etapa da resposta. Quem já tinha contato marcado vira "Contatado".
update public.forms f set stages = '["Inscrito", "Contatado", "Confirmado", "Sem resposta", "Não vai"]'::jsonb
 where exists (select 1 from public.editions e where e.form_inscricao = f.slug);
update public.form_responses fr set stage = case when fr.contacted_at is not null then 'Contatado' else 'Inscrito' end
  from public.forms f where f.id = fr.form_id and fr.stage is null and exists (select 1 from public.editions e where e.form_inscricao = f.slug);

-- Página do site e convites: situação própria, sem mexer no status que já existe.
alter table public.registrations add column if not exists situacao text check (situacao in ('inscrito', 'contatado', 'confirmado', 'sem_resposta', 'nao_vai'));
alter table public.guests add column if not exists situacao text check (situacao in ('inscrito', 'contatado', 'confirmado', 'sem_resposta', 'nao_vai'));

-- Fornecedores passam a ter os encontros em que trabalham, como o staff.
alter table public.fornecedores add column if not exists eventos text[];

create table if not exists public.edition_kids (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions(id) on delete cascade,
  nome text not null check (length(btrim(nome)) between 2 and 160),
  idade integer check (idade between 0 and 17),
  responsavel text,
  situacao text not null default 'confirmado' check (situacao in ('inscrito', 'contatado', 'confirmado', 'sem_resposta', 'nao_vai')),
  created_at timestamptz not null default now()
);
alter table public.edition_kids enable row level security;
drop policy if exists edition_kids_admin on public.edition_kids;
create policy edition_kids_admin on public.edition_kids for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Rótulo do encontro usado no cadastro de staff e fornecedor: "1ª Edição Coffee RH (14/11)".
create or replace function public.communicali_rotulo_edicao(p_edition uuid)
returns text language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select e.titulo || ' (' || to_char(e.data_evento, 'DD/MM') || ')' from public.editions e where e.id = p_edition;
$$;

create or replace function public.communicali_situacao_registro(p_status text, p_situacao text)
returns text language sql immutable as $$
  select coalesce(p_situacao, case p_status when 'inscrito' then 'confirmado' when 'cancelado' then 'nao_vai' else 'inscrito' end);
$$;
create or replace function public.communicali_situacao_convidado(p_status text, p_situacao text)
returns text language sql immutable as $$
  select coalesce(p_situacao, case when p_status in ('confirmado', 'presente') then 'confirmado' when p_status in ('ausente', 'cancelado') then 'nao_vai' else 'inscrito' end);
$$;
create or replace function public.communicali_situacao_etapa(p_stage text)
returns text language sql immutable as $$
  select case p_stage when 'Contatado' then 'contatado' when 'Confirmado' then 'confirmado' when 'Sem resposta' then 'sem_resposta' when 'Não vai' then 'nao_vai' else 'inscrito' end;
$$;

create or replace function public.communicali_pessoas_edicao(p_edition uuid)
returns table (fonte text, id uuid, categoria text, nome text, email text, whatsapp text, situacao text, detalhe text, vezes integer, criado_em timestamptz)
language plpgsql stable security definer set search_path to 'pg_catalog', 'public' as $$
declare v_rotulo text := public.communicali_rotulo_edicao(p_edition);
begin
  if not public.is_admin() then raise exception 'Acesso restrito.'; end if;
  return query
  with base as (
    select 'form'::text fonte, fr.id, 'Participante'::text categoria, coalesce(fr.respondent_name, '') nome, lower(btrim(fr.respondent_email)) email,
      fr.answers ->> (select q ->> 'id' from jsonb_array_elements(f.questions) q where q ->> 'kind' = 'phone' limit 1) whatsapp,
      public.communicali_situacao_etapa(fr.stage) situacao, 'Formulário de inscrição'::text detalhe, fr.submitted_at criado_em
      from public.form_responses fr join public.forms f on f.id = fr.form_id join public.editions e on e.form_inscricao = f.slug where e.id = p_edition
    union all
    select 'registro', r.id, case when r.indicado_por is null then 'Participante' else 'Convidado' end, r.nome, r.email, r.whatsapp,
      public.communicali_situacao_registro(r.status, r.situacao),
      case when r.indicado_por is null then 'Página do site' else 'Convite de ' || coalesce((select m.nome from public.members m where m.id = r.indicado_por), 'membro') end
        || case when r.status = 'espera' and r.situacao is null then ' · lista de espera' else '' end,
      r.created_at
      from public.registrations r where r.edition_id = p_edition
    union all
    select 'convidado', g.id, 'Convidado', g.nome, g.email, null, public.communicali_situacao_convidado(g.status, g.situacao),
      'Convite de ' || coalesce((select m.nome from public.members m where m.id = g.member_id), 'membro'), g.created_at
      from public.guests g where g.edition_id = p_edition
    union all
    select 'kids', k.id, 'Kids', k.nome, null, null, k.situacao,
      concat_ws(' · ', case when k.idade is not null then k.idade || ' anos' end, case when k.responsavel is not null then 'Responsável: ' || k.responsavel end), k.created_at
      from public.edition_kids k where k.edition_id = p_edition
    union all
    select * from (select distinct on (s.cpf) 'staff', s.id, 'Staff', s.nome, s.email, s.whatsapp, 'confirmado', s.funcao, s.created_at
      from public.staff s where v_rotulo = any(s.eventos) order by s.cpf, s.created_at desc) st
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
  elsif p_fonte = 'kids' then update public.edition_kids set situacao = p_situacao where id = any(p_ids);
  else raise exception 'Esta pessoa não tem situação para mudar aqui.';
  end if;
  get diagnostics v = row_count;
  return v;
end;
$$;
revoke all on function public.communicali_definir_situacao(text, uuid[], text) from public, anon;
grant execute on function public.communicali_definir_situacao(text, uuid[], text) to authenticated;

-- Liga ou desliga um cadastro de staff ou fornecedor de uma edição (pelo rótulo do encontro).
create or replace function public.communicali_equipe_edicao(p_edition uuid, p_tipo text, p_id uuid, p_incluir boolean)
returns void language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare v_rotulo text := public.communicali_rotulo_edicao(p_edition);
begin
  if not public.is_admin() then raise exception 'Acesso restrito.'; end if;
  if p_tipo = 'staff' then
    update public.staff set eventos = case when p_incluir then array(select distinct x from unnest(coalesce(eventos, '{}') || v_rotulo) x) else array_remove(eventos, v_rotulo) end where id = p_id;
  elsif p_tipo = 'fornecedor' then
    update public.fornecedores set eventos = case when p_incluir then array(select distinct x from unnest(coalesce(eventos, '{}') || v_rotulo) x) else array_remove(eventos, v_rotulo) end where id = p_id;
  else raise exception 'Tipo inválido.';
  end if;
end;
$$;
revoke all on function public.communicali_equipe_edicao(uuid, text, uuid, boolean) from public, anon;
grant execute on function public.communicali_equipe_edicao(uuid, text, uuid, boolean) to authenticated;

-- E-mails da edição: "acionado" agora quer dizer confirmado. Quem marcou "Não vai" sai da lista.
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
  ) t order by t.email, t.acionado desc;
$$;
revoke all on function public.communicali_destinatarios(uuid) from public, anon, authenticated;
grant execute on function public.communicali_destinatarios(uuid) to service_role;
