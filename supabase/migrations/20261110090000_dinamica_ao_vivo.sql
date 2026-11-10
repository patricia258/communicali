-- Dinâmica ao vivo: dois murais de palavras (Barreiras e Caminhos) abertos ao mesmo tempo, com até 4 palavras por pessoa em cada um.
-- A participação é pública e anônima, só pelas funções abaixo; a organização controla pelo painel (is_admin).
-- Pesquisa de satisfação: formulário da edição e envio automático no dia do encontro.

create table if not exists public.dinamicas (
  edition_id uuid primary key references public.editions(id) on delete cascade,
  pergunta_1 text not null default 'Na sua percepção, o que mais impede que a gestão de pessoas receba a atenção que merece nas organizações?',
  instrucao_1 text not null default 'Responda com uma palavra ou expressão curta.',
  pergunta_2 text not null default 'O que precisa mudar para transformar essa importância em ações concretas?',
  instrucao_2 text not null default 'Deixe uma palavra ou expressão curta que represente essa mudança.',
  status_1 text not null default 'aguardando' check (status_1 in ('aguardando', 'aberta', 'encerrada')),
  status_2 text not null default 'aguardando' check (status_2 in ('aguardando', 'aberta', 'encerrada')),
  modo text not null default 'ambos' check (modo in ('ambos', '1', '2')),
  qr boolean not null default true,
  congelado_em timestamptz,
  limite integer not null default 4 check (limite between 1 and 10),
  created_at timestamptz not null default now()
);
create table if not exists public.dinamica_respostas (
  id bigint generated always as identity primary key,
  edition_id uuid not null references public.editions(id) on delete cascade,
  etapa smallint not null check (etapa in (1, 2)),
  texto text not null check (length(texto) between 2 and 30),
  chave text not null,
  aparelho text not null check (length(aparelho) between 8 and 80),
  removida boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists dinamica_respostas_edicao on public.dinamica_respostas (edition_id, etapa, created_at);
create index if not exists dinamica_respostas_aparelho on public.dinamica_respostas (edition_id, etapa, aparelho, created_at);
alter table public.dinamicas enable row level security;
alter table public.dinamica_respostas enable row level security;
drop policy if exists dinamicas_admin on public.dinamicas;
create policy dinamicas_admin on public.dinamicas for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists dinamica_respostas_admin on public.dinamica_respostas;
create policy dinamica_respostas_admin on public.dinamica_respostas for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Mesma resposta escrita de jeitos diferentes: ignora maiúsculas, acentos, pontuação e espaços repetidos. Nada de agrupar por sentido.
create or replace function public.communicali_dinamica_chave(p_texto text)
returns text language sql immutable as $$
  select btrim(regexp_replace(regexp_replace(translate(lower(coalesce(p_texto, '')), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'), '[^a-z0-9 ]', '', 'g'), '\s+', ' ', 'g'));
$$;

-- Estado e palavras para o telão (só o que já pode aparecer: sem removidas e, se estiver congelado, só até o momento do congelamento).
create or replace function public.communicali_dinamica_telao(p_slug text)
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog', 'public' as $$
declare e public.editions%rowtype; d public.dinamicas%rowtype;
begin
  select * into e from public.editions where slug = lower(btrim(coalesce(p_slug, '')));
  if not found then return null; end if;
  select * into d from public.dinamicas where edition_id = e.id;
  if not found then return jsonb_build_object('existe', false); end if;
  return jsonb_build_object('existe', true, 'status_1', d.status_1, 'status_2', d.status_2, 'modo', d.modo, 'qr', d.qr, 'congelado', d.congelado_em is not null,
    'respostas', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'etapa', r.etapa, 'texto', r.texto, 'chave', r.chave) order by r.id)
      from public.dinamica_respostas r where r.edition_id = e.id and not r.removida and (d.congelado_em is null or r.created_at <= d.congelado_em)), '[]'::jsonb));
end;
$$;

-- Estado para o celular: perguntas, se cada uma está aberta e o que este aparelho já enviou.
create or replace function public.communicali_dinamica_estado(p_slug text, p_aparelho text)
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog', 'public' as $$
declare e public.editions%rowtype; d public.dinamicas%rowtype;
begin
  select * into e from public.editions where slug = lower(btrim(coalesce(p_slug, '')));
  if not found then return null; end if;
  select * into d from public.dinamicas where edition_id = e.id;
  if not found then return jsonb_build_object('existe', false); end if;
  return jsonb_build_object('existe', true, 'limite', d.limite,
    'etapas', jsonb_build_array(
      jsonb_build_object('etapa', 1, 'status', d.status_1, 'pergunta', d.pergunta_1, 'instrucao', d.instrucao_1,
        'enviadas', coalesce((select jsonb_agg(r.texto order by r.id) from public.dinamica_respostas r where r.edition_id = e.id and r.etapa = 1 and r.aparelho = p_aparelho and not r.removida), '[]'::jsonb),
        'usadas', (select count(*) from public.dinamica_respostas r where r.edition_id = e.id and r.etapa = 1 and r.aparelho = p_aparelho)),
      jsonb_build_object('etapa', 2, 'status', d.status_2, 'pergunta', d.pergunta_2, 'instrucao', d.instrucao_2,
        'enviadas', coalesce((select jsonb_agg(r.texto order by r.id) from public.dinamica_respostas r where r.edition_id = e.id and r.etapa = 2 and r.aparelho = p_aparelho and not r.removida), '[]'::jsonb),
        'usadas', (select count(*) from public.dinamica_respostas r where r.edition_id = e.id and r.etapa = 2 and r.aparelho = p_aparelho))));
end;
$$;

create or replace function public.communicali_dinamica_enviar(p_slug text, p_etapa integer, p_texto text, p_aparelho text)
returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare e public.editions%rowtype; d public.dinamicas%rowtype; v_texto text; v_chave text; v_usadas integer; v_status text;
begin
  select * into e from public.editions where slug = lower(btrim(coalesce(p_slug, '')));
  if not found then raise exception 'Encontro não encontrado.'; end if;
  select * into d from public.dinamicas where edition_id = e.id;
  if not found then raise exception 'A dinâmica ainda não começou.'; end if;
  if p_etapa not in (1, 2) then raise exception 'Pergunta inválida.'; end if;
  v_status := case p_etapa when 1 then d.status_1 else d.status_2 end;
  if v_status <> 'aberta' then raise exception 'Esta pergunta não está aberta agora.'; end if;
  if length(coalesce(p_aparelho, '')) < 8 then raise exception 'Não foi possível identificar o aparelho.'; end if;
  v_texto := btrim(regexp_replace(coalesce(p_texto, ''), '\s+', ' ', 'g'));
  if length(v_texto) < 2 then raise exception 'Escreva pelo menos duas letras.'; end if;
  if length(v_texto) > 30 then raise exception 'Use até 30 caracteres.'; end if;
  if v_texto ~* '(https?:|www\.|@|\.com|\.br\M)' then raise exception 'Use só palavras, sem links ou contatos.'; end if;
  v_chave := public.communicali_dinamica_chave(v_texto);
  if v_chave = '' then raise exception 'Escreva uma palavra ou expressão.'; end if;
  select count(*) into v_usadas from public.dinamica_respostas where edition_id = e.id and etapa = p_etapa and aparelho = p_aparelho;
  if v_usadas >= d.limite then raise exception 'Você já enviou % respostas nesta pergunta.', d.limite; end if;
  if exists (select 1 from public.dinamica_respostas where edition_id = e.id and aparelho = p_aparelho and created_at > now() - interval '3 seconds') then raise exception 'Aguarde alguns segundos para enviar outra.'; end if;
  if (select count(*) from public.dinamica_respostas where edition_id = e.id and created_at > now() - interval '10 seconds') >= 80 then raise exception 'Muitas respostas ao mesmo tempo. Tente de novo em instantes.'; end if;
  insert into public.dinamica_respostas (edition_id, etapa, texto, chave, aparelho) values (e.id, p_etapa, upper(left(v_texto, 1)) || substr(v_texto, 2), v_chave, p_aparelho);
  return jsonb_build_object('ok', true, 'restam', d.limite - v_usadas - 1);
end;
$$;
revoke all on function public.communicali_dinamica_telao(text), public.communicali_dinamica_estado(text, text), public.communicali_dinamica_enviar(text, integer, text, text) from public;
grant execute on function public.communicali_dinamica_telao(text), public.communicali_dinamica_estado(text, text), public.communicali_dinamica_enviar(text, integer, text, text) to anon, authenticated;

-- Pesquisa de satisfação: tipo de e-mail novo, formulário da edição e envio automático no dia do encontro.
alter table public.email_log drop constraint if exists email_log_tipo_check;
alter table public.email_log add constraint email_log_tipo_check check (tipo = any (array['recebido', 'confirmacao', 'espera', 'lembrete', 'convite', 'boasvindas', 'agradecimento', 'card', 'pesquisa']));
alter table public.editions add column if not exists form_pesquisa text, add column if not exists pesquisa_auto boolean not null default true;
