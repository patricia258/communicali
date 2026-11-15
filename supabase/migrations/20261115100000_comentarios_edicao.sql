-- Comentários nas edições encerradas (15/11/2026).
-- Qualquer pessoa pode comentar (com nome ou anônimo). O comentário só aparece no site depois de aprovado no painel.
-- Ninguém lê nem grava a tabela direto: o site usa as duas funções abaixo; o administrador usa a política da tabela.

create table if not exists public.edition_comments (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions(id) on delete cascade,
  nome text,
  anonimo boolean not null default true,
  texto text not null check (char_length(texto) between 3 and 600),
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado')),
  decidido_em timestamptz,
  decidido_por text,
  created_at timestamptz not null default now()
);
create index if not exists edition_comments_edicao_idx on public.edition_comments (edition_id, status, created_at desc);

alter table public.edition_comments enable row level security;
drop policy if exists comments_admin on public.edition_comments;
create policy comments_admin on public.edition_comments for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Enviar comentário: só em edição pública e já realizada. Campo "site" é armadilha para robôs.
create or replace function public.communicali_comentar(p_slug text, p_texto text, p_nome text, p_anonimo boolean, p_site text default '')
returns boolean language plpgsql security definer set search_path = public as $$
declare
  ed uuid;
  recentes int;
  limpo text := btrim(coalesce(p_texto, ''));
  nome_limpo text := nullif(left(btrim(coalesce(p_nome, '')), 80), '');
begin
  if coalesce(p_site, '') <> '' then return true; end if;
  select id into ed from public.editions where slug = p_slug and publica and data_evento < (now() at time zone 'America/Sao_Paulo')::date;
  if ed is null then raise exception 'Esta edição não recebe comentários.'; end if;
  if char_length(limpo) < 3 or char_length(limpo) > 600 then raise exception 'O comentário precisa ter de 3 a 600 letras.'; end if;
  select count(*) into recentes from public.edition_comments where edition_id = ed and created_at > now() - interval '1 hour';
  if recentes >= 30 then raise exception 'Recebemos muitos comentários agora. Tente de novo mais tarde.'; end if;
  insert into public.edition_comments (edition_id, nome, anonimo, texto)
  values (ed, case when p_anonimo then null else nome_limpo end, p_anonimo or nome_limpo is null, limpo);
  return true;
end $$;

-- Ler comentários aprovados de uma edição.
create or replace function public.communicali_comentarios(p_slug text)
returns table (id uuid, nome text, texto text, created_at timestamptz) language sql security definer stable set search_path = public as $$
  select c.id, case when c.anonimo then null else c.nome end, c.texto, c.created_at
  from public.edition_comments c join public.editions e on e.id = c.edition_id
  where e.slug = p_slug and e.publica and c.status = 'aprovado'
  order by c.created_at desc limit 100;
$$;

revoke all on function public.communicali_comentar(text, text, text, boolean, text) from public;
revoke all on function public.communicali_comentarios(text) from public;
grant execute on function public.communicali_comentar(text, text, text, boolean, text) to anon, authenticated;
grant execute on function public.communicali_comentarios(text) to anon, authenticated;
