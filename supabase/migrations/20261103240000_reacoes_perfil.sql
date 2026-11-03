-- ComuniCALI (03/11/2026): no perfil da Rede, reações com emoji e mensagem opcional, publicadas na hora. Sem moderação da CALI; a dona do perfil pode remover.
alter table public.communicali_feedback alter column estrelas drop not null, alter column comentario drop not null, add column if not exists reacao text;
alter table public.communicali_feedback drop constraint if exists communicali_feedback_comentario_check;
alter table public.communicali_feedback add constraint communicali_feedback_comentario_tamanho check (comentario is null or char_length(comentario) <= 280);
alter table public.communicali_feedback add constraint communicali_feedback_reacao_check check (reacao is null or reacao in ('❤️', '😄', '🚀', '👏', '🤝', '💡', '🙌', '😢'));

create or replace function communicali_private.feedback_listar(p_perfil uuid) returns jsonb
language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare m public.members%rowtype;
begin
  m := communicali_private.rede_membro();
  if not exists (select 1 from public.members p where p.id = p_perfil and p.status = 'ativo' and p.na_rede) then raise exception 'Perfil indisponível.' using errcode = '42501'; end if;
  return jsonb_build_object(
    'pode_comentar', m.na_rede and m.id <> p_perfil,
    'proprio', m.id = p_perfil,
    'comentarios', coalesce((select jsonb_agg(to_jsonb(x) order by x.criado_em desc) from (
      select f.id, a.nome, f.reacao, f.estrelas, f.comentario, f.created_at as criado_em, f.autor_id = m.id as meu
      from public.communicali_feedback f join public.members a on a.id = f.autor_id
      where f.perfil_id = p_perfil and f.status = 'aprovado' and a.status = 'ativo'
      order by f.created_at desc limit 80) x), '[]'::jsonb),
    'meu', (select jsonb_build_object('id', f.id, 'reacao', f.reacao, 'comentario', f.comentario, 'status', f.status)
      from public.communicali_feedback f where f.perfil_id = p_perfil and f.autor_id = m.id and f.status = 'aprovado'));
end;
$$;

create or replace function public.communicali_reagir(p_perfil uuid, p_reacao text, p_comentario text) returns uuid
language plpgsql volatile security definer set search_path = pg_catalog, public as $$
declare m public.members%rowtype; v_id uuid; v_texto text := nullif(left(btrim(coalesce(p_comentario, '')), 280), '');
begin
  m := communicali_private.rede_membro();
  if m.id = p_perfil then raise exception 'Você não pode reagir ao seu próprio perfil.'; end if;
  if p_reacao is null or p_reacao not in ('❤️', '😄', '🚀', '👏', '🤝', '💡', '🙌', '😢') then raise exception 'Escolha uma reação.'; end if;
  if not exists (select 1 from public.members p where p.id = p_perfil and p.status = 'ativo' and p.na_rede) then raise exception 'Perfil indisponível.'; end if;
  insert into public.communicali_feedback (autor_id, perfil_id, reacao, comentario, status)
    values (m.id, p_perfil, p_reacao, v_texto, 'aprovado')
    on conflict (autor_id, perfil_id) do update set reacao = excluded.reacao, comentario = excluded.comentario, estrelas = null, status = 'aprovado', motivo = null, updated_at = clock_timestamp()
    returning id into v_id;
  insert into public.communicali_feedback_audit(feedback_id, responsavel, acao, snapshot) values (v_id, auth.uid(), 'reacao', jsonb_build_object('reacao', p_reacao, 'comentario', v_texto));
  return v_id;
end;
$$;

-- Remove a reação: quem recebeu (do próprio perfil) ou quem escreveu.
create or replace function public.communicali_remover_reacao(p_id uuid) returns void
language plpgsql volatile security definer set search_path = pg_catalog, public as $$
declare m public.members%rowtype; f public.communicali_feedback%rowtype;
begin
  m := public.communicali_eu();
  select * into f from public.communicali_feedback where id = p_id;
  if f.id is null or m.id is null or (f.perfil_id <> m.id and f.autor_id <> m.id) then raise exception 'Você não pode remover esta reação.'; end if;
  update public.communicali_feedback set status = 'oculto', motivo = case when f.perfil_id = m.id then 'Removida por quem recebeu' else 'Removida por quem escreveu' end, updated_at = clock_timestamp() where id = p_id;
  insert into public.communicali_feedback_audit(feedback_id, responsavel, acao, snapshot) values (p_id, auth.uid(), 'removida', jsonb_build_object('reacao', f.reacao, 'comentario', f.comentario));
end;
$$;
revoke all on function public.communicali_reagir(uuid, text, text), public.communicali_remover_reacao(uuid) from public, anon;
grant execute on function public.communicali_reagir(uuid, text, text), public.communicali_remover_reacao(uuid) to authenticated;
notify pgrst, 'reload schema';
