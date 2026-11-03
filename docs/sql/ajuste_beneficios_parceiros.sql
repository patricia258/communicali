-- RASCUNHO, NÃO APLICADO. Exclusivo ComuniCALI cyyrrtekbkltdiatixhp.
-- Requer etapa_6_parceiros_feedback.sql. Conferir schema real antes de formalizar migração.
-- Não cria vantagens fictícias e não atribui descontos aos parceiros existentes.
begin;
alter table public.communicali_partner_profiles
  add column beneficio text check(char_length(beneficio) <= 120),
  add column desconto text check(char_length(desconto) <= 40),
  add column beneficio_detalhes text check(char_length(beneficio_detalhes) <= 1000),
  add column cupom text check(char_length(cupom) <= 60);
-- Mantém a mesma barreira da Rede, autorização administrativa, RLS e API pública invoker.
create or replace function communicali_private.rede_perfis() returns jsonb
language plpgsql stable security definer set search_path = pg_catalog, public as $$
begin
  perform communicali_private.rede_membro();
  return coalesce((select jsonb_agg(jsonb_build_object(
    'partner_id', f.partner_id, 'logo_original_url', f.logo_original_url, 'descricao', f.descricao,
    'whatsapp', f.whatsapp, 'email', f.email, 'instagram', f.instagram, 'linkedin', f.linkedin,
    'beneficio', f.beneficio, 'desconto', f.desconto, 'beneficio_detalhes', f.beneficio_detalhes, 'cupom', f.cupom)
    order by p.ordem, p.nome)
    from public.communicali_partner_profiles f join public.partners p on p.id = f.partner_id where p.ativo), '[]'::jsonb);
end;
$$;
revoke all on function communicali_private.rede_perfis() from public, anon, authenticated;
grant execute on function communicali_private.rede_perfis() to authenticated;
notify pgrst, 'reload schema';
commit;
