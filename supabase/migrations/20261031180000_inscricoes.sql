-- CommuniCALI (31/10/2026): inscrição própria de cada edição, sem criar formulário, e registro de erros de tela.

alter table public.editions add column inscricoes_abertas boolean not null default false;

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions(id),
  nome text not null check (length(nome) between 2 and 160),
  email text not null check (email = lower(email)),
  whatsapp text not null,
  cidade text not null,
  empresa text,
  cargo text,
  status text not null default 'inscrito' check (status in ('inscrito', 'espera', 'cancelado')),
  aceite_em timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (edition_id, email)
);
alter table public.registrations enable row level security;
create policy registrations_admin on public.registrations for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.registrations to authenticated;
create trigger audit_registrations after insert or update or delete on public.registrations for each row execute function public.communicali_audit();

create or replace function public.communicali_inscrever(p_slug text, p_nome text, p_email text, p_whatsapp text, p_cidade text, p_empresa text, p_cargo text, p_privacidade boolean)
returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare
  e public.editions%rowtype; v_status text := 'inscrito'; v_total integer; v_recent integer;
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  select * into e from public.editions where slug = lower(btrim(coalesce(p_slug, '')));
  if not found then raise exception 'Edição não encontrada.'; end if;
  if not e.inscricoes_abertas then raise exception 'As inscrições desta edição estão encerradas.'; end if;
  if length(btrim(coalesce(p_nome, ''))) < 2 then raise exception 'Informe seu nome completo.'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Confira o e-mail digitado.'; end if;
  if length(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g')) < 10 then raise exception 'Confira o WhatsApp com DDD.'; end if;
  if length(btrim(coalesce(p_cidade, ''))) < 2 then raise exception 'Informe sua cidade e estado.'; end if;
  if not coalesce(p_privacidade, false) then raise exception 'Para continuar, aceite a política de privacidade.'; end if;
  select count(*) into v_recent from public.registrations where created_at > now() - interval '1 minute';
  if v_recent >= 30 then raise exception 'Muitas inscrições ao mesmo tempo. Tente de novo em instantes.'; end if;
  if exists (select 1 from public.registrations where edition_id = e.id and email = v_email and status <> 'cancelado') then raise exception 'Este e-mail já está inscrito nesta edição.'; end if;
  select count(*) into v_total from public.registrations where edition_id = e.id and status = 'inscrito';
  if e.capacidade is not null and v_total >= e.capacidade then v_status := 'espera'; end if;
  insert into public.registrations (edition_id, nome, email, whatsapp, cidade, empresa, cargo, status)
  values (e.id, left(btrim(p_nome), 160), v_email, left(btrim(p_whatsapp), 40), left(btrim(p_cidade), 120), nullif(left(btrim(coalesce(p_empresa, '')), 160), ''), nullif(left(btrim(coalesce(p_cargo, '')), 160), ''), v_status)
  on conflict (edition_id, email) do update set status = excluded.status, nome = excluded.nome;
  return jsonb_build_object('status', v_status);
end;
$$;
revoke all on function public.communicali_inscrever(text, text, text, text, text, text, text, boolean) from public;
grant execute on function public.communicali_inscrever(text, text, text, text, text, text, text, boolean) to anon, authenticated;

-- O check-in reconhece quem se inscreveu pelo site e quem veio do formulário da edição.
create or replace function public.communicali_inscricao(p_edition public.editions, p_email text)
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select coalesce(
    (select jsonb_build_object('nome', r.nome, 'sobrenome', '', 'whatsapp', r.whatsapp, 'cidade', r.cidade, 'empresa', r.empresa, 'cargo', r.cargo)
       from public.registrations r where r.edition_id = p_edition.id and r.email = lower(btrim(coalesce(p_email, ''))) and r.status <> 'cancelado' limit 1),
    (select r.answers from public.form_responses r join public.forms f on f.id = r.form_id
      where f.slug = p_edition.form_inscricao and lower(r.respondent_email) = lower(btrim(coalesce(p_email, '')))
      order by r.submitted_at desc limit 1));
$$;
revoke all on function public.communicali_inscricao(public.editions, text) from public, anon, authenticated;

create table public.client_errors (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  pagina text,
  mensagem text,
  navegador text
);
alter table public.client_errors enable row level security;
create policy client_errors_admin_read on public.client_errors for select to authenticated using (public.is_admin());
grant select on public.client_errors to authenticated;

create or replace function public.communicali_registrar_erro(p_pagina text, p_mensagem text, p_navegador text)
returns void language sql volatile security definer set search_path to 'pg_catalog', 'public' as $$
  insert into public.client_errors (pagina, mensagem, navegador)
  select left(coalesce(p_pagina, ''), 200), left(coalesce(p_mensagem, ''), 500), left(coalesce(p_navegador, ''), 300)
   where (select count(*) from public.client_errors where criado_em > now() - interval '1 minute') < 30;
$$;
revoke all on function public.communicali_registrar_erro(text, text, text) from public;
grant execute on function public.communicali_registrar_erro(text, text, text) to anon, authenticated;
