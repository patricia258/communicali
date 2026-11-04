-- Staff: função "Outro", assistente, comprovante (nota fiscal ou recibo), valor combinado e aceite das condições de pagamento.
-- admin_avisado_em: a organização recebe e-mail a cada cadastro novo (api/avisos.js).
alter table public.staff
  add column if not exists assistente_nome text,
  add column if not exists assistente_cpf text,
  add column if not exists assistente_whatsapp text,
  add column if not exists assistente_funcao text,
  add column if not exists comprovante text,
  add column if not exists valor_combinado text,
  add column if not exists aceite_pagamento_em timestamptz,
  add column if not exists admin_avisado_em timestamptz;

drop function if exists public.communicali_cadastrar_staff(text, text, text, text, text, text, text, text, text, text, text, boolean);

create or replace function public.communicali_cadastrar_staff(
  p_nome text, p_cpf text, p_email text, p_whatsapp text, p_funcao text, p_empresa text, p_cnpj text, p_cep text, p_endereco text, p_cidade text, p_pix text, p_aceite boolean,
  p_assistente_nome text default null, p_assistente_cpf text default null, p_assistente_whatsapp text default null, p_assistente_funcao text default null,
  p_comprovante text default null, p_valor text default null, p_aceite_pagamento boolean default false)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_ass_cpf text := regexp_replace(coalesce(p_assistente_cpf, ''), '\D', '', 'g');
  v_ass boolean := length(btrim(coalesce(p_assistente_nome, ''))) > 0;
  v_recent integer;
begin
  if length(btrim(coalesce(p_nome, ''))) < 2 then raise exception 'Informe seu nome completo.'; end if;
  if length(v_cpf) <> 11 then raise exception 'Confira o CPF digitado.'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Confira o e-mail digitado.'; end if;
  if length(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g')) < 10 then raise exception 'Confira o WhatsApp com DDD.'; end if;
  if length(btrim(coalesce(p_funcao, ''))) < 2 then raise exception 'Conte qual será a sua função.'; end if;
  if v_ass and length(v_ass_cpf) <> 11 then raise exception 'Confira o CPF do assistente.'; end if;
  if v_ass and length(regexp_replace(coalesce(p_assistente_whatsapp, ''), '\D', '', 'g')) < 10 then raise exception 'Confira o WhatsApp do assistente com DDD.'; end if;
  if v_ass and length(btrim(coalesce(p_assistente_funcao, ''))) < 3 then raise exception 'Conte o que o assistente vai fazer.'; end if;
  if coalesce(p_comprovante, '') not in ('nota', 'recibo') then raise exception 'Escolha como vai emitir o comprovante.'; end if;
  if p_comprovante = 'nota' and length(regexp_replace(coalesce(p_cnpj, ''), '\D', '', 'g')) <> 14 then raise exception 'Confira o CNPJ para a nota fiscal.'; end if;
  if length(btrim(coalesce(p_valor, ''))) < 1 then raise exception 'Informe o valor combinado com a organização.'; end if;
  if not coalesce(p_aceite_pagamento, false) then raise exception 'Para continuar, confirme as condições de pagamento.'; end if;
  if not coalesce(p_aceite, false) then raise exception 'Para continuar, autorize o uso dos dados.'; end if;
  select count(*) into v_recent from public.staff where created_at > now() - interval '1 minute';
  if v_recent >= 20 then raise exception 'Muitos cadastros ao mesmo tempo. Tente de novo em instantes.'; end if;
  if exists (select 1 from public.staff where cpf = v_cpf) then raise exception 'Este CPF já tem cadastro. Fale com a organização.'; end if;
  insert into public.staff (nome, cpf, email, whatsapp, funcao, empresa, cnpj, cep, endereco, cidade_uf, pix, aceite_em,
    assistente_nome, assistente_cpf, assistente_whatsapp, assistente_funcao, comprovante, valor_combinado, aceite_pagamento_em)
  values (left(btrim(p_nome), 160), v_cpf, v_email, left(btrim(p_whatsapp), 40), left(btrim(p_funcao), 160), nullif(left(btrim(coalesce(p_empresa, '')), 160), ''),
    nullif(left(btrim(coalesce(p_cnpj, '')), 20), ''), nullif(left(btrim(coalesce(p_cep, '')), 12), ''), left(btrim(coalesce(p_endereco, '')), 240), left(btrim(coalesce(p_cidade, '')), 120), nullif(left(btrim(coalesce(p_pix, '')), 120), ''), now(),
    case when v_ass then left(btrim(p_assistente_nome), 160) end, case when v_ass then v_ass_cpf end, case when v_ass then left(btrim(p_assistente_whatsapp), 40) end, case when v_ass then left(btrim(p_assistente_funcao), 600) end,
    p_comprovante, left(btrim(p_valor), 80), now());
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.communicali_cadastrar_staff(text, text, text, text, text, text, text, text, text, text, text, boolean, text, text, text, text, text, text, boolean) from public;
grant execute on function public.communicali_cadastrar_staff(text, text, text, text, text, text, text, text, text, text, text, boolean, text, text, text, text, text, text, boolean) to anon, authenticated;
