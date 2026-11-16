-- Avatar escolhido por quem comenta (12 opções). Aplicada pelo Claude em 16/11/2026.
alter table public.edition_comments add column if not exists avatar text;
alter table public.edition_comments drop constraint if exists edition_comments_avatar_check;
alter table public.edition_comments add constraint edition_comments_avatar_check check (avatar is null or avatar in ('bagagem','aviao','trilha','estrela','cafe','coracao','bussola','sol','planta','ideia','montanha','conversa'));

drop function if exists public.communicali_comentar(text, text, text, boolean, text);
create function public.communicali_comentar(p_slug text, p_texto text, p_nome text, p_anonimo boolean, p_site text default '', p_avatar text default null) returns boolean
language plpgsql security definer set search_path to 'public' as $$
declare
  ed uuid;
  recentes int;
  limpo text := btrim(coalesce(p_texto, ''));
  nome_limpo text := nullif(left(btrim(coalesce(p_nome, '')), 80), '');
  av text := nullif(btrim(coalesce(p_avatar, '')), '');
begin
  if coalesce(p_site, '') <> '' then return true; end if;
  if av is not null and av not in ('bagagem','aviao','trilha','estrela','cafe','coracao','bussola','sol','planta','ideia','montanha','conversa') then av := null; end if;
  select id into ed from public.editions where slug = p_slug and publica and data_evento < (now() at time zone 'America/Sao_Paulo')::date;
  if ed is null then raise exception 'Esta edição não recebe comentários.'; end if;
  if char_length(limpo) < 3 or char_length(limpo) > 600 then raise exception 'O comentário precisa ter de 3 a 600 letras.'; end if;
  select count(*) into recentes from public.edition_comments where edition_id = ed and created_at > now() - interval '1 hour';
  if recentes >= 30 then raise exception 'Recebemos muitos comentários agora. Tente de novo mais tarde.'; end if;
  insert into public.edition_comments (edition_id, nome, anonimo, texto, avatar)
  values (ed, case when p_anonimo then null else nome_limpo end, p_anonimo or nome_limpo is null, limpo, av);
  return true;
end $$;
revoke all on function public.communicali_comentar(text,text,text,boolean,text,text) from public;
grant execute on function public.communicali_comentar(text,text,text,boolean,text,text) to anon, authenticated;

drop function if exists public.communicali_comentarios(text);
create function public.communicali_comentarios(p_slug text) returns table(id uuid, nome text, texto text, created_at timestamptz, avatar text)
language sql stable security definer set search_path to 'public' as $$
  select c.id, case when c.anonimo then null else c.nome end, c.texto, c.created_at, c.avatar
  from public.edition_comments c join public.editions e on e.id = c.edition_id
  where e.slug = p_slug and e.publica and c.status = 'aprovado'
  order by c.created_at desc limit 100;
$$;
revoke all on function public.communicali_comentarios(text) from public;
grant execute on function public.communicali_comentarios(text) to anon, authenticated;

-- Os dois comentários já publicados ganham um avatar.
update public.edition_comments set avatar = case when anonimo then 'aviao' else 'estrela' end where avatar is null and status = 'aprovado';
