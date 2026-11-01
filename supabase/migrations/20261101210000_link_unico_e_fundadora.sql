-- CommuniCALI (01/11/2026): link permanente de check-in, perfil de fundadora e Rede coberta pela política de privacidade.

alter table public.members drop constraint members_categoria_check;
alter table public.members add constraint members_categoria_check
  check (categoria in ('fundadora', 'membro', 'conector', 'embaixador', 'convidado', 'organizador', 'kids'));

-- A Rede vem com a aceitação da política; a pessoa pode sair pelo próprio perfil.
alter table public.members alter column na_rede set default true;
update public.members set na_rede = true;

create or replace function public.communicali_categoria_fundadora() returns trigger
language plpgsql set search_path to 'pg_catalog', 'public' as $$
begin
  if new.email in ('contato@calirh.com', 'patricia@calirh.com') then new.categoria := 'fundadora'; end if;
  return new;
end;
$$;
create trigger members_fundadora before insert on public.members for each row execute function public.communicali_categoria_fundadora();

-- A edição do momento: com check-in aberto, senão a próxima, senão a mais recente.
create or replace function public.communicali_edicao_atual()
returns text language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select coalesce(
    (select slug from public.editions where publica and now() between checkin_abre and checkin_fecha order by checkin_abre limit 1),
    (select slug from public.editions where publica and checkin_fecha > now() order by checkin_abre limit 1),
    (select slug from public.editions where publica order by data_evento desc limit 1));
$$;
grant execute on function public.communicali_edicao_atual() to anon, authenticated;

-- Dados da página de inscrição, inclusive de edição fora do site quando as inscrições estão abertas (teste da organização).
create or replace function public.communicali_edicao_inscricao(p_slug text)
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select jsonb_build_object('id', e.id, 'slug', e.slug, 'numero', e.numero, 'titulo', e.titulo, 'data_evento', e.data_evento, 'horario', e.horario, 'local', e.local, 'cidade', e.cidade, 'endereco', e.endereco, 'capa_url', e.capa_url, 'resumo', e.resumo, 'fotos_url', e.fotos_url, 'inscricao_url', e.inscricao_url, 'inscricoes_abertas', e.inscricoes_abertas)
    from public.editions e where e.slug = lower(btrim(coalesce(p_slug, ''))) and (e.publica or e.inscricoes_abertas);
$$;
grant execute on function public.communicali_edicao_inscricao(text) to anon, authenticated;

update public.editions set inscricoes_abertas = true where slug = 'teste';

create or replace function public.communicali_rede()
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog', 'public' as $$
declare m public.members%rowtype; v_contatos boolean;
begin
  m := public.communicali_eu();
  if m.id is null or not exists (select 1 from public.checkins where member_id = m.id) then raise exception 'A Rede abre depois do primeiro encontro presencial.'; end if;
  v_contatos := m.categoria in ('fundadora', 'conector', 'embaixador', 'organizador');
  return jsonb_build_object(
    'pode_ver_contatos', v_contatos,
    'pessoas', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'foto_url', p.foto_url, 'categoria', p.categoria, 'cidade_uf', p.cidade_uf, 'empresa', p.empresa, 'cargo', p.cargo, 'temas', to_jsonb(p.temas), 'interesses', to_jsonb(p.interesses), 'presta_servicos', p.presta_servicos)
        || case when v_contatos then jsonb_build_object('whatsapp', p.whatsapp, 'email', p.email, 'instagram', p.instagram, 'linkedin', p.linkedin) else '{}'::jsonb end order by p.nome)
      from public.members p where p.na_rede and p.status = 'ativo' and exists (select 1 from public.checkins c where c.member_id = p.id)), '[]'::jsonb),
    'parceiros', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'nome', x.nome, 'logo_url', x.logo_url, 'site_url', x.site_url) order by x.ordem, x.nome) from public.partners x where x.ativo), '[]'::jsonb));
end;
$$;
revoke all on function public.communicali_rede() from public, anon;
grant execute on function public.communicali_rede() to authenticated;
