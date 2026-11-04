-- STAFF que volta: cada participação é um registro novo (histórico preservado), ligado ao cadastro anterior do mesmo CPF.
-- Quem diz que nada mudou não repete empresa, endereço e Pix: copiamos do cadastro anterior.
-- Pix diferente do anterior ou dado faltando fica sinalizado em `conferir` para a organização.
-- O e-mail de boas-vindas ao STAFF é enviado por api/avisos.js (staff_avisado_em).
alter table public.staff drop constraint if exists staff_cpf_key;
create index if not exists staff_cpf on public.staff (cpf, created_at desc);
alter table public.staff
  add column if not exists primeira_vez boolean,
  add column if not exists atualizou_dados boolean not null default true,
  add column if not exists anterior_id uuid references public.staff(id) on delete set null,
  add column if not exists conferir text,
  add column if not exists staff_avisado_em timestamptz;

drop function if exists public.communicali_cadastrar_staff(text, text, text, text, text, text, text, text, text, text, text, boolean, text, text, text, text, text, text, boolean, text, text, text, boolean, text);

create or replace function public.communicali_cadastrar_staff(
  p_nome text, p_cpf text, p_email text, p_whatsapp text, p_funcao text, p_empresa text, p_cnpj text, p_cep text, p_endereco text, p_cidade text, p_pix text, p_aceite boolean,
  p_assistente_nome text default null, p_assistente_cpf text default null, p_assistente_whatsapp text default null, p_assistente_funcao text default null,
  p_comprovante text default null, p_valor text default null, p_aceite_pagamento boolean default false, p_combinado text default null,
  p_pix_tipo text default null, p_banco text default null, p_acionado boolean default null, p_observacoes text default null,
  p_primeira_vez boolean default true, p_atualizar boolean default true)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_cnpj text := regexp_replace(coalesce(p_cnpj, ''), '\D', '', 'g');
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_ass_cpf text := regexp_replace(coalesce(p_assistente_cpf, ''), '\D', '', 'g');
  v_ass boolean := length(btrim(coalesce(p_assistente_nome, ''))) > 0;
  v_pix text := btrim(coalesce(p_pix, ''));
  v_pix_num text := regexp_replace(coalesce(p_pix, ''), '\D', '', 'g');
  v_dados boolean := coalesce(p_primeira_vez, true) or coalesce(p_atualizar, true);
  v_ant public.staff%rowtype;
  v_conferir text;
  v_recent integer;
begin
  if length(btrim(coalesce(p_nome, ''))) < 2 then raise exception 'Informe seu nome completo.'; end if;
  if length(v_cpf) <> 11 then raise exception 'Confira o CPF digitado.'; end if;
  if v_email !~ '^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$' then raise exception 'Confira o e-mail digitado.'; end if;
  if length(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g')) not between 10 and 11 then raise exception 'Confira o WhatsApp com DDD.'; end if;
  if length(btrim(coalesce(p_funcao, ''))) < 2 then raise exception 'Conte qual será a sua função.'; end if;
  if v_ass and length(v_ass_cpf) <> 11 then raise exception 'Confira o CPF do assistente.'; end if;
  if v_ass and length(regexp_replace(coalesce(p_assistente_whatsapp, ''), '\D', '', 'g')) not between 10 and 11 then raise exception 'Confira o WhatsApp do assistente com DDD.'; end if;
  if v_ass and length(btrim(coalesce(p_assistente_funcao, ''))) < 3 then raise exception 'Conte o que o assistente vai fazer.'; end if;
  if coalesce(p_comprovante, '') not in ('nota', 'recibo') then raise exception 'Escolha como vai emitir o comprovante.'; end if;
  select * into v_ant from public.staff where cpf = v_cpf order by created_at desc limit 1;
  if v_dados then
  if p_comprovante = 'nota' and length(v_cnpj) <> 14 then raise exception 'Confira o CNPJ para a nota fiscal.'; end if;
  if length(regexp_replace(coalesce(p_cep, ''), '\D', '', 'g')) <> 8 then raise exception 'Confira o CEP.'; end if;
  -- Chave Pix conforme o tipo, sempre da mesma titularidade do cadastro.
  if coalesce(p_pix_tipo, '') not in ('CPF', 'CNPJ', 'E-mail', 'Telefone', 'Chave aleatória') then raise exception 'Escolha o tipo da chave Pix.'; end if;
  if p_pix_tipo = 'CPF' and v_pix_num <> v_cpf then raise exception 'A chave Pix CPF precisa ser o mesmo CPF do cadastro.'; end if;
  if p_pix_tipo = 'CNPJ' and (p_comprovante <> 'nota' or v_pix_num <> v_cnpj) then raise exception 'A chave Pix CNPJ precisa ser o mesmo CNPJ da nota fiscal.'; end if;
  if p_pix_tipo = 'E-mail' and lower(v_pix) !~ '^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$' then raise exception 'Confira a chave Pix de e-mail.'; end if;
  if p_pix_tipo = 'Telefone' and length(v_pix_num) not between 10 and 11 then raise exception 'Confira a chave Pix de telefone com DDD.'; end if;
  if p_pix_tipo = 'Chave aleatória' and lower(v_pix) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'Confira a chave aleatória.'; end if;
  if length(btrim(coalesce(p_banco, ''))) < 2 then raise exception 'Informe o banco da chave Pix.'; end if;
  if v_ant.id is not null and coalesce(v_ant.pix, '') <> v_pix then v_conferir := 'Chave Pix diferente do cadastro anterior. Confirme com a pessoa antes de pagar.'; end if;
  else
    -- Nada mudou: usa empresa, endereço e Pix do cadastro anterior.
    if v_ant.id is null then v_conferir := 'Disse que nada mudou, mas não há cadastro anterior com este CPF. Peça os dados de endereço e Pix.';
    else
      v_cnpj := regexp_replace(coalesce(v_ant.cnpj, ''), '\D', '', 'g'); v_pix := coalesce(v_ant.pix, '');
      if p_comprovante = 'nota' and length(v_cnpj) <> 14 then v_conferir := 'Esta função pede nota fiscal, mas o cadastro anterior não tem CNPJ. Peça o CNPJ.'; end if;
    end if;
  end if;
  if length(regexp_replace(coalesce(p_valor, ''), '\D', '', 'g')) < 1 then raise exception 'Informe o valor combinado com a organização.'; end if;
  if length(btrim(coalesce(p_combinado, ''))) < 3 then raise exception 'Conte o que ficou combinado sobre o pagamento.'; end if;
  if not coalesce(p_aceite_pagamento, false) then raise exception 'Para continuar, confira seus dados e confirme as condições de pagamento.'; end if;
  if p_acionado is null then raise exception 'Conte se deseja ser acionado para os próximos eventos.'; end if;
  if not coalesce(p_aceite, false) then raise exception 'Para continuar, autorize o uso dos dados.'; end if;
  select count(*) into v_recent from public.staff where created_at > now() - interval '1 minute';
  if v_recent >= 20 then raise exception 'Muitos cadastros ao mesmo tempo. Tente de novo em instantes.'; end if;
  insert into public.staff (nome, cpf, email, whatsapp, funcao, empresa, cnpj, cep, endereco, cidade_uf, pix, pix_tipo, banco, aceite_em,
    assistente_nome, assistente_cpf, assistente_whatsapp, assistente_funcao, comprovante, valor_combinado, pagamento_combinado, aceite_pagamento_em, quer_ser_acionado, observacoes,
    primeira_vez, atualizou_dados, anterior_id, conferir)
  values (left(btrim(p_nome), 160), v_cpf, v_email, left(btrim(p_whatsapp), 40), left(btrim(p_funcao), 160),
    case when not v_dados then v_ant.empresa when p_comprovante = 'nota' then nullif(left(btrim(coalesce(p_empresa, '')), 160), '') end,
    case when not v_dados then v_ant.cnpj when p_comprovante = 'nota' then nullif(left(btrim(coalesce(p_cnpj, '')), 20), '') end,
    case when v_dados then left(btrim(p_cep), 12) else v_ant.cep end, case when v_dados then left(btrim(coalesce(p_endereco, '')), 300) else coalesce(v_ant.endereco, '') end,
    case when v_dados then left(btrim(coalesce(p_cidade, '')), 120) else coalesce(v_ant.cidade_uf, '') end,
    case when v_dados then left(v_pix, 120) else v_ant.pix end, case when v_dados then p_pix_tipo else v_ant.pix_tipo end, case when v_dados then left(btrim(p_banco), 120) else v_ant.banco end, now(),
    case when v_ass then left(btrim(p_assistente_nome), 160) end, case when v_ass then v_ass_cpf end, case when v_ass then left(btrim(p_assistente_whatsapp), 40) end, case when v_ass then left(btrim(p_assistente_funcao), 600) end,
    p_comprovante, left(btrim(p_valor), 80), left(btrim(p_combinado), 600), now(), p_acionado, nullif(left(btrim(coalesce(p_observacoes, '')), 1000), ''),
    coalesce(p_primeira_vez, true), v_dados, v_ant.id, v_conferir);
  return jsonb_build_object('ok', true);
end;
$$;
grant execute on function public.communicali_cadastrar_staff(text, text, text, text, text, text, text, text, text, text, text, boolean, text, text, text, text, text, text, boolean, text, text, text, boolean, text, boolean, boolean) to anon, authenticated;
