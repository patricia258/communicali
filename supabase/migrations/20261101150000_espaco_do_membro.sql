-- CommuniCALI (01/11/2026): espaço do membro. Trilha Visitante, Membro, Conector e Embaixador, código de indicação,
-- missões, recomendações, perfil com temas e foto. Tudo lê o e-mail da sessão, nunca um e-mail enviado pela tela.

alter table public.members drop constraint members_categoria_check;
update public.members set categoria = 'membro' where categoria = 'participante_ativo';
alter table public.members add constraint members_categoria_check
  check (categoria in ('membro', 'conector', 'embaixador', 'convidado', 'organizador', 'kids'));

alter table public.members
  add column foto_url text,
  add column codigo text unique check (codigo ~ '^[A-Z0-9-]{4,20}$'),
  add column temas text[] not null default '{}',
  add column interesse_palestras boolean not null default false;

alter table public.editions add column carimbo_url text;
update public.editions set carimbo_url = '/selos/carimbo-fundadora.png' where slug = 'fundadora';

alter table public.registrations add column indicado_por uuid references public.members(id) on delete set null;

create table public.missions (
  slug text primary key,
  titulo text not null,
  descricao text not null,
  nivel text not null check (nivel in ('conector', 'embaixador', 'livre')),
  modo text not null check (modo in ('automatica', 'analise', 'convite')),
  ordem integer not null
);
alter table public.missions enable row level security;
create policy missions_read on public.missions for select to anon, authenticated using (true);
create policy missions_admin on public.missions for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.missions to anon, authenticated;
grant insert, update, delete on public.missions to authenticated;

insert into public.missions (slug, titulo, descricao, nivel, modo, ordem) values
  ('convidados', 'Traga dois visitantes que compareceram', 'Conta automaticamente quando as pessoas indicadas fazem o check-in.', 'conector', 'automatica', 1),
  ('conexao', 'Faça uma conexão que gere resultado', 'Apresente alguém relevante e conte o que aconteceu depois.', 'conector', 'analise', 2),
  ('lugar', 'Recomende um lugar validado', 'Conta quando a organização valida a sua recomendação.', 'livre', 'automatica', 3),
  ('palestra', 'Faça uma palestra a convite da organização', 'A organização faz o convite a partir dos temas do seu perfil.', 'embaixador', 'convite', 4),
  ('parceiro', 'Traga um parceiro que contribua de fato', 'Conta quando a organização confirma a contribuição do parceiro.', 'embaixador', 'automatica', 5),
  ('representar', 'Represente a comunidade', 'Conte como você levou a CommuniCALI para outras conversas.', 'embaixador', 'analise', 6);

create table public.member_missions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  mission_slug text not null references public.missions(slug),
  relato text not null check (length(relato) between 10 and 1500),
  status text not null default 'enviada' check (status in ('enviada', 'concluida', 'recusada')),
  created_at timestamptz not null default now(),
  decidido_em timestamptz,
  unique (member_id, mission_slug)
);
alter table public.member_missions enable row level security;
create policy member_missions_admin on public.member_missions for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.member_missions to authenticated;
create trigger audit_member_missions after insert or update or delete on public.member_missions for each row execute function public.communicali_audit();

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  tipo text not null check (tipo in ('lugar', 'parceiro')),
  nome text not null check (length(nome) between 2 and 160),
  instagram text,
  linkedin text,
  telefone text not null check (length(telefone) between 8 and 40),
  pessoa_validar text not null check (length(pessoa_validar) between 2 and 160),
  status text not null default 'pendente' check (status in ('pendente', 'validada', 'recusada')),
  created_at timestamptz not null default now(),
  decidido_em timestamptz
);
alter table public.recommendations enable row level security;
create policy recommendations_admin on public.recommendations for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.recommendations to authenticated;
create trigger audit_recommendations after insert or update or delete on public.recommendations for each row execute function public.communicali_audit();

-- Foto do membro: cada pessoa grava só na própria pasta do bucket público do site.
create policy site_member_photo on storage.objects for insert to authenticated
  with check (bucket_id = 'site' and (storage.foldername(name))[1] = 'membros' and (storage.foldername(name))[2] = auth.uid()::text);

create or replace function public.communicali_eu() returns public.members
language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select m from public.members m where m.email = lower(coalesce(auth.jwt() ->> 'email', '')) and m.status = 'ativo';
$$;
revoke all on function public.communicali_eu() from public, anon;
grant execute on function public.communicali_eu() to authenticated;

-- Sugere um código a partir do nome; a pessoa pode trocar depois.
create or replace function public.communicali_gerar_codigo(p_member uuid)
returns text language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare m public.members%rowtype; v_base text; v_codigo text; v_n integer := 1;
begin
  select * into m from public.members where id = p_member;
  if m.codigo is not null then return m.codigo; end if;
  v_base := left(regexp_replace(upper(translate(split_part(m.nome, ' ', 1), 'áàãâäéèêëíìîïóòõôöúùûüçÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')), '[^A-Z0-9]', '', 'g'), 14);
  if length(v_base) < 4 then v_base := v_base || 'CALI'; end if;
  v_codigo := v_base;
  while exists (select 1 from public.members where codigo = v_codigo) loop
    v_n := v_n + 1;
    v_codigo := v_base || v_n::text;
  end loop;
  update public.members set codigo = v_codigo where id = p_member;
  return v_codigo;
end;
$$;
revoke all on function public.communicali_gerar_codigo(uuid) from public, anon, authenticated;

create or replace function public.communicali_meu_espaco()
returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare m public.members%rowtype; v_codigo text; v_conv integer;
begin
  m := public.communicali_eu();
  if m.id is null then return jsonb_build_object('membro', null); end if;
  if not exists (select 1 from public.checkins where member_id = m.id) then return jsonb_build_object('membro', null); end if;
  v_codigo := public.communicali_gerar_codigo(m.id);
  select count(*) into v_conv from public.point_events where member_id = m.id and (acao like 'convidado:%' or acao like 'indicacao:%');
  return jsonb_build_object(
    'membro', jsonb_build_object('nome', m.nome, 'apelido', m.apelido, 'email', m.email, 'foto_url', m.foto_url, 'categoria', m.categoria, 'codigo', v_codigo, 'temas', to_jsonb(m.temas), 'interesse_palestras', m.interesse_palestras, 'linkedin', m.linkedin),
    'pontos', coalesce((select sum(pontos) from public.point_events where member_id = m.id), 0),
    'encontros', (select count(*) from public.checkins where member_id = m.id),
    'carimbos', coalesce((select jsonb_agg(jsonb_build_object('slug', e.slug, 'titulo', e.titulo, 'selo', e.selo, 'data_evento', e.data_evento, 'local', e.local, 'cidade', e.cidade, 'capa_url', e.capa_url, 'carimbo_url', e.carimbo_url, 'fotos_url', e.fotos_url) order by e.data_evento)
      from public.checkins c join public.editions e on e.id = c.edition_id where c.member_id = m.id), '[]'::jsonb),
    'proximas', coalesce((select jsonb_agg(jsonb_build_object('slug', e.slug, 'titulo', e.titulo, 'data_evento', e.data_evento, 'horario', e.horario, 'local', e.local, 'cidade', e.cidade, 'capa_url', e.capa_url, 'inscricoes_abertas', e.inscricoes_abertas) order by e.data_evento)
      from public.editions e where e.publica and e.data_evento >= (now() at time zone 'America/Sao_Paulo')::date
        and not exists (select 1 from public.checkins c where c.edition_id = e.id and c.member_id = m.id)), '[]'::jsonb),
    'missoes', (select jsonb_agg(jsonb_build_object('slug', x.slug, 'titulo', x.titulo, 'descricao', x.descricao, 'nivel', x.nivel, 'modo', x.modo,
        'status', case
          when x.slug = 'convidados' and v_conv >= 2 then 'concluida'
          when x.slug = 'lugar' and exists (select 1 from public.recommendations r where r.member_id = m.id and r.tipo = 'lugar' and r.status = 'validada') then 'concluida'
          when x.slug = 'palestra' and exists (select 1 from public.point_events p where p.member_id = m.id and p.acao like 'palestra:%') then 'concluida'
          when x.slug = 'parceiro' and exists (select 1 from public.point_events p where p.member_id = m.id and p.acao like 'parceiro:%') then 'concluida'
          else coalesce((select mm.status from public.member_missions mm where mm.member_id = m.id and mm.mission_slug = x.slug), 'aberta') end) order by x.ordem)
      from public.missions x),
    'indicacoes', coalesce((select jsonb_agg(jsonb_build_object('nome', split_part(i.nome, ' ', 1), 'compareceu', i.compareceu) order by i.criado desc) from (
        select r.nome, r.created_at as criado, exists (select 1 from public.point_events p where p.member_id = m.id and p.acao = 'indicacao:' || r.id::text) as compareceu
          from public.registrations r where r.indicado_por = m.id and r.status <> 'cancelado'
        union all
        select g.nome, g.created_at, g.status = 'presente' from public.guests g where g.member_id = m.id and g.status <> 'cancelado') i), '[]'::jsonb),
    'recomendacoes', coalesce((select jsonb_agg(jsonb_build_object('nome', r.nome, 'tipo', r.tipo, 'status', r.status) order by r.created_at desc) from public.recommendations r where r.member_id = m.id), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.communicali_meu_espaco() from public, anon;
grant execute on function public.communicali_meu_espaco() to authenticated;

create or replace function public.communicali_salvar_perfil(p_foto_url text, p_temas text[], p_interesse boolean, p_linkedin text)
returns void language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare m public.members%rowtype; v_foto text := nullif(btrim(coalesce(p_foto_url, '')), '');
begin
  m := public.communicali_eu();
  if m.id is null then raise exception 'Entre novamente para salvar.'; end if;
  if v_foto is not null and v_foto is distinct from m.foto_url and v_foto not like 'https://cyyrrtekbkltdiatixhp.supabase.co/storage/v1/object/public/site/membros/' || auth.uid()::text || '/%' then
    raise exception 'Envie a foto novamente.';
  end if;
  update public.members set foto_url = v_foto, interesse_palestras = coalesce(p_interesse, false), linkedin = nullif(left(btrim(coalesce(p_linkedin, '')), 240), ''), updated_at = now(),
    temas = coalesce((select array_agg(distinct t) from (select left(btrim(x), 60) as t from unnest(coalesce(p_temas, '{}')) x limit 12) s where t <> ''), '{}')
   where id = m.id;
end;
$$;
revoke all on function public.communicali_salvar_perfil(text, text[], boolean, text) from public, anon;
grant execute on function public.communicali_salvar_perfil(text, text[], boolean, text) to authenticated;

create or replace function public.communicali_escolher_codigo(p_codigo text)
returns text language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare m public.members%rowtype; v_codigo text := upper(btrim(coalesce(p_codigo, '')));
begin
  m := public.communicali_eu();
  if m.id is null then raise exception 'Entre novamente para salvar.'; end if;
  if v_codigo !~ '^[A-Z0-9-]{4,20}$' then raise exception 'Use de 4 a 20 letras ou números, sem espaços nem acentos.'; end if;
  if exists (select 1 from public.members where codigo = v_codigo and id <> m.id) then raise exception 'Este código já está em uso. Tente outro.'; end if;
  update public.members set codigo = v_codigo, updated_at = now() where id = m.id;
  return v_codigo;
end;
$$;
revoke all on function public.communicali_escolher_codigo(text) from public, anon;
grant execute on function public.communicali_escolher_codigo(text) to authenticated;

create or replace function public.communicali_enviar_missao(p_slug text, p_relato text)
returns void language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare m public.members%rowtype; v_relato text := left(btrim(coalesce(p_relato, '')), 1500);
begin
  m := public.communicali_eu();
  if m.id is null then raise exception 'Entre novamente para enviar.'; end if;
  if not exists (select 1 from public.missions where slug = p_slug and modo = 'analise') then raise exception 'Esta missão não aceita envio.'; end if;
  if length(v_relato) < 10 then raise exception 'Conte um pouco mais sobre o que aconteceu.'; end if;
  insert into public.member_missions (member_id, mission_slug, relato) values (m.id, p_slug, v_relato)
  on conflict (member_id, mission_slug) do update set relato = excluded.relato, status = 'enviada', decidido_em = null
    where public.member_missions.status = 'recusada';
end;
$$;
revoke all on function public.communicali_enviar_missao(text, text) from public, anon;
grant execute on function public.communicali_enviar_missao(text, text) to authenticated;

create or replace function public.communicali_recomendar(p_tipo text, p_nome text, p_instagram text, p_linkedin text, p_telefone text, p_pessoa text)
returns void language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare m public.members%rowtype;
begin
  m := public.communicali_eu();
  if m.id is null then raise exception 'Entre novamente para enviar.'; end if;
  if (select count(*) from public.recommendations where member_id = m.id and created_at > now() - interval '1 hour') >= 5 then raise exception 'Aguarde um pouco antes de enviar outra recomendação.'; end if;
  insert into public.recommendations (member_id, tipo, nome, instagram, linkedin, telefone, pessoa_validar)
  values (m.id, p_tipo, left(btrim(coalesce(p_nome, '')), 160), nullif(left(btrim(coalesce(p_instagram, '')), 160), ''), nullif(left(btrim(coalesce(p_linkedin, '')), 240), ''), left(btrim(coalesce(p_telefone, '')), 40), left(btrim(coalesce(p_pessoa, '')), 160));
end;
$$;
revoke all on function public.communicali_recomendar(text, text, text, text, text, text) from public, anon;
grant execute on function public.communicali_recomendar(text, text, text, text, text, text) to authenticated;

-- Indicação pelo código: quem abre o link vê só o primeiro nome de quem convidou.
create or replace function public.communicali_codigo(p_codigo text)
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select jsonb_build_object('nome', split_part(coalesce(nullif(m.apelido, ''), m.nome), ' ', 1),
    'slug', (select e.slug from public.editions e where e.publica and e.inscricoes_abertas and e.data_evento >= (now() at time zone 'America/Sao_Paulo')::date order by e.data_evento limit 1))
  from public.members m where m.codigo = upper(btrim(coalesce(p_codigo, ''))) and m.status = 'ativo';
$$;
grant execute on function public.communicali_codigo(text) to anon, authenticated;

-- Liga a inscrição ao código uma vez só. Sem sessão, porque quem se inscreve é visitante.
create or replace function public.communicali_vincular_indicacao(p_slug text, p_email text, p_codigo text)
returns void language sql volatile security definer set search_path to 'pg_catalog', 'public' as $$
  update public.registrations r set indicado_por = m.id
    from public.members m, public.editions e
   where m.codigo = upper(btrim(coalesce(p_codigo, ''))) and m.status = 'ativo' and e.slug = lower(btrim(coalesce(p_slug, '')))
     and r.edition_id = e.id and r.email = lower(btrim(coalesce(p_email, ''))) and r.indicado_por is null and m.email <> r.email;
$$;
grant execute on function public.communicali_vincular_indicacao(text, text, text) to anon, authenticated;

-- A indicação só pontua com presença, e só quando é o primeiro encontro da pessoa indicada.
create or replace function public.communicali_creditar_indicacao(p_edition uuid, p_member uuid, p_email text)
returns void language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare r public.registrations%rowtype;
begin
  select * into r from public.registrations where edition_id = p_edition and email = lower(p_email) and status <> 'cancelado' and indicado_por is not null;
  if not found or r.indicado_por = p_member then return; end if;
  if exists (select 1 from public.checkins where member_id = p_member and edition_id <> p_edition) then return; end if;
  insert into public.point_events (member_id, edition_id, acao, pontos) values (r.indicado_por, p_edition, 'indicacao:' || r.id::text, 5)
  on conflict (member_id, edition_id, acao) do nothing;
end;
$$;
revoke all on function public.communicali_creditar_indicacao(uuid, uuid, text) from public, anon, authenticated;

create or replace function public.communicali_registrar_presenca(p_edition uuid, p_member uuid, p_origem text)
returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare
  v_id uuid; v_codigo text; m public.members%rowtype; e public.editions%rowtype;
begin
  select * into e from public.editions where id = p_edition;
  insert into public.checkins (edition_id, member_id, origem) values (p_edition, p_member, p_origem)
  on conflict (edition_id, member_id) do nothing returning id into v_id;
  insert into public.point_events (member_id, edition_id, acao, pontos) values (p_member, p_edition, 'presenca', 10)
  on conflict (member_id, edition_id, acao) do nothing;
  update public.members set cracha_status = 'disponivel', updated_at = now() where id = p_member and cracha_status = 'nao_disponivel';
  select * into m from public.members where id = p_member;
  perform public.communicali_creditar_convidado(p_edition, m.email);
  perform public.communicali_creditar_indicacao(p_edition, p_member, m.email);
  select codigo into v_codigo from public.checkins where edition_id = p_edition and member_id = p_member;
  return jsonb_build_object('nome', coalesce(nullif(m.apelido, ''), m.nome), 'categoria', m.categoria, 'edicao', e.titulo, 'selo', e.selo, 'codigo', v_codigo, 'repetido', v_id is null);
end;
$$;
revoke all on function public.communicali_registrar_presenca(uuid, uuid, text) from public, anon, authenticated;
