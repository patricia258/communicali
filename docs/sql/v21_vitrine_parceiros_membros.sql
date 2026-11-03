-- RASCUNHO DE INTEGRAÇÃO. NÃO APLICADO. Destino exclusivo: cyyrrtekbkltdiatixhp.
-- Antes de formalizar migração: inspecionar schema real, confirmar papéis elegíveis e
-- que communicali_eu resolve a identidade autenticada/ativa como no pacote fornecido.
-- Só empresas já públicas/ativas. Sem cupom, perfil pessoal, tracking ou novos contatos.
begin;
create schema if not exists communicali_private;
revoke all on schema communicali_private from public;
grant usage on schema communicali_private to authenticated;

create or replace function communicali_private.vitrine_membros()
returns jsonb language plpgsql stable security definer
set search_path = '' as $$
declare m public.members%rowtype;
begin
  if auth.uid() is null then raise exception 'Entre novamente.' using errcode = '42501'; end if;
  m := public.communicali_eu();
  if m.id is null or m.status is distinct from 'ativo'
     or m.categoria is null
     or m.categoria not in ('membro','conector','embaixador','fundadora','organizador') then
    raise exception 'Disponível para Membros com cadastro ativo.' using errcode = '42501';
  end if;
  return pg_catalog.jsonb_build_object('versao', 1, 'parceiros', coalesce((
    select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'id', p.id, 'nome', p.nome, 'logo_url', p.logo_url, 'site_url', p.site_url
    ) order by p.nome, p.id)
    from public.partners p where p.ativo = true
  ), '[]'::jsonb));
end;
$$;
revoke all on function communicali_private.vitrine_membros() from public, anon, authenticated;
grant execute on function communicali_private.vitrine_membros() to authenticated;

create or replace function public.communicali_parceiros_membros()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select communicali_private.vitrine_membros();
$$;
revoke all on function public.communicali_parceiros_membros() from public, anon, authenticated;
grant execute on function public.communicali_parceiros_membros() to authenticated;
commit;
