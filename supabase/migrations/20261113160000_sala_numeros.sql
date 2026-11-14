-- Telão de votação: quantas pessoas já chegaram (check-in pelo QR ou marcadas na recepção) e quantas estão confirmadas.
create or replace function public.communicali_sala_numeros(p_slug text) returns jsonb
language plpgsql stable security definer set search_path to 'pg_catalog','public' as $$
declare v_token uuid; v_lista jsonb;
begin
  select d.token_apoio into v_token from public.dinamicas d join public.editions e on e.id = d.edition_id where e.slug = lower(btrim(coalesce(p_slug, '')));
  if v_token is null then return jsonb_build_object('presentes', 0, 'confirmados', 0); end if;
  v_lista := public.communicali_apoio_lista(v_token);
  return jsonb_build_object('presentes', (select count(*) from jsonb_array_elements(v_lista) e where e ->> 'chegou_em' is not null), 'confirmados', jsonb_array_length(v_lista));
end $$;
grant execute on function public.communicali_sala_numeros(text) to anon, authenticated;
