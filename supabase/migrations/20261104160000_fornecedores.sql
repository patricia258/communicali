-- Fornecedores: cadastro simples para a organização acionar quem fornece para os encontros.
-- Quem volta e diz que nada mudou não preenche endereço nem Pix: o registro aponta para o cadastro anterior (mesmo documento).
-- Nada do cadastro anterior é mostrado de volta no formulário.
create table if not exists public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('empresa', 'pessoa')),
  documento text not null,
  nome text not null,
  contato_nome text,
  email text not null,
  whatsapp text not null,
  categoria text not null,
  fornece text not null,
  primeira_vez boolean not null,
  atualizou_dados boolean not null default true,
  anterior_id uuid references public.fornecedores(id) on delete set null,
  cep text, endereco text, cidade_uf text,
  pix_tipo text, pix text, banco text,
  quer_ser_acionado boolean,
  observacoes text,
  status text not null default 'ativo',
  aceite_em timestamptz,
  admin_avisado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fornecedores_documento on public.fornecedores (documento, created_at desc);
alter table public.fornecedores enable row level security;
drop policy if exists fornecedores_admin on public.fornecedores;
create policy fornecedores_admin on public.fornecedores for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.communicali_cadastrar_fornecedor(
  p_primeira_vez boolean, p_tipo text, p_documento text, p_nome text, p_contato text, p_email text, p_whatsapp text, p_categoria text, p_fornece text,
  p_atualizar boolean, p_cep text, p_endereco text, p_cidade text, p_pix_tipo text, p_pix text, p_banco text, p_acionado boolean, p_observacoes text, p_aceite boolean)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_doc text := regexp_replace(coalesce(p_documento, ''), '\D', '', 'g');
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_pix text := btrim(coalesce(p_pix, ''));
  v_pix_num text := regexp_replace(coalesce(p_pix, ''), '\D', '', 'g');
  v_dados boolean := coalesce(p_primeira_vez, true) or coalesce(p_atualizar, true);
  v_anterior uuid;
  v_recent integer;
begin
  if coalesce(p_tipo, '') not in ('empresa', 'pessoa') then raise exception 'Conte se é empresa ou pessoa física.'; end if;
  if p_tipo = 'empresa' and length(v_doc) <> 14 then raise exception 'Confira o CNPJ.'; end if;
  if p_tipo = 'pessoa' and length(v_doc) <> 11 then raise exception 'Confira o CPF.'; end if;
  if length(btrim(coalesce(p_nome, ''))) < 2 then raise exception 'Informe o nome.'; end if;
  if v_email !~ '^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$' then raise exception 'Confira o e-mail digitado.'; end if;
  if length(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g')) not between 10 and 11 then raise exception 'Confira o WhatsApp com DDD.'; end if;
  if length(btrim(coalesce(p_categoria, ''))) < 2 or length(btrim(coalesce(p_fornece, ''))) < 3 then raise exception 'Conte o que você fornece.'; end if;
  if v_dados then
    if length(regexp_replace(coalesce(p_cep, ''), '\D', '', 'g')) <> 8 then raise exception 'Confira o CEP.'; end if;
    if length(btrim(coalesce(p_endereco, ''))) < 3 or length(btrim(coalesce(p_cidade, ''))) < 2 then raise exception 'Confira o endereço.'; end if;
    if coalesce(p_pix_tipo, '') not in ('CPF', 'CNPJ', 'E-mail', 'Telefone', 'Chave aleatória') then raise exception 'Escolha o tipo da chave Pix.'; end if;
    if p_pix_tipo in ('CPF', 'CNPJ') and v_pix_num <> v_doc then raise exception 'A chave Pix precisa ser da mesma titularidade: o mesmo CPF ou CNPJ do cadastro.'; end if;
    if p_pix_tipo = 'CPF' and p_tipo <> 'pessoa' then raise exception 'Para empresa, use a chave Pix do CNPJ ou outra chave da empresa.'; end if;
    if p_pix_tipo = 'CNPJ' and p_tipo <> 'empresa' then raise exception 'Para pessoa física, use a chave Pix do seu CPF ou outra chave no seu nome.'; end if;
    if p_pix_tipo = 'E-mail' and lower(v_pix) !~ '^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$' then raise exception 'Confira a chave Pix de e-mail.'; end if;
    if p_pix_tipo = 'Telefone' and length(v_pix_num) not between 10 and 11 then raise exception 'Confira a chave Pix de telefone com DDD.'; end if;
    if p_pix_tipo = 'Chave aleatória' and lower(v_pix) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'Confira a chave aleatória.'; end if;
    if length(btrim(coalesce(p_banco, ''))) < 2 then raise exception 'Informe o banco da chave Pix.'; end if;
  end if;
  if p_acionado is null then raise exception 'Conte se podemos acionar você para os próximos eventos.'; end if;
  if not coalesce(p_aceite, false) then raise exception 'Para continuar, autorize o uso dos dados.'; end if;
  select count(*) into v_recent from public.fornecedores where created_at > now() - interval '1 minute';
  if v_recent >= 20 then raise exception 'Muitos cadastros ao mesmo tempo. Tente de novo em instantes.'; end if;
  select id into v_anterior from public.fornecedores where documento = v_doc order by created_at desc limit 1;
  insert into public.fornecedores (tipo, documento, nome, contato_nome, email, whatsapp, categoria, fornece, primeira_vez, atualizou_dados, anterior_id,
    cep, endereco, cidade_uf, pix_tipo, pix, banco, quer_ser_acionado, observacoes, aceite_em)
  values (p_tipo, v_doc, left(btrim(p_nome), 160), nullif(left(btrim(coalesce(p_contato, '')), 160), ''), v_email, left(btrim(p_whatsapp), 40), left(btrim(p_categoria), 120), left(btrim(p_fornece), 1000),
    coalesce(p_primeira_vez, true), v_dados, v_anterior,
    case when v_dados then left(btrim(p_cep), 12) end, case when v_dados then left(btrim(p_endereco), 300) end, case when v_dados then left(btrim(p_cidade), 120) end,
    case when v_dados then p_pix_tipo end, case when v_dados then left(v_pix, 120) end, case when v_dados then left(btrim(p_banco), 120) end,
    p_acionado, nullif(left(btrim(coalesce(p_observacoes, '')), 1000), ''), now());
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.communicali_cadastrar_fornecedor(boolean, text, text, text, text, text, text, text, text, boolean, text, text, text, text, text, text, boolean, text, boolean) from public;
grant execute on function public.communicali_cadastrar_fornecedor(boolean, text, text, text, text, text, text, text, text, boolean, text, text, text, text, text, text, boolean, text, boolean) to anon, authenticated;
