-- ComuniCALI (03/11/2026): dados do topo do Meu passaporte (função, empresa, temas, selos de mercado) e as reações recebidas.
create or replace function public.communicali_meu_cartao()
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog', 'public' as $$
declare m public.members%rowtype;
begin
  m := public.communicali_eu();
  if m.id is null then return null; end if;
  return jsonb_build_object('cargo', m.cargo, 'empresa', m.empresa, 'segmento', m.segmento, 'cidade_uf', m.cidade_uf, 'temas', to_jsonb(m.temas), 'interesses', to_jsonb(m.interesses),
    'aberto_trabalho', m.aberto_trabalho, 'recrutador', m.recrutador,
    'reacoes', coalesce((select jsonb_agg(jsonb_build_object('reacao', f.reacao, 'nome', split_part(a.nome, ' ', 1), 'comentario', f.comentario) order by f.created_at desc)
      from (select * from public.communicali_feedback where perfil_id = m.id and status = 'aprovado' order by created_at desc limit 20) f join public.members a on a.id = f.autor_id), '[]'::jsonb));
end;
$$;
revoke all on function public.communicali_meu_cartao() from public, anon;
grant execute on function public.communicali_meu_cartao() to authenticated;
