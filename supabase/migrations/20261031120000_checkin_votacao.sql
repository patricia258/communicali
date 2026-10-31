-- CommuniCALI (31/10/2026): edições, membros, presenças, pontos e votação 0 a 10.
-- Quem usa o site não faz login: lê e envia só pelas funções abaixo. Nenhuma tabela fica aberta ao público.

create table public.editions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  numero integer,
  titulo text not null,
  selo text not null,
  data_evento date not null,
  horario text not null,
  local text not null,
  cidade text not null,
  checkin_abre timestamptz not null,
  checkin_fecha timestamptz not null,
  publica boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(nome) between 2 and 160),
  email text not null unique check (email = lower(email)),
  whatsapp text,
  empresa text,
  cargo text,
  categoria text not null default 'membro' check (categoria in ('membro', 'convidado', 'organizador', 'kids')),
  termos_aceitos_em timestamptz not null,
  autoriza_imagem boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions(id),
  member_id uuid not null references public.members(id),
  checked_in_at timestamptz not null default now(),
  unique (edition_id, member_id)
);

create table public.point_events (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  edition_id uuid not null references public.editions(id),
  acao text not null,
  pontos integer not null,
  created_at timestamptz not null default now(),
  unique (member_id, edition_id, acao)
);

create table public.polls (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions(id),
  slug text not null unique,
  pergunta text not null,
  abre timestamptz not null,
  fecha timestamptz not null,
  created_at timestamptz not null default now()
);

-- A nota não guarda pessoa: só um código do aparelho embaralhado, para evitar voto repetido.
create table public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id),
  aparelho_hash text not null,
  nota smallint not null check (nota between 0 and 10),
  created_at timestamptz not null default now(),
  unique (poll_id, aparelho_hash)
);

alter table public.editions enable row level security;
alter table public.members enable row level security;
alter table public.checkins enable row level security;
alter table public.point_events enable row level security;
alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;

create or replace function public.communicali_edicao(p_slug text)
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select jsonb_build_object('slug', e.slug, 'titulo', e.titulo, 'selo', e.selo, 'data_evento', e.data_evento,
         'horario', e.horario, 'local', e.local, 'cidade', e.cidade,
         'situacao', case when now() < e.checkin_abre then 'antes' when now() > e.checkin_fecha then 'encerrado' else 'aberto' end)
    from public.editions e where e.slug = lower(btrim(coalesce(p_slug, '')));
$$;

create or replace function public.communicali_checkin(
  p_slug text, p_nome text, p_email text, p_whatsapp text, p_empresa text, p_cargo text, p_termos boolean, p_imagem boolean
) returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare
  v_ed public.editions%rowtype;
  v_nome text := left(btrim(coalesce(p_nome, '')), 160);
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_whats text := nullif(left(btrim(coalesce(p_whatsapp, '')), 40), '');
  v_empresa text := nullif(left(btrim(coalesce(p_empresa, '')), 160), '');
  v_cargo text := nullif(left(btrim(coalesce(p_cargo, '')), 160), '');
  v_member uuid; v_categoria text; v_checkin uuid; v_recent integer;
begin
  select * into v_ed from public.editions where slug = lower(btrim(coalesce(p_slug, '')));
  if not found then raise exception 'Edição não encontrada.'; end if;
  if now() < v_ed.checkin_abre then raise exception 'O check-in ainda não abriu.'; end if;
  if now() > v_ed.checkin_fecha then raise exception 'O check-in desta edição foi encerrado.'; end if;
  if length(v_nome) < 2 then raise exception 'Informe seu nome.'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Confira o e-mail digitado.'; end if;
  if not coalesce(p_termos, false) then raise exception 'Para confirmar, aceite o uso dos dados.'; end if;
  select count(*) into v_recent from public.checkins where edition_id = v_ed.id and checked_in_at > now() - interval '1 minute';
  if v_recent >= 60 then raise exception 'Muitos check-ins ao mesmo tempo. Tente de novo em instantes.'; end if;

  -- Quem já tem cadastro continua com os dados que tem: este envio só preenche o que estiver vazio.
  insert into public.members (nome, email, whatsapp, empresa, cargo, termos_aceitos_em, autoriza_imagem)
  values (v_nome, v_email, v_whats, v_empresa, v_cargo, now(), coalesce(p_imagem, false))
  on conflict (email) do update set
    whatsapp = coalesce(public.members.whatsapp, excluded.whatsapp),
    empresa = coalesce(public.members.empresa, excluded.empresa),
    cargo = coalesce(public.members.cargo, excluded.cargo),
    autoriza_imagem = public.members.autoriza_imagem or excluded.autoriza_imagem,
    updated_at = now()
  returning id, categoria into v_member, v_categoria;

  insert into public.checkins (edition_id, member_id) values (v_ed.id, v_member)
  on conflict (edition_id, member_id) do nothing returning id into v_checkin;
  insert into public.point_events (member_id, edition_id, acao, pontos) values (v_member, v_ed.id, 'presenca', 10)
  on conflict (member_id, edition_id, acao) do nothing;

  return jsonb_build_object('nome', v_nome, 'categoria', v_categoria, 'selo', v_ed.selo, 'repetido', v_checkin is null);
end;
$$;

create or replace function public.communicali_votacao(p_slug text)
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select jsonb_build_object('pergunta', p.pergunta,
         'situacao', case when now() < p.abre then 'antes' when now() > p.fecha then 'encerrado' else 'aberto' end,
         'votos', count(v.id), 'media', round(avg(v.nota), 1))
    from public.polls p left join public.poll_votes v on v.poll_id = p.id
   where p.slug = lower(btrim(coalesce(p_slug, ''))) group by p.id;
$$;

create or replace function public.communicali_votar(p_slug text, p_aparelho text, p_nota integer)
returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare
  v_poll public.polls%rowtype; v_id uuid; v_recent integer;
begin
  select * into v_poll from public.polls where slug = lower(btrim(coalesce(p_slug, '')));
  if not found then raise exception 'Votação não encontrada.'; end if;
  if now() < v_poll.abre then raise exception 'A votação ainda não abriu.'; end if;
  if now() > v_poll.fecha then raise exception 'A votação foi encerrada.'; end if;
  if p_nota is null or p_nota not between 0 and 10 then raise exception 'Escolha uma nota de 0 a 10.'; end if;
  if length(coalesce(p_aparelho, '')) not between 16 and 80 then raise exception 'Não foi possível registrar o voto. Recarregue a página.'; end if;
  select count(*) into v_recent from public.poll_votes where poll_id = v_poll.id and created_at > now() - interval '1 minute';
  if v_recent >= 120 then raise exception 'Muitos votos ao mesmo tempo. Tente de novo em instantes.'; end if;
  insert into public.poll_votes (poll_id, aparelho_hash, nota)
  values (v_poll.id, encode(sha256(convert_to(v_poll.id::text || p_aparelho, 'UTF8')), 'hex'), p_nota)
  on conflict (poll_id, aparelho_hash) do nothing returning id into v_id;
  return jsonb_build_object('repetido', v_id is null);
end;
$$;

revoke all on function public.communicali_edicao(text) from public;
revoke all on function public.communicali_checkin(text, text, text, text, text, text, boolean, boolean) from public;
revoke all on function public.communicali_votacao(text) from public;
revoke all on function public.communicali_votar(text, text, integer) from public;
grant execute on function public.communicali_edicao(text) to anon, authenticated;
grant execute on function public.communicali_checkin(text, text, text, text, text, text, boolean, boolean) to anon, authenticated;
grant execute on function public.communicali_votacao(text) to anon, authenticated;
grant execute on function public.communicali_votar(text, text, integer) to anon, authenticated;

insert into public.editions (slug, numero, titulo, selo, data_evento, horario, local, cidade, checkin_abre, checkin_fecha)
values ('fundadora', 1, 'Edição Fundadora', 'Edição Fundadora · 14.11.2026', '2026-11-14', '9h às 12h', 'Legacy Coffee', 'Curitiba',
        '2026-11-14 07:00-03', '2026-11-14 13:00-03');
insert into public.polls (edition_id, slug, pergunta, abre, fecha)
select id, 'fundadora', 'Em uma escala de 0 a 10, quanto o RH demonstra valor real nas decisões das organizações que você conhece?',
       '2026-11-14 07:00-03', '2026-11-14 13:00-03' from public.editions where slug = 'fundadora';

-- Edição só para testar no celular antes do dia; não aparece no site e sai depois da aprovação.
insert into public.editions (slug, titulo, selo, data_evento, horario, local, cidade, checkin_abre, checkin_fecha, publica)
values ('teste', 'Edição de teste', 'Edição de teste', '2026-11-13', '9h às 12h', 'Teste', 'Curitiba', '2026-10-31 00:00-03', '2026-11-13 23:59-03', false);
insert into public.polls (edition_id, slug, pergunta, abre, fecha)
select id, 'teste', 'Votação de teste: de 0 a 10, como está o seu dia?', '2026-10-31 00:00-03', '2026-11-13 23:59-03' from public.editions where slug = 'teste';
