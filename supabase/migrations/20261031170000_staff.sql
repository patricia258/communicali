-- CommuniCALI (31/10/2026): cadastro de staff (fotógrafo e demais prestadores). Tem CPF e endereço: só a administração lê.
-- O envio público só grava; ninguém consegue consultar pelo site.

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(nome) between 2 and 160),
  cpf text not null unique check (cpf ~ '^[0-9]{11}$'),
  email text not null check (email = lower(email)),
  whatsapp text not null,
  funcao text not null,
  empresa text,
  cnpj text,
  cep text,
  endereco text not null,
  cidade_uf text not null,
  pix text,
  observacoes text,
  aceite_em timestamptz not null default now(),
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.staff enable row level security;
create policy staff_admin on public.staff for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.staff to authenticated;
create trigger audit_staff after insert or update or delete on public.staff for each row execute function public.communicali_audit();

create or replace function public.communicali_cadastrar_staff(
  p_nome text, p_cpf text, p_email text, p_whatsapp text, p_funcao text, p_empresa text, p_cnpj text, p_cep text, p_endereco text, p_cidade text, p_pix text, p_aceite boolean
) returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_recent integer;
begin
  if length(btrim(coalesce(p_nome, ''))) < 2 then raise exception 'Informe seu nome completo.'; end if;
  if length(v_cpf) <> 11 then raise exception 'Confira o CPF digitado.'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Confira o e-mail digitado.'; end if;
  if length(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g')) < 10 then raise exception 'Confira o WhatsApp com DDD.'; end if;
  if not coalesce(p_aceite, false) then raise exception 'Para continuar, autorize o uso dos dados.'; end if;
  select count(*) into v_recent from public.staff where created_at > now() - interval '1 minute';
  if v_recent >= 20 then raise exception 'Muitos cadastros ao mesmo tempo. Tente de novo em instantes.'; end if;
  if exists (select 1 from public.staff where cpf = v_cpf) then raise exception 'Este CPF já tem cadastro. Fale com a organização.'; end if;
  insert into public.staff (nome, cpf, email, whatsapp, funcao, empresa, cnpj, cep, endereco, cidade_uf, pix)
  values (left(btrim(p_nome), 160), v_cpf, v_email, left(btrim(p_whatsapp), 40), left(btrim(coalesce(p_funcao, '')), 120), nullif(left(btrim(coalesce(p_empresa, '')), 160), ''),
    nullif(left(btrim(coalesce(p_cnpj, '')), 20), ''), nullif(left(btrim(coalesce(p_cep, '')), 12), ''), left(btrim(coalesce(p_endereco, '')), 240), left(btrim(coalesce(p_cidade, '')), 120), nullif(left(btrim(coalesce(p_pix, '')), 120), ''));
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.communicali_cadastrar_staff(text, text, text, text, text, text, text, text, text, text, text, boolean) from public;
grant execute on function public.communicali_cadastrar_staff(text, text, text, text, text, text, text, text, text, text, text, boolean) to anon, authenticated;

-- Limpeza dos registros criados nos testes de fluxo; só estes e-mails.
delete from public.form_responses where respondent_email = 'teste-inscrito@calirh.com';
delete from public.point_events where member_id in (select id from public.members where email in ('teste-inscrito@calirh.com', 'teste-fluxo@calirh.com'));
delete from public.checkins where member_id in (select id from public.members where email in ('teste-inscrito@calirh.com', 'teste-fluxo@calirh.com'));
delete from public.members where email in ('teste-inscrito@calirh.com', 'teste-fluxo@calirh.com');
