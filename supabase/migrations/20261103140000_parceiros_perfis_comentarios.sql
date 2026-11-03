-- CommuniCALI (03/11/2026): perfis de parceiros com vantagens e cupom (para todo Membro) e comentários nos perfis com aprovação da CALI. Base: rascunhos etapa_6 e ajuste_beneficios do ChatGPT.

create schema if not exists communicali_private;
revoke all on schema communicali_private from public, anon;
grant usage on schema communicali_private to authenticated;

create table public.communicali_partner_profiles (
  partner_id uuid primary key references public.partners(id) on delete restrict,
  logo_original_url text check (logo_original_url is null or logo_original_url ~ '^https://'),
  descricao text check (char_length(descricao) <= 800),
  whatsapp text check (char_length(whatsapp) <= 40),
  email text check (char_length(email) <= 300),
  instagram text check (char_length(instagram) <= 300),
  linkedin text check (char_length(linkedin) <= 300),
  updated_at timestamptz not null default now()
);
alter table public.communicali_partner_profiles enable row level security;
revoke all on public.communicali_partner_profiles from public, anon, authenticated;
grant select, insert, update on public.communicali_partner_profiles to authenticated;
create policy communicali_partner_profiles_admin on public.communicali_partner_profiles
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create table public.communicali_feedback (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null references public.members(id) on delete restrict,
  perfil_id uuid not null references public.members(id) on delete restrict,
  estrelas integer not null check (estrelas between 1 and 5),
  comentario text not null check (char_length(btrim(comentario)) between 3 and 600),
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'oculto')),
  motivo text check (char_length(motivo) <= 300),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (autor_id, perfil_id),
  check (autor_id <> perfil_id),
  check (status <> 'oculto' or (motivo is not null and char_length(btrim(motivo)) >= 3))
);
create index communicali_feedback_perfil_status on public.communicali_feedback(perfil_id, status, created_at desc);
alter table public.communicali_feedback enable row level security;
revoke all on public.communicali_feedback from public, anon, authenticated;
grant select on public.communicali_feedback to authenticated;
create policy communicali_feedback_admin on public.communicali_feedback
  for select to authenticated using ((select public.is_admin()));

create table public.communicali_feedback_audit (
  id bigint generated always as identity primary key,
  feedback_id uuid not null references public.communicali_feedback(id) on delete restrict,
  responsavel uuid not null,
  acao text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.communicali_feedback_audit enable row level security;
revoke all on public.communicali_feedback_audit from public, anon, authenticated;
grant select on public.communicali_feedback_audit to authenticated;
create policy communicali_feedback_audit_admin on public.communicali_feedback_audit
  for select to authenticated using ((select public.is_admin()));

-- Helper privado: repete a barreira da Rede sem modificar as funções existentes.
create function communicali_private.rede_membro() returns public.members
language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare m public.members%rowtype;
begin
  if auth.uid() is null then raise exception 'Entre novamente.' using errcode = '42501'; end if;
  m := public.communicali_eu();
  if m.id is null or m.status is distinct from 'ativo' or not coalesce(m.categoria in ('fundadora','conector','embaixador','organizador'), false)
    or not exists (select 1 from public.checkins c where c.member_id = m.id) then
    raise exception 'Disponível a partir de Conector.' using errcode = '42501';
  end if;
  return m;
end;
$$;
revoke all on function communicali_private.rede_membro() from public, anon, authenticated;

create function communicali_private.rede_perfis() returns jsonb
language plpgsql stable security definer set search_path = pg_catalog, public as $$
begin
  perform communicali_private.rede_membro();
  return coalesce((select jsonb_agg(jsonb_build_object(
    'partner_id', f.partner_id, 'logo_original_url', f.logo_original_url, 'descricao', f.descricao,
    'whatsapp', f.whatsapp, 'email', f.email, 'instagram', f.instagram, 'linkedin', f.linkedin)
    order by p.ordem, p.nome)
    from public.communicali_partner_profiles f join public.partners p on p.id = f.partner_id where p.ativo), '[]'::jsonb);
end;
$$;

create function communicali_private.feedback_listar(p_perfil uuid) returns jsonb
language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare m public.members%rowtype;
begin
  m := communicali_private.rede_membro();
  if not exists (select 1 from public.members p where p.id = p_perfil and p.status = 'ativo' and p.na_rede
    and exists (select 1 from public.checkins c where c.member_id = p.id)) then
    raise exception 'Perfil indisponível.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'pode_comentar', m.na_rede and m.id <> p_perfil,
    'comentarios', coalesce((select jsonb_agg(to_jsonb(x) order by x.criado_em desc) from (
      select f.id, a.nome, f.estrelas, f.comentario, f.created_at as criado_em
      from public.communicali_feedback f join public.members a on a.id = f.autor_id
      where f.perfil_id = p_perfil and f.status = 'aprovado' and a.status = 'ativo' and a.na_rede
      order by f.created_at desc limit 50) x), '[]'::jsonb),
    'meu', (select jsonb_build_object('id', f.id, 'estrelas', f.estrelas, 'comentario', f.comentario, 'status', f.status, 'motivo', f.motivo)
      from public.communicali_feedback f where f.perfil_id = p_perfil and f.autor_id = m.id));
end;
$$;

create function communicali_private.feedback_enviar(p_perfil uuid, p_estrelas integer, p_comentario text) returns uuid
language plpgsql volatile security definer set search_path = pg_catalog, public as $$
declare m public.members%rowtype; v_id uuid;
begin
  m := communicali_private.rede_membro();
  if not coalesce(m.na_rede, false) or m.id = p_perfil then raise exception 'Este perfil não pode receber sua avaliação.'; end if;
  if p_estrelas is null or p_estrelas not between 1 and 5 or p_comentario is null
    or char_length(btrim(p_comentario)) not between 3 and 600 then raise exception 'Informe de 1 a 5 estrelas e um comentário de 3 a 600 caracteres.'; end if;
  if not exists (select 1 from public.members p where p.id = p_perfil and p.status = 'ativo' and p.na_rede
    and exists (select 1 from public.checkins c where c.member_id = p.id)) then raise exception 'Perfil indisponível.'; end if;
  insert into public.communicali_feedback (autor_id, perfil_id, estrelas, comentario)
    values (m.id, p_perfil, p_estrelas, btrim(p_comentario))
    on conflict (autor_id, perfil_id) do update set estrelas = excluded.estrelas, comentario = excluded.comentario,
      status = 'pendente', motivo = null, reviewed_by = null, reviewed_at = null, updated_at = clock_timestamp()
    returning id into v_id;
  insert into public.communicali_feedback_audit(feedback_id, responsavel, acao, snapshot)
    values(v_id, auth.uid(), 'envio', jsonb_build_object('estrelas', p_estrelas, 'comentario', btrim(p_comentario)));
  return v_id;
end;
$$;

create function communicali_private.feedback_moderar(p_id uuid, p_status text, p_motivo text, p_updated_at timestamptz) returns void
language plpgsql volatile security definer set search_path = pg_catalog, public as $$
declare f public.communicali_feedback%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Acesso restrito à CALI.' using errcode = '42501'; end if;
  if p_status is null or p_status not in ('aprovado','oculto') then raise exception 'Decisão inválida.'; end if;
  if p_status = 'oculto' and (p_motivo is null or char_length(btrim(p_motivo)) not between 3 and 300) then raise exception 'Informe o motivo.'; end if;
  select * into f from public.communicali_feedback where id = p_id for update;
  if f.id is null or p_updated_at is null or f.updated_at is distinct from p_updated_at then
    raise exception 'O comentário mudou. Atualize a lista antes de decidir.';
  end if;
  update public.communicali_feedback set status = p_status, motivo = case when p_status = 'oculto' then btrim(p_motivo) else null end,
    reviewed_by = auth.uid(), reviewed_at = clock_timestamp(), updated_at = clock_timestamp() where id = p_id;
  insert into public.communicali_feedback_audit(feedback_id, responsavel, acao, snapshot)
    values(p_id, auth.uid(), p_status, jsonb_build_object('estrelas', f.estrelas, 'comentario', f.comentario, 'motivo', p_motivo));
end;
$$;

-- API exposta é invoker. Os definer ficam no schema privado, com validação de identidade e acesso.
create function public.communicali_rede_perfis() returns jsonb language sql stable security invoker
  set search_path = pg_catalog as $$ select communicali_private.rede_perfis(); $$;
create function public.communicali_feedback_listar(p_perfil uuid) returns jsonb language sql stable security invoker
  set search_path = pg_catalog as $$ select communicali_private.feedback_listar(p_perfil); $$;
create function public.communicali_feedback_enviar(p_perfil uuid, p_estrelas integer, p_comentario text) returns uuid language sql volatile security invoker
  set search_path = pg_catalog as $$ select communicali_private.feedback_enviar(p_perfil, p_estrelas, p_comentario); $$;
create function public.communicali_feedback_moderar(p_id uuid, p_status text, p_motivo text, p_updated_at timestamptz) returns void language sql volatile security invoker
  set search_path = pg_catalog as $$ select communicali_private.feedback_moderar(p_id, p_status, p_motivo, p_updated_at); $$;

revoke all on function communicali_private.rede_perfis(), communicali_private.feedback_listar(uuid), communicali_private.feedback_enviar(uuid,integer,text), communicali_private.feedback_moderar(uuid,text,text,timestamptz) from public, anon, authenticated;
grant execute on function communicali_private.rede_perfis(), communicali_private.feedback_listar(uuid), communicali_private.feedback_enviar(uuid,integer,text), communicali_private.feedback_moderar(uuid,text,text,timestamptz) to authenticated;
revoke all on function public.communicali_rede_perfis(), public.communicali_feedback_listar(uuid), public.communicali_feedback_enviar(uuid,integer,text), public.communicali_feedback_moderar(uuid,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.communicali_rede_perfis(), public.communicali_feedback_listar(uuid), public.communicali_feedback_enviar(uuid,integer,text), public.communicali_feedback_moderar(uuid,text,text,timestamptz) to authenticated;

-- Sem alterações nas tabelas/funções antigas, sem preenchimento de dados reais.
notify pgrst, 'reload schema';
alter table public.communicali_partner_profiles
  add column beneficio text check(char_length(beneficio) <= 120),
  add column desconto text check(char_length(desconto) <= 40),
  add column beneficio_detalhes text check(char_length(beneficio_detalhes) <= 1000),
  add column cupom text check(char_length(cupom) <= 60);
create or replace function communicali_private.rede_perfis() returns jsonb
language plpgsql stable security definer set search_path = pg_catalog, public as $$
begin
  perform communicali_private.rede_membro();
  return coalesce((select jsonb_agg(jsonb_build_object(
    'partner_id', f.partner_id, 'logo_original_url', f.logo_original_url, 'descricao', f.descricao,
    'whatsapp', f.whatsapp, 'email', f.email, 'instagram', f.instagram, 'linkedin', f.linkedin,
    'beneficio', f.beneficio, 'desconto', f.desconto, 'beneficio_detalhes', f.beneficio_detalhes, 'cupom', f.cupom)
    order by p.ordem, p.nome)
    from public.communicali_partner_profiles f join public.partners p on p.id = f.partner_id where p.ativo), '[]'::jsonb);
end;
$$;
revoke all on function communicali_private.rede_perfis() from public, anon, authenticated;
grant execute on function communicali_private.rede_perfis() to authenticated;
notify pgrst, 'reload schema';
-- Vitrine: qualquer Membro ativo que já fez check-in vê empresas e vantagens. Comentários continuam na Rede (a partir de Conector).
create or replace function communicali_private.rede_perfis() returns jsonb
language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare m public.members%rowtype;
begin
  if auth.uid() is null then raise exception 'Entre novamente.' using errcode = '42501'; end if;
  m := public.communicali_eu();
  if m.id is null or m.status is distinct from 'ativo' or not exists (select 1 from public.checkins c where c.member_id = m.id) then
    raise exception 'Disponível para Membros.' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'partner_id', f.partner_id, 'logo_original_url', f.logo_original_url, 'descricao', f.descricao,
    'whatsapp', f.whatsapp, 'email', f.email, 'instagram', f.instagram, 'linkedin', f.linkedin,
    'beneficio', f.beneficio, 'desconto', f.desconto, 'beneficio_detalhes', f.beneficio_detalhes, 'cupom', f.cupom)
    order by p.ordem, p.nome)
    from public.communicali_partner_profiles f join public.partners p on p.id = f.partner_id where p.ativo), '[]'::jsonb);
end;
$$;
revoke all on function communicali_private.rede_perfis() from public, anon, authenticated;
grant execute on function communicali_private.rede_perfis() to authenticated;
notify pgrst, 'reload schema';
