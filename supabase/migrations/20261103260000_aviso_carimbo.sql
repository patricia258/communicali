-- ComuniCALI (03/11/2026): cada check-in gera o alerta "Novo carimbo" e o e-mail com a imagem do carimbo da edição.
alter table public.notifications drop constraint notifications_tipo_check;
alter table public.notifications add constraint notifications_tipo_check check (tipo in ('conexao', 'nivel', 'match', 'perfil', 'missao', 'carimbo'));

create or replace function public.communicali_aviso_carimbo() returns trigger language plpgsql security definer set search_path to 'pg_catalog', 'public' as $$
declare v_titulo text;
begin
  select titulo into v_titulo from public.editions where id = new.edition_id and slug <> 'teste' and slug not like 'demo%';
  if v_titulo is not null then
    insert into public.notifications (member_id, tipo, texto) values (new.member_id, 'carimbo', 'Novo carimbo no seu passaporte: ' || v_titulo || '.');
  end if;
  return new;
end;
$$;
revoke all on function public.communicali_aviso_carimbo() from public, anon, authenticated;
drop trigger if exists communicali_aviso_carimbo on public.checkins;
create trigger communicali_aviso_carimbo after insert on public.checkins for each row execute function public.communicali_aviso_carimbo();
