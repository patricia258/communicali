-- ComuniCALI (03/11/2026): quem pediu para parar de receber os e-mails do espaço do membro. Gravado só pelo servidor; a organização consulta no painel.
create table if not exists public.email_descadastro (
  email text primary key check (email = lower(email)),
  criado_em timestamptz not null default now()
);
alter table public.email_descadastro enable row level security;
create policy email_descadastro_admin on public.email_descadastro for select to authenticated using (public.is_admin());
create policy email_descadastro_admin_apaga on public.email_descadastro for delete to authenticated using (public.is_admin());
grant select, delete on public.email_descadastro to authenticated;
