-- Brinde para quem compartilha o card "Eu vou!" marcando a CALI: a pessoa avisa que compartilhou, a organização
-- sabe quantos mimos preparar e confere o post na recepção. Uma linha por pessoa e edição.
create table if not exists public.compartilhamentos (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions(id) on delete cascade,
  email text not null,
  nome text,
  redes text[] not null default '{}',
  entregue_em timestamptz,
  created_at timestamptz not null default now(),
  unique (edition_id, email)
);
alter table public.compartilhamentos enable row level security;
drop policy if exists compartilhamentos_admin on public.compartilhamentos;
create policy compartilhamentos_admin on public.compartilhamentos for all to authenticated using (public.is_admin()) with check (public.is_admin());
