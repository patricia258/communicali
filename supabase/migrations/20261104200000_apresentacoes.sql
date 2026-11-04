-- Modo apresentação: slides exportados do Canva (imagens no bucket site), pausas com enquete e a enquete aberta agora.
-- O público usa um único link (/votar?ao-vivo=<id>), que sempre mostra a enquete aberta pela apresentação.
create table if not exists public.apresentacoes (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid references public.editions(id) on delete set null,
  titulo text not null default 'Apresentação',
  slides text[] not null default '{}',
  pausas jsonb not null default '[]',
  poll_atual uuid references public.polls(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.apresentacoes enable row level security;
drop policy if exists apresentacoes_admin on public.apresentacoes;
create policy apresentacoes_admin on public.apresentacoes for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Para o celular de quem vota: qual enquete está aberta agora (só o slug, nada mais).
create or replace function public.communicali_ao_vivo(p_id uuid)
returns text language sql stable security definer set search_path = pg_catalog, public as $$
  select p.slug from public.apresentacoes a join public.polls p on p.id = a.poll_atual where a.id = p_id and p.status = 'ativa';
$$;
revoke all on function public.communicali_ao_vivo(uuid) from public;
grant execute on function public.communicali_ao_vivo(uuid) to anon, authenticated;
