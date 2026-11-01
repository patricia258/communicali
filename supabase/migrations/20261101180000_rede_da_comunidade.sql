-- CommuniCALI (01/11/2026): Rede da comunidade. Só aparece quem escolher aparecer; contatos só para Conector, Embaixador e organização.

alter table public.members
  add column instagram text,
  add column na_rede boolean not null default false,
  add column presta_servicos boolean not null default false;

create or replace function public.communicali_meus_contatos()
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select jsonb_build_object('whatsapp', m.whatsapp, 'instagram', m.instagram, 'cidade_uf', m.cidade_uf, 'interesses', to_jsonb(m.interesses), 'na_rede', m.na_rede, 'presta_servicos', m.presta_servicos)
    from public.members m where m.id = (public.communicali_eu()).id;
$$;
revoke all on function public.communicali_meus_contatos() from public, anon;
grant execute on function public.communicali_meus_contatos() to authenticated;

drop function public.communicali_salvar_perfil(text, text[], boolean, text);
create function public.communicali_salvar_perfil(p_foto_url text, p_temas text[], p_interesses text[], p_interesse boolean, p_linkedin text, p_whatsapp text, p_instagram text, p_cidade_uf text, p_na_rede boolean, p_presta boolean)
returns void language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare m public.members%rowtype; v_foto text := nullif(btrim(coalesce(p_foto_url, '')), '');
begin
  m := public.communicali_eu();
  if m.id is null then raise exception 'Entre novamente para salvar.'; end if;
  if v_foto is not null and v_foto is distinct from m.foto_url and v_foto not like 'https://cyyrrtekbkltdiatixhp.supabase.co/storage/v1/object/public/site/membros/' || auth.uid()::text || '/%' then
    raise exception 'Envie a foto novamente.';
  end if;
  update public.members set foto_url = v_foto, interesse_palestras = coalesce(p_interesse, false), updated_at = now(),
    linkedin = nullif(left(btrim(coalesce(p_linkedin, '')), 240), ''),
    whatsapp = nullif(left(btrim(coalesce(p_whatsapp, '')), 40), ''),
    instagram = nullif(left(btrim(coalesce(p_instagram, '')), 120), ''),
    cidade_uf = nullif(left(btrim(coalesce(p_cidade_uf, '')), 120), ''),
    na_rede = coalesce(p_na_rede, false), presta_servicos = coalesce(p_presta, false),
    temas = coalesce((select array_agg(distinct t) from (select left(btrim(x), 60) as t from unnest(coalesce(p_temas, '{}')) x limit 20) s where t <> ''), '{}'),
    interesses = coalesce((select array_agg(distinct t) from (select left(btrim(x), 60) as t from unnest(coalesce(p_interesses, '{}')) x limit 20) s where t <> ''), '{}')
   where id = m.id;
end;
$$;
revoke all on function public.communicali_salvar_perfil(text, text[], text[], boolean, text, text, text, text, boolean, boolean) from public, anon;
grant execute on function public.communicali_salvar_perfil(text, text[], text[], boolean, text, text, text, text, boolean, boolean) to authenticated;

create or replace function public.communicali_rede()
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog', 'public' as $$
declare m public.members%rowtype; v_contatos boolean;
begin
  m := public.communicali_eu();
  if m.id is null or not exists (select 1 from public.checkins where member_id = m.id) then raise exception 'A Rede abre depois do primeiro encontro presencial.'; end if;
  v_contatos := m.categoria in ('conector', 'embaixador', 'organizador');
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
