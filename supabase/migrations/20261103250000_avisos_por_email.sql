-- ComuniCALI (03/11/2026): avisos por e-mail. Membro recebe quando muda de nível, conclui missão ou alguém indica um perfil para ele.
-- A organização recebe um resumo simples a cada formulário preenchido e a cada inscrição em encontro.
alter table public.notifications add column if not exists email_em timestamptz;
alter table public.form_responses add column if not exists admin_avisado_em timestamptz;
alter table public.registrations add column if not exists admin_avisado_em timestamptz;
-- O que já existia não gera e-mail atrasado.
update public.notifications set email_em = now() where email_em is null;
update public.form_responses set admin_avisado_em = now() where admin_avisado_em is null;
update public.registrations set admin_avisado_em = now() where admin_avisado_em is null;

alter table public.notifications drop constraint notifications_tipo_check;
alter table public.notifications add constraint notifications_tipo_check check (tipo in ('conexao', 'nivel', 'match', 'perfil', 'missao'));

create or replace function public.communicali_aviso_missao() returns trigger language plpgsql security definer set search_path to 'pg_catalog', 'public' as $$
declare v_titulo text;
begin
  if new.status = 'concluida' and (tg_op = 'INSERT' or old.status is distinct from 'concluida') then
    select titulo into v_titulo from public.missions where slug = new.mission_slug;
    insert into public.notifications (member_id, tipo, texto) values (new.member_id, 'missao', 'Missão concluída: ' || coalesce(v_titulo, new.mission_slug) || '. O selo já está no seu passaporte.');
  end if;
  return new;
end;
$$;
revoke all on function public.communicali_aviso_missao() from public, anon, authenticated;
drop trigger if exists communicali_aviso_missao on public.member_missions;
create trigger communicali_aviso_missao after insert or update of status on public.member_missions for each row execute function public.communicali_aviso_missao();
