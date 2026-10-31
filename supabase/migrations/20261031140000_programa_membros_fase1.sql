-- CommuniCALI, Programa de Membros, fase 1 (31/10/2026): cadastro permanente, check-in com código validado,
-- status do crachá, votações configuráveis e histórico de alterações.

alter table public.members
  add column apelido text,
  add column cidade_uf text,
  add column linkedin text,
  add column interesses text[] not null default '{}',
  add column como_conheceu text,
  add column privacidade_aceita_em timestamptz,
  add column regras_aceitas_em timestamptz,
  add column autoriza_comunicacoes boolean not null default false,
  add column cracha_status text not null default 'nao_disponivel' check (cracha_status in ('nao_disponivel', 'disponivel', 'entregue')),
  add column cracha_entregue_em timestamptz;
alter table public.members drop constraint members_categoria_check;
alter table public.members add constraint members_categoria_check
  check (categoria in ('membro', 'participante_ativo', 'conector', 'embaixador', 'convidado', 'organizador', 'kids'));

alter table public.editions add column capacidade integer check (capacidade > 0);

alter table public.checkins
  add column codigo text unique,
  add column origem text not null default 'qr' check (origem in ('qr', 'manual'));
update public.checkins set codigo = upper(substr(md5(gen_random_uuid()::text), 1, 8)) where codigo is null;
alter table public.checkins alter column codigo set not null;
alter table public.checkins alter column codigo set default upper(substr(md5(gen_random_uuid()::text), 1, 8));

alter table public.site_settings
  add column cadastro_aberto boolean not null default false,
  add column regras_texto text not null default '',
  add column privacidade_texto text not null default '',
  add column como_conheceu_opcoes text[] not null default array['Instagram', 'LinkedIn', 'Indicação de alguém', 'Grupo do WhatsApp', 'Evento', 'Outro'];

alter table public.polls
  add column titulo text not null default 'Dinâmica',
  add column tipo text not null default 'nota' check (tipo in ('nota', 'multipla', 'aberta')),
  add column opcoes text[] not null default '{}',
  add column anonima boolean not null default true,
  add column status text not null default 'rascunho' check (status in ('rascunho', 'ativa', 'encerrada')),
  add column revelada boolean not null default false,
  alter column abre drop not null,
  alter column fecha drop not null;
update public.polls set status = 'ativa' where slug = 'teste';
update public.polls set titulo = 'Valor do RH' where slug = 'fundadora';

alter table public.poll_votes
  alter column nota drop not null,
  add column opcao text,
  add column texto text,
  add column respondente text;

-- Histórico: toda alteração em cadastro, presença, pontos e votação fica registrada com quem fez.
create table public.audit_log (
  id bigint generated always as identity primary key,
  feito_em timestamptz not null default now(),
  autor text,
  tabela text not null,
  acao text not null,
  registro uuid,
  antes jsonb,
  depois jsonb
);
alter table public.audit_log enable row level security;
create policy audit_admin_read on public.audit_log for select to authenticated using (public.is_admin());
grant select on public.audit_log to authenticated;

create or replace function public.communicali_audit() returns trigger language plpgsql security definer set search_path to 'pg_catalog', 'public' as $$
begin
  insert into public.audit_log (autor, tabela, acao, registro, antes, depois)
  values (coalesce(auth.jwt() ->> 'email', 'sistema'), tg_table_name, tg_op, coalesce(new.id, old.id),
          case when tg_op <> 'INSERT' then to_jsonb(old) end, case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end;
$$;
create trigger audit_members after insert or update or delete on public.members for each row execute function public.communicali_audit();
create trigger audit_checkins after insert or update or delete on public.checkins for each row execute function public.communicali_audit();
create trigger audit_points after insert or update or delete on public.point_events for each row execute function public.communicali_audit();
create trigger audit_polls after insert or update or delete on public.polls for each row execute function public.communicali_audit();

create policy polls_admin on public.polls for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy votes_admin_read on public.poll_votes for select to authenticated using (public.is_admin());
create policy votes_admin_delete on public.poll_votes for delete to authenticated using (public.is_admin());
grant select, insert, update, delete on public.polls to authenticated;
grant select, delete on public.poll_votes to authenticated;

drop function public.communicali_checkin(text, text, text, text, text, text, boolean, boolean);
drop function public.communicali_votar(text, text, integer);
drop function public.communicali_votacao(text);

-- Registra a presença uma vez só: repetir devolve o mesmo código e não soma pontos.
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
  select codigo into v_codigo from public.checkins where edition_id = p_edition and member_id = p_member;
  return jsonb_build_object('nome', coalesce(nullif(m.apelido, ''), m.nome), 'categoria', m.categoria, 'edicao', e.titulo, 'selo', e.selo, 'codigo', v_codigo, 'repetido', v_id is null);
end;
$$;
revoke all on function public.communicali_registrar_presenca(uuid, uuid, text) from public, anon, authenticated;

create or replace function public.communicali_novo_membro(
  p_nome text, p_apelido text, p_email text, p_whatsapp text, p_cidade text, p_empresa text, p_cargo text, p_linkedin text,
  p_interesses text[], p_como_conheceu text, p_privacidade boolean, p_regras boolean, p_comunicacoes boolean, p_imagem boolean
) returns uuid language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare
  v_nome text := left(btrim(coalesce(p_nome, '')), 160);
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_whats text := left(btrim(coalesce(p_whatsapp, '')), 40);
  v_cidade text := left(btrim(coalesce(p_cidade, '')), 120);
  v_regras boolean; v_id uuid; v_recent integer;
begin
  if length(v_nome) < 2 then raise exception 'Informe seu nome completo.'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Confira o e-mail digitado.'; end if;
  if length(regexp_replace(v_whats, '\D', '', 'g')) < 10 then raise exception 'Confira o WhatsApp com DDD.'; end if;
  if length(v_cidade) < 2 then raise exception 'Informe sua cidade e estado.'; end if;
  if not coalesce(p_privacidade, false) then raise exception 'Para continuar, aceite a política de privacidade.'; end if;
  select regras_texto <> '' into v_regras from public.site_settings;
  if v_regras and not coalesce(p_regras, false) then raise exception 'Para continuar, aceite as regras de participação.'; end if;
  select count(*) into v_recent from public.members where created_at > now() - interval '1 minute';
  if v_recent >= 60 then raise exception 'Muitos cadastros ao mesmo tempo. Tente de novo em instantes.'; end if;
  if exists (select 1 from public.members where email = v_email) then raise exception 'Este e-mail já tem cadastro na CommuniCALI.'; end if;
  insert into public.members (nome, apelido, email, whatsapp, cidade_uf, empresa, cargo, linkedin, interesses, como_conheceu,
    termos_aceitos_em, privacidade_aceita_em, regras_aceitas_em, autoriza_comunicacoes, autoriza_imagem)
  values (v_nome, nullif(left(btrim(coalesce(p_apelido, '')), 80), ''), v_email, v_whats, v_cidade,
    nullif(left(btrim(coalesce(p_empresa, '')), 160), ''), nullif(left(btrim(coalesce(p_cargo, '')), 160), ''),
    nullif(left(btrim(coalesce(p_linkedin, '')), 200), ''), coalesce(p_interesses[1:10], '{}'), nullif(left(btrim(coalesce(p_como_conheceu, '')), 80), ''),
    now(), now(), case when p_regras then now() end, coalesce(p_comunicacoes, false), coalesce(p_imagem, false))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.communicali_novo_membro(text, text, text, text, text, text, text, text, text[], text, boolean, boolean, boolean, boolean) from public, anon, authenticated;

create or replace function public.communicali_cadastrar(
  p_nome text, p_apelido text, p_email text, p_whatsapp text, p_cidade text, p_empresa text, p_cargo text, p_linkedin text,
  p_interesses text[], p_como_conheceu text, p_privacidade boolean, p_regras boolean, p_comunicacoes boolean
) returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
begin
  if not (select cadastro_aberto from public.site_settings) then raise exception 'O cadastro ainda não está aberto.'; end if;
  perform public.communicali_novo_membro(p_nome, p_apelido, p_email, p_whatsapp, p_cidade, p_empresa, p_cargo, p_linkedin, p_interesses, p_como_conheceu, p_privacidade, p_regras, p_comunicacoes, false);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.communicali_situacao_email(p_slug text, p_email text)
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog', 'public' as $$
declare e public.editions%rowtype;
begin
  select * into e from public.editions where slug = lower(btrim(coalesce(p_slug, '')));
  if not found then raise exception 'Edição não encontrada.'; end if;
  if now() < e.checkin_abre then raise exception 'O check-in ainda não abriu.'; end if;
  if now() > e.checkin_fecha then raise exception 'O check-in desta edição foi encerrado.'; end if;
  return jsonb_build_object('membro', exists (select 1 from public.members where email = lower(btrim(coalesce(p_email, ''))) ));
end;
$$;

-- Quem ainda não é membro faz o cadastro e o check-in no mesmo envio.
create or replace function public.communicali_checkin_novo(
  p_slug text, p_nome text, p_apelido text, p_email text, p_whatsapp text, p_cidade text, p_empresa text, p_cargo text, p_linkedin text,
  p_interesses text[], p_como_conheceu text, p_privacidade boolean, p_regras boolean, p_comunicacoes boolean, p_imagem boolean
) returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare e public.editions%rowtype; v_member uuid;
begin
  select * into e from public.editions where slug = lower(btrim(coalesce(p_slug, '')));
  if not found then raise exception 'Edição não encontrada.'; end if;
  if now() < e.checkin_abre then raise exception 'O check-in ainda não abriu.'; end if;
  if now() > e.checkin_fecha then raise exception 'O check-in desta edição foi encerrado.'; end if;
  v_member := public.communicali_novo_membro(p_nome, p_apelido, p_email, p_whatsapp, p_cidade, p_empresa, p_cargo, p_linkedin, p_interesses, p_como_conheceu, p_privacidade, p_regras, p_comunicacoes, p_imagem);
  return public.communicali_registrar_presenca(e.id, v_member, 'qr');
end;
$$;

-- Quem já é membro confirma o e-mail com um código; aqui vale o e-mail da sessão, não o digitado.
create or replace function public.communicali_checkin_membro(p_slug text)
returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare e public.editions%rowtype; v_member uuid;
begin
  select * into e from public.editions where slug = lower(btrim(coalesce(p_slug, '')));
  if not found then raise exception 'Edição não encontrada.'; end if;
  if now() < e.checkin_abre then raise exception 'O check-in ainda não abriu.'; end if;
  if now() > e.checkin_fecha then raise exception 'O check-in desta edição foi encerrado.'; end if;
  select id into v_member from public.members where email = lower(coalesce(auth.jwt() ->> 'email', ''));
  if not found then raise exception 'Não encontramos este cadastro. Procure a organização na recepção.'; end if;
  return public.communicali_registrar_presenca(e.id, v_member, 'qr');
end;
$$;

-- Conferência na recepção: mostra só o primeiro nome e o que o crachá precisa.
create or replace function public.communicali_validar_codigo(p_codigo text)
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select jsonb_build_object('valido', true, 'nome', split_part(coalesce(nullif(m.apelido, ''), m.nome), ' ', 1), 'categoria', m.categoria,
         'edicao', e.titulo, 'horario', c.checked_in_at, 'cracha', m.cracha_status)
    from public.checkins c join public.members m on m.id = c.member_id join public.editions e on e.id = c.edition_id
   where c.codigo = upper(btrim(coalesce(p_codigo, '')));
$$;

create or replace function public.admin_checkin_manual(p_edition uuid, p_email text)
returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare v_member uuid;
begin
  if not public.is_admin() then raise exception 'Sem permissão.'; end if;
  select id into v_member from public.members where email = lower(btrim(coalesce(p_email, '')));
  if not found then raise exception 'Nenhum membro com este e-mail.'; end if;
  return public.communicali_registrar_presenca(p_edition, v_member, 'manual');
end;
$$;

create or replace function public.communicali_votacao(p_slug text)
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select jsonb_build_object('titulo', p.titulo, 'pergunta', p.pergunta, 'tipo', p.tipo, 'opcoes', to_jsonb(p.opcoes), 'anonima', p.anonima,
         'situacao', p.status, 'revelada', p.revelada, 'votos', (select count(*) from public.poll_votes v where v.poll_id = p.id),
         'media', case when p.revelada then (select round(avg(v.nota), 1) from public.poll_votes v where v.poll_id = p.id) end,
         'distribuicao', case when p.revelada and p.tipo = 'nota' then (select coalesce(jsonb_object_agg(n, c), '{}') from (select v.nota n, count(*) c from public.poll_votes v where v.poll_id = p.id group by v.nota) s) end,
         'por_opcao', case when p.revelada and p.tipo = 'multipla' then (select coalesce(jsonb_object_agg(o, c), '{}') from (select v.opcao o, count(*) c from public.poll_votes v where v.poll_id = p.id group by v.opcao) s) end,
         'textos', case when p.revelada and p.tipo = 'aberta' then (select coalesce(jsonb_agg(t.texto), '[]') from (select v.texto from public.poll_votes v where v.poll_id = p.id order by v.created_at desc limit 12) t) end)
    from public.polls p where p.slug = lower(btrim(coalesce(p_slug, '')));
$$;

create or replace function public.communicali_votar(p_slug text, p_aparelho text, p_nota integer, p_opcao text, p_texto text, p_respondente text)
returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare
  v_poll public.polls%rowtype; v_id uuid; v_recent integer; v_texto text := nullif(left(btrim(coalesce(p_texto, '')), 500), '');
begin
  select * into v_poll from public.polls where slug = lower(btrim(coalesce(p_slug, '')));
  if not found then raise exception 'Votação não encontrada.'; end if;
  if v_poll.status = 'rascunho' then raise exception 'A votação ainda não abriu.'; end if;
  if v_poll.status = 'encerrada' then raise exception 'A votação foi encerrada.'; end if;
  if v_poll.tipo = 'nota' and (p_nota is null or p_nota not between 0 and 10) then raise exception 'Escolha uma nota de 0 a 10.'; end if;
  if v_poll.tipo = 'multipla' and not (p_opcao = any(v_poll.opcoes)) then raise exception 'Escolha uma das opções.'; end if;
  if v_poll.tipo = 'aberta' and v_texto is null then raise exception 'Escreva sua resposta.'; end if;
  if not v_poll.anonima and length(btrim(coalesce(p_respondente, ''))) < 2 then raise exception 'Informe seu nome.'; end if;
  if length(coalesce(p_aparelho, '')) not between 16 and 80 then raise exception 'Não foi possível registrar o voto. Recarregue a página.'; end if;
  select count(*) into v_recent from public.poll_votes where poll_id = v_poll.id and created_at > now() - interval '1 minute';
  if v_recent >= 120 then raise exception 'Muitos votos ao mesmo tempo. Tente de novo em instantes.'; end if;
  insert into public.poll_votes (poll_id, aparelho_hash, nota, opcao, texto, respondente)
  values (v_poll.id, encode(sha256(convert_to(v_poll.id::text || p_aparelho, 'UTF8')), 'hex'),
          case when v_poll.tipo = 'nota' then p_nota end, case when v_poll.tipo = 'multipla' then p_opcao end,
          case when v_poll.tipo = 'aberta' then v_texto end, case when not v_poll.anonima then left(btrim(p_respondente), 160) end)
  on conflict (poll_id, aparelho_hash) do nothing returning id into v_id;
  return jsonb_build_object('repetido', v_id is null);
end;
$$;

revoke all on function public.communicali_cadastrar(text, text, text, text, text, text, text, text, text[], text, boolean, boolean, boolean) from public;
revoke all on function public.communicali_situacao_email(text, text) from public;
revoke all on function public.communicali_checkin_novo(text, text, text, text, text, text, text, text, text, text[], text, boolean, boolean, boolean, boolean) from public;
revoke all on function public.communicali_checkin_membro(text) from public;
revoke all on function public.communicali_validar_codigo(text) from public;
revoke all on function public.admin_checkin_manual(uuid, text) from public;
revoke all on function public.communicali_votacao(text) from public;
revoke all on function public.communicali_votar(text, text, integer, text, text, text) from public;
grant execute on function public.communicali_cadastrar(text, text, text, text, text, text, text, text, text[], text, boolean, boolean, boolean) to anon, authenticated;
grant execute on function public.communicali_situacao_email(text, text) to anon, authenticated;
grant execute on function public.communicali_checkin_novo(text, text, text, text, text, text, text, text, text, text[], text, boolean, boolean, boolean, boolean) to anon, authenticated;
grant execute on function public.communicali_checkin_membro(text) to authenticated;
grant execute on function public.communicali_validar_codigo(text) to anon, authenticated;
grant execute on function public.admin_checkin_manual(uuid, text) to authenticated;
grant execute on function public.communicali_votacao(text) to anon, authenticated;
grant execute on function public.communicali_votar(text, text, integer, text, text, text) to anon, authenticated;

update public.site_settings set privacidade_texto = $texto$Esta política explica como a CALI RH trata os dados de quem participa da CommuniCALI.

Quais dados guardamos: nome, e-mail, WhatsApp, cidade, empresa, cargo e LinkedIn, quando informados; seus interesses; suas presenças e pontos; e as autorizações que você der.

Para que usamos: manter seu cadastro, registrar presenças e histórico, organizar os encontros e, se você autorizar, enviar comunicações da comunidade.

Com quem compartilhamos: a CALI RH não vende seus dados nem entrega a lista de membros a parceiros ou patrocinadores. Os dados ficam em serviços de tecnologia contratados para o funcionamento do site.

Imagens: fotos de encontros só são publicadas para quem autorizou o uso de imagem.

Seus direitos: você pode pedir acesso, correção ou exclusão dos seus dados, e retirar uma autorização, pelo e-mail contato@calirh.com.$texto$;
