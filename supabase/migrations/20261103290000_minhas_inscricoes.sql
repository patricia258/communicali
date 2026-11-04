-- ComuniCALI (03/11/2026): encontros em que a pessoa tem inscrição confirmada, para mostrar o "Cartão de embarque" no Meu passaporte.
create or replace function public.communicali_minhas_inscricoes()
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select coalesce(jsonb_agg(e.slug), '[]'::jsonb) from public.registrations r join public.editions e on e.id = r.edition_id
   where r.email = lower((select email from auth.users where id = auth.uid())) and r.status = 'inscrito';
$$;
revoke all on function public.communicali_minhas_inscricoes() from public, anon;
grant execute on function public.communicali_minhas_inscricoes() to authenticated;
