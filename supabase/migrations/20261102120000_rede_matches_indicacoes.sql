-- CommuniCALI (02/11/2026): Rede só a partir de Conector, segmento e região, buscas, matches aprovados pela organização,
-- convite de conexão com aceitar ou recusar e indicações com acompanhamento.

alter table public.members
  add column segmento text,
  add column regiao text,
  add column busca text[] not null default '{}';

alter table public.connections add column recusada boolean not null default false;

alter table public.notifications drop constraint notifications_tipo_check;
alter table public.notifications add constraint notifications_tipo_check check (tipo in ('conexao', 'nivel', 'match'));

alter table public.registrations add column aviso_indicador boolean not null default false;

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  a uuid not null references public.members(id) on delete cascade,
  b uuid not null references public.members(id) on delete cascade,
  motivo text not null,
  cali boolean not null default false,
  status text not null default 'sugerido' check (status in ('sugerido', 'liberado', 'recusado')),
  created_at timestamptz not null default now(),
  decidido_em timestamptz,
  unique (a, b, motivo),
  check (a <> b)
);
alter table public.matches enable row level security;
create policy matches_admin on public.matches for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.matches to authenticated;
grant select, update on public.matches to service_role;

-- Procura o que a pessoa busca em quem faz aquilo. Temas ligados aos serviços da CALI viram match com a fundadora.
create or replace function public.communicali_gerar_matches(p_member uuid)
returns void language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare m public.members%rowtype; f uuid; t text; v_novos integer := 0; v_linhas integer;
  v_cali constant text[] := array['Treinamento e desenvolvimento','Treinamento de liderança','Treinamento de atendimento','Treinamento de vendas','Desenvolvimento de líderes','Consultoria de RH','RH estratégico','Recrutamento e seleção','Cargos e salários','Remuneração e benefícios','Cultura e clima','Pesquisa de clima','Departamento pessoal','Onboarding e integração','Avaliação de desempenho','Palestras','Coaching e mentoria'];
begin
  select * into m from public.members where id = p_member;
  if m.id is null or m.status <> 'ativo' then return; end if;
  select id into f from public.members where categoria = 'fundadora' order by email limit 1;
  foreach t in array m.busca loop
    if f is not null and f <> m.id and t = any(v_cali) then
      insert into public.matches (a, b, motivo, cali) values (m.id, f, t, true) on conflict do nothing;
      get diagnostics v_linhas = row_count;
      v_novos := v_novos + v_linhas;
    end if;
    insert into public.matches (a, b, motivo)
      select m.id, p.id, t from public.members p
       where p.id <> m.id and p.id is distinct from f and p.status = 'ativo' and t = any(p.temas)
      on conflict do nothing;
  end loop;
  if v_novos > 0 and f is not null then
    insert into public.notifications (member_id, tipo, texto, de)
    values (f, 'match', split_part(m.nome, ' ', 1) || ' busca algo ligado aos serviços da CALI. Veja em Matches no painel.', m.id);
  end if;
end;
$$;
revoke all on function public.communicali_gerar_matches(uuid) from public, anon, authenticated;

create or replace function public.communicali_meus_contatos()
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select jsonb_build_object('whatsapp', m.whatsapp, 'instagram', m.instagram, 'cidade_uf', m.cidade_uf, 'interesses', to_jsonb(m.interesses), 'na_rede', m.na_rede, 'presta_servicos', m.presta_servicos, 'segmento', m.segmento, 'regiao', m.regiao, 'busca', to_jsonb(m.busca))
    from public.members m where m.id = (public.communicali_eu()).id;
$$;

drop function public.communicali_salvar_perfil(text, text[], text[], boolean, text, text, text, text, boolean, boolean);
create function public.communicali_salvar_perfil(p_foto_url text, p_temas text[], p_interesses text[], p_busca text[], p_interesse boolean, p_linkedin text, p_whatsapp text, p_instagram text, p_cidade_uf text, p_segmento text, p_regiao text, p_na_rede boolean, p_presta boolean)
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
    segmento = nullif(left(btrim(coalesce(p_segmento, '')), 80), ''),
    regiao = nullif(left(btrim(coalesce(p_regiao, '')), 80), ''),
    na_rede = coalesce(p_na_rede, false), presta_servicos = coalesce(p_presta, false),
    temas = coalesce((select array_agg(distinct t) from (select left(btrim(x), 60) as t from unnest(coalesce(p_temas, '{}')) x limit 30) s where t <> ''), '{}'),
    interesses = coalesce((select array_agg(distinct t) from (select left(btrim(x), 60) as t from unnest(coalesce(p_interesses, '{}')) x limit 30) s where t <> ''), '{}'),
    busca = coalesce((select array_agg(distinct t) from (select left(btrim(x), 60) as t from unnest(coalesce(p_busca, '{}')) x limit 30) s where t <> ''), '{}')
   where id = m.id;
  perform public.communicali_gerar_matches(m.id);
end;
$$;
revoke all on function public.communicali_salvar_perfil(text, text[], text[], text[], boolean, text, text, text, text, text, text, boolean, boolean) from public, anon;
grant execute on function public.communicali_salvar_perfil(text, text[], text[], text[], boolean, text, text, text, text, text, text, boolean, boolean) to authenticated;

create or replace function public.communicali_ficha(p public.members, p_contatos boolean, p_eu uuid)
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select jsonb_build_object('id', p.id, 'nome', p.nome, 'foto_url', p.foto_url, 'categoria', p.categoria, 'cidade_uf', p.cidade_uf, 'regiao', p.regiao, 'segmento', p.segmento, 'empresa', p.empresa, 'cargo', p.cargo, 'temas', to_jsonb(p.temas), 'interesses', to_jsonb(p.interesses), 'busca', to_jsonb(p.busca), 'presta_servicos', p.presta_servicos,
      'eu_conectei', exists (select 1 from public.connections c where c.de = p_eu and c.para = p.id), 'me_conectou', exists (select 1 from public.connections c where c.de = p.id and c.para = p_eu and not c.recusada))
    || case when p_contatos then jsonb_build_object('whatsapp', p.whatsapp, 'email', p.email, 'instagram', p.instagram, 'linkedin', p.linkedin) else '{}'::jsonb end;
$$;
revoke all on function public.communicali_ficha(public.members, boolean, uuid) from public, anon, authenticated;

-- Só Conector, Embaixador, organização e fundadora recebem a lista. Para os demais o servidor manda apenas a contagem.
create or replace function public.communicali_rede()
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog', 'public' as $$
declare m public.members%rowtype; v_acesso boolean;
begin
  m := public.communicali_eu();
  if m.id is null or not exists (select 1 from public.checkins where member_id = m.id) then raise exception 'A Rede abre depois do primeiro encontro presencial.'; end if;
  v_acesso := m.categoria in ('fundadora', 'conector', 'embaixador', 'organizador');
  if not v_acesso then
    return jsonb_build_object('eu', m.id, 'acesso', false, 'total', (select count(*) from public.members p where p.na_rede and p.status = 'ativo'), 'pessoas', '[]'::jsonb, 'parceiros', '[]'::jsonb);
  end if;
  return jsonb_build_object('eu', m.id, 'acesso', true,
    'pessoas', coalesce((select jsonb_agg(public.communicali_ficha(p, true, m.id)
        order by case p.categoria when 'fundadora' then 0 when 'embaixador' then 1 when 'conector' then 2 when 'membro' then 3 when 'organizador' then 4 else 9 end, p.nome)
      from public.members p where p.na_rede and p.status = 'ativo' and exists (select 1 from public.checkins c where c.member_id = p.id)), '[]'::jsonb),
    'parceiros', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'nome', x.nome, 'logo_url', x.logo_url, 'site_url', x.site_url) order by x.ordem, x.nome) from public.partners x where x.ativo), '[]'::jsonb));
end;
$$;

-- Perfil aberto por convite de conexão ou match liberado, mesmo para quem ainda não tem a Rede.
create or replace function public.communicali_perfil(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog', 'public' as $$
declare m public.members%rowtype; p public.members%rowtype; v_nivel boolean;
begin
  m := public.communicali_eu();
  if m.id is null then raise exception 'Entre novamente.'; end if;
  select * into p from public.members where id = p_id and status = 'ativo';
  if p.id is null then raise exception 'Perfil indisponível.'; end if;
  v_nivel := m.categoria in ('fundadora', 'conector', 'embaixador', 'organizador');
  if not (v_nivel or exists (select 1 from public.connections c where c.para = m.id and c.de = p.id) or exists (select 1 from public.connections c where c.de = m.id and c.para = p.id)
    or exists (select 1 from public.matches x where x.status = 'liberado' and ((x.a = m.id and x.b = p.id) or (x.b = m.id and x.a = p.id)))) then
    raise exception 'Perfil disponível a partir de Conector.';
  end if;
  return public.communicali_ficha(p, v_nivel, m.id);
end;
$$;
revoke all on function public.communicali_perfil(uuid) from public, anon;
grant execute on function public.communicali_perfil(uuid) to authenticated;

create or replace function public.communicali_recusar_conexao(p_de uuid)
returns void language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare m public.members%rowtype;
begin
  m := public.communicali_eu();
  if m.id is null then raise exception 'Entre novamente.'; end if;
  update public.connections set recusada = true where de = p_de and para = m.id;
  update public.notifications set lida = true where member_id = m.id and de = p_de and tipo = 'conexao';
end;
$$;
revoke all on function public.communicali_recusar_conexao(uuid) from public, anon;
grant execute on function public.communicali_recusar_conexao(uuid) to authenticated;

create or replace function public.communicali_indicar_visitante(p_nome text, p_email text, p_whatsapp text, p_cargo text)
returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare m public.members%rowtype; e public.editions%rowtype; v_email text := lower(btrim(coalesce(p_email, '')));
begin
  m := public.communicali_eu();
  if m.id is null then raise exception 'Entre novamente para indicar.'; end if;
  select * into e from public.editions where publica and inscricoes_abertas and data_evento >= (now() at time zone 'America/Sao_Paulo')::date order by data_evento limit 1;
  if e.id is null then raise exception 'As inscrições do próximo encontro ainda não abriram.'; end if;
  if length(btrim(coalesce(p_nome, ''))) < 2 then raise exception 'Informe o nome da pessoa.'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Confira o e-mail da pessoa.'; end if;
  if v_email = m.email then raise exception 'Você não pode indicar a si mesmo.'; end if;
  if exists (select 1 from public.registrations where edition_id = e.id and email = v_email and status <> 'cancelado') then raise exception 'Esta pessoa já está inscrita neste encontro.'; end if;
  insert into public.registrations (edition_id, nome, email, whatsapp, cidade, cargo, status, indicado_por)
  values (e.id, left(btrim(p_nome), 160), v_email, left(btrim(coalesce(p_whatsapp, '')), 40), '', nullif(left(btrim(coalesce(p_cargo, '')), 160), ''), 'analise', m.id)
  on conflict (edition_id, email) do update set status = 'analise', indicado_por = m.id;
  return jsonb_build_object('slug', e.slug);
end;
$$;
revoke all on function public.communicali_indicar_visitante(text, text, text, text) from public, anon;
grant execute on function public.communicali_indicar_visitante(text, text, text, text) to authenticated;

create or replace function public.communicali_meu_extra()
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog', 'public' as $$
declare m public.members%rowtype;
begin
  m := public.communicali_eu();
  if m.id is null then return null; end if;
  return jsonb_build_object(
    'extrato', coalesce((select jsonb_agg(jsonb_build_object('acao', p.acao, 'pontos', p.pontos, 'motivo', p.motivo, 'titulo', e.titulo, 'data', coalesce(e.data_evento, (p.created_at at time zone 'America/Sao_Paulo')::date)) order by coalesce(e.data_evento, (p.created_at at time zone 'America/Sao_Paulo')::date) desc, p.pontos desc)
      from public.point_events p left join public.editions e on e.id = p.edition_id where p.member_id = m.id), '[]'::jsonb),
    'avisos', coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'tipo', n.tipo, 'texto', n.texto, 'de', n.de, 'foto_url', d.foto_url,
        'pode_voltar', n.tipo = 'conexao' and n.de is not null and not exists (select 1 from public.connections c where c.de = m.id and c.para = n.de)) order by n.created_at desc)
      from public.notifications n left join public.members d on d.id = n.de where n.member_id = m.id and not n.lida), '[]'::jsonb),
    'sugestoes', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'nome', o.nome, 'foto_url', o.foto_url, 'segmento', o.segmento, 'motivo', x.motivo) order by x.decidido_em desc)
      from public.matches x join public.members o on o.id = case when x.a = m.id then x.b else x.a end where x.status = 'liberado' and (x.a = m.id or x.b = m.id)), '[]'::jsonb),
    'indicados', coalesce((select jsonb_agg(jsonb_build_object('nome', r.nome, 'cargo', r.cargo, 'empresa', r.empresa, 'edicao', e.titulo, 'data', e.data_evento, 'status', r.status,
        'compareceu', exists (select 1 from public.point_events p where p.member_id = m.id and p.acao = 'indicacao:' || r.id::text)) order by r.created_at desc)
      from public.registrations r join public.editions e on e.id = r.edition_id where r.indicado_por = m.id), '[]'::jsonb),
    'conexoes', (select count(*) from public.connections a join public.connections b on a.de = b.para and a.para = b.de where a.de = m.id),
    'nivel_novo', case when m.categoria in ('conector', 'embaixador') and m.nivel_visto is distinct from m.categoria then m.categoria end);
end;
$$;

-- A Rede agora é restrita a quem tem acesso; a política acompanha essa regra.
update public.site_settings set privacidade_texto = replace(privacidade_texto,
  'Outros membros veem seu nome, foto, cidade, cargo, empresa, o que você faz e seus interesses, e quem oferece serviços aparece também em Parceiros e prestadores. WhatsApp, e-mail, Instagram e LinkedIn ficam visíveis apenas para Conectores, Embaixadores e organização.',
  'Conectores, Embaixadores e organização veem seu nome, foto, cidade, região, segmento, cargo, empresa, o que você faz, o que você busca, seus interesses e seus contatos, e quem oferece serviços aparece também em Parceiros e prestadores. Quando a organização libera uma sugestão de conexão, ou quando alguém pede conexão com você, as duas pessoas podem ver o perfil uma da outra.');
update public.site_settings set privacidade_texto = replace(privacidade_texto,
  'Quem indica uma pessoa vê no próprio espaço o primeiro nome dela e se ela compareceu ao encontro,',
  'Quem indica uma pessoa vê no próprio espaço o nome, o cargo, a empresa, a edição e a situação da inscrição dela,');
grant select, insert, update on public.notifications to service_role;
