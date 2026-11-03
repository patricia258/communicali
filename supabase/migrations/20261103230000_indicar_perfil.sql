-- ComuniCALI (03/11/2026): um Membro com acesso à Rede pode indicar o perfil de uma pessoa para outra. Quem recebe ganha um alerta com o perfil.
alter table public.notifications drop constraint notifications_tipo_check;
alter table public.notifications add constraint notifications_tipo_check check (tipo in ('conexao', 'nivel', 'match', 'perfil'));

create or replace function public.communicali_indicar_perfil(p_perfil uuid, p_para uuid, p_mensagem text)
returns void language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare m public.members%rowtype; v_perfil text; v_msg text := nullif(left(btrim(coalesce(p_mensagem, '')), 280), '');
begin
  m := public.communicali_eu();
  if m.id is null or m.categoria not in ('conector', 'embaixador', 'fundadora', 'organizador') then raise exception 'Indicar perfis fica disponível a partir de Conector.'; end if;
  if p_perfil = p_para or p_para = m.id then raise exception 'Escolha outra pessoa para receber a indicação.'; end if;
  select nome into v_perfil from public.members where id = p_perfil and status = 'ativo' and na_rede;
  if v_perfil is null or not exists (select 1 from public.members where id = p_para and status = 'ativo') then raise exception 'Perfil indisponível.'; end if;
  if exists (select 1 from public.notifications where member_id = p_para and tipo = 'perfil' and de = p_perfil and created_at > now() - interval '1 day') then raise exception 'Essa pessoa já recebeu esse perfil hoje.'; end if;
  insert into public.notifications (member_id, tipo, texto, de)
  values (p_para, 'perfil', split_part(m.nome, ' ', 1) || ' indicou o perfil de ' || v_perfil || ' para você.' || coalesce(' "' || v_msg || '"', ''), p_perfil);
end;
$$;
revoke all on function public.communicali_indicar_perfil(uuid, uuid, text) from public, anon;
grant execute on function public.communicali_indicar_perfil(uuid, uuid, text) to authenticated;
