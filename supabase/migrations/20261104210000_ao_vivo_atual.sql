-- Quem digita só comuni.calirh.com/votar cai na enquete aberta pela apresentação do momento.
create or replace function public.communicali_ao_vivo_atual()
returns uuid language sql stable security definer set search_path = pg_catalog, public as $$
  select a.id from public.apresentacoes a join public.polls p on p.id = a.poll_atual where p.status = 'ativa' order by a.updated_at desc limit 1;
$$;
revoke all on function public.communicali_ao_vivo_atual() from public;
grant execute on function public.communicali_ao_vivo_atual() to anon, authenticated;
