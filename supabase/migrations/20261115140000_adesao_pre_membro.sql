-- Regras v23 (15/11/2026): estágio de entrada, contador pré-Membro e pedido de adesão. Só acrescenta; nada é apagado nem alterado nos dados existentes, exceto marcar os membros atuais como aprovados (legado).
alter table public.members
  add column if not exists estagio_entrada text check (estagio_entrada in ('convidado', 'visitante')),
  add column if not exists adesao_status text check (adesao_status in ('solicitada', 'em_analise', 'ajustes', 'aprovada', 'nao_aprovada')),
  add column if not exists adesao_origem text,
  add column if not exists adesao_solicitada_em timestamptz,
  add column if not exists adesao_decidida_em timestamptz,
  add column if not exists adesao_motivo text,
  add column if not exists na_comunidade_whatsapp boolean not null default false,
  add column if not exists na_comunidade_whatsapp_em timestamptz;

-- Atividade aberta e gratuita conta para o limite de 2 presenças; paga ou especial marca como não elegível.
alter table public.editions add column if not exists elegivel_pre_membro boolean not null default true;

-- Quem já era membro antes da regra continua membro.
update public.members set adesao_status = 'aprovada', adesao_origem = 'legado' where adesao_status is null;

create table if not exists public.adesao_log (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  de text,
  para text not null,
  motivo text,
  por text,
  em timestamptz not null default now()
);
alter table public.adesao_log enable row level security;
drop policy if exists adesao_log_admin on public.adesao_log;
create policy adesao_log_admin on public.adesao_log for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Ficha calculada: estágio, presenças antes da adesão e limite automático (2). Respeita o acesso de quem consulta.
create or replace view public.members_ficha with (security_invoker = on) as
select
  m.id as member_id,
  case when m.adesao_status = 'aprovada' then 'membro' else coalesce(m.estagio_entrada, 'visitante') end as estagio,
  case when m.adesao_origem = 'legado' then 0 else (
    select count(*)::int from public.checkins c join public.editions e on e.id = c.edition_id
    where c.member_id = m.id and e.elegivel_pre_membro and (m.adesao_decidida_em is null or c.checked_in_at < m.adesao_decidida_em)
  ) end as presencas_pre_membro,
  2 as limite_pre_membro,
  m.adesao_status is distinct from 'aprovada' and (
    select count(*) from public.checkins c join public.editions e on e.id = c.edition_id
    where c.member_id = m.id and e.elegivel_pre_membro
  ) >= 2 as limite_atingido
from public.members m;

create or replace function public.communicali_decidir_adesao(p_member uuid, p_status text, p_motivo text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_antes text;
begin
  if not public.is_admin() then raise exception 'Sem acesso.'; end if;
  if p_status not in ('em_analise', 'ajustes', 'aprovada', 'nao_aprovada') then raise exception 'Situação inválida.'; end if;
  if p_status in ('ajustes', 'nao_aprovada') and coalesce(trim(p_motivo), '') = '' then raise exception 'Informe o motivo.'; end if;
  select adesao_status into v_antes from public.members where id = p_member for update;
  update public.members set
    adesao_status = p_status,
    adesao_motivo = nullif(trim(p_motivo), ''),
    adesao_solicitada_em = coalesce(adesao_solicitada_em, now()),
    adesao_decidida_em = case when p_status in ('aprovada', 'nao_aprovada') then now() else adesao_decidida_em end,
    adesao_origem = coalesce(adesao_origem, 'pedido'),
    updated_at = now()
  where id = p_member;
  insert into public.adesao_log (member_id, de, para, motivo, por) values (p_member, v_antes, p_status, nullif(trim(p_motivo), ''), (select email from auth.users where id = auth.uid()));
end $$;
revoke all on function public.communicali_decidir_adesao(uuid, text, text) from public, anon;
grant execute on function public.communicali_decidir_adesao(uuid, text, text) to authenticated;
