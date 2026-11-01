-- CommuniCALI (31/10/2026): indicação de convidados. Indicar não garante vaga: a organização aprova, o convidado
-- aceita as condições pelo próprio link e o ponto de quem indicou só entra depois do check-in válido do convidado.

alter table public.editions
  add column limite_convidados integer not null default 1 check (limite_convidados >= 0),
  add column condicoes_convite text not null default '';
update public.editions set limite_convidados = 0 where slug = 'fundadora';

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions(id),
  member_id uuid not null references public.members(id),
  nome text not null check (length(nome) between 2 and 160),
  email text not null check (email = lower(email)),
  status text not null default 'indicado' check (status in ('indicado', 'convidado', 'inscrito', 'confirmado', 'presente', 'ausente', 'cancelado')),
  token uuid not null unique default gen_random_uuid(),
  aceite_em timestamptz,
  created_at timestamptz not null default now(),
  unique (edition_id, email)
);
alter table public.guests enable row level security;
create policy guests_admin on public.guests for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.guests to authenticated;
create trigger audit_guests after insert or update or delete on public.guests for each row execute function public.communicali_audit();

-- Check-in válido do convidado: marca presença e dá 1 ponto a quem indicou, uma vez por convidado.
create or replace function public.communicali_creditar_convidado(p_edition uuid, p_email text)
returns void language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare g public.guests%rowtype;
begin
  select * into g from public.guests where edition_id = p_edition and email = lower(p_email) and status in ('inscrito', 'confirmado', 'presente');
  if not found then return; end if;
  update public.guests set status = 'presente' where id = g.id and status <> 'presente';
  insert into public.point_events (member_id, edition_id, acao, pontos) values (g.member_id, p_edition, 'convidado:' || g.id::text, 1)
  on conflict (member_id, edition_id, acao) do nothing;
end;
$$;
revoke all on function public.communicali_creditar_convidado(uuid, text) from public, anon, authenticated;

create or replace function public.communicali_registrar_presenca(p_edition uuid, p_member uuid, p_origem text)
returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare
  v_id uuid; v_codigo text; m public.members%rowtype; e public.editions%rowtype;
begin
  select * into e from public.editions where id = p_edition;
  insert into public.checkins (edition_id, member_id, origem) values (p_edition, p_member, p_origem)
  on conflict (edition_id, member_id) do nothing returning id into v_id;
  insert into public.point_events (member_id, edition_id, acao, pontos) values (p_member, p_edition, 'presenca', 10)
  on conflict (member_id, edition_id, acao) do nothing;
  update public.members set cracha_status = 'disponivel', updated_at = now() where id = p_member and cracha_status = 'nao_disponivel';
  select * into m from public.members where id = p_member;
  perform public.communicali_creditar_convidado(p_edition, m.email);
  select codigo into v_codigo from public.checkins where edition_id = p_edition and member_id = p_member;
  return jsonb_build_object('nome', coalesce(nullif(m.apelido, ''), m.nome), 'categoria', m.categoria, 'edicao', e.titulo, 'selo', e.selo, 'codigo', v_codigo, 'repetido', v_id is null);
end;
$$;
revoke all on function public.communicali_registrar_presenca(uuid, uuid, text) from public, anon, authenticated;

-- Quem indica confirma o próprio e-mail com código; a indicação usa o e-mail da sessão.
create or replace function public.communicali_indicar(p_slug text, p_nome text, p_email text)
returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare
  e public.editions%rowtype; m public.members%rowtype; v_usados integer;
  v_nome text := left(btrim(coalesce(p_nome, '')), 160);
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  select * into e from public.editions where slug = lower(btrim(coalesce(p_slug, '')));
  if not found then raise exception 'Edição não encontrada.'; end if;
  select * into m from public.members where email = lower(coalesce(auth.jwt() ->> 'email', ''));
  if not found then raise exception 'Só membros cadastrados podem indicar convidados.'; end if;
  if length(v_nome) < 2 then raise exception 'Informe o nome do convidado.'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Confira o e-mail do convidado.'; end if;
  if v_email = m.email then raise exception 'Você não pode indicar a si mesmo.'; end if;
  select count(*) into v_usados from public.guests where edition_id = e.id and member_id = m.id and status <> 'cancelado';
  if v_usados >= e.limite_convidados then raise exception 'Seu limite de convidados para este encontro já foi atingido.'; end if;
  if exists (select 1 from public.guests where edition_id = e.id and email = v_email) then raise exception 'Esta pessoa já foi indicada para este encontro.'; end if;
  insert into public.guests (edition_id, member_id, nome, email) values (e.id, m.id, v_nome, v_email);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.communicali_convite(p_token uuid)
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select jsonb_build_object('nome', split_part(g.nome, ' ', 1), 'status', g.status, 'edicao', e.titulo, 'data_evento', e.data_evento,
         'horario', e.horario, 'local', e.local, 'cidade', e.cidade, 'condicoes', e.condicoes_convite)
    from public.guests g join public.editions e on e.id = g.edition_id where g.token = p_token;
$$;

create or replace function public.communicali_aceitar_convite(p_token uuid)
returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare v_status text;
begin
  update public.guests set status = 'inscrito', aceite_em = now() where token = p_token and status = 'convidado' returning status into v_status;
  if v_status is null then raise exception 'Este convite não está disponível para aceite.'; end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.communicali_indicar(text, text, text) from public;
revoke all on function public.communicali_convite(uuid) from public;
revoke all on function public.communicali_aceitar_convite(uuid) from public;
grant execute on function public.communicali_indicar(text, text, text) to authenticated;
grant execute on function public.communicali_convite(uuid) to anon, authenticated;
grant execute on function public.communicali_aceitar_convite(uuid) to anon, authenticated;
