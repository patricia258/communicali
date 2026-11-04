-- Excluir edição (testes e demonstrações): apaga junto votações, votos, presenças, milhas da edição, inscrições,
-- convidados, fotos e o registro de e-mails. Só administradoras.
create or replace function public.communicali_excluir_edicao(p_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_titulo text;
begin
  if not public.is_admin() then raise exception 'Somente a organização pode excluir edições.'; end if;
  select titulo into v_titulo from public.editions where id = p_id;
  if v_titulo is null then raise exception 'Edição não encontrada.'; end if;
  delete from public.poll_votes where poll_id in (select id from public.polls where edition_id = p_id);
  delete from public.polls where edition_id = p_id;
  delete from public.point_events where edition_id = p_id;
  delete from public.checkins where edition_id = p_id;
  delete from public.guests where edition_id = p_id;
  delete from public.registrations where edition_id = p_id;
  delete from public.edition_photos where edition_id = p_id;
  delete from public.editions where id = p_id;
  return jsonb_build_object('ok', true, 'titulo', v_titulo);
end;
$$;
revoke all on function public.communicali_excluir_edicao(uuid) from public;
grant execute on function public.communicali_excluir_edicao(uuid) to authenticated;
