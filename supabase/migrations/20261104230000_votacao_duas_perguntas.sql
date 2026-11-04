-- Votação com segunda pergunta de nota (ex.: "na opinião" e "na prática") e resultado ao vivo para a tela de resultado.
alter table public.polls add column if not exists pergunta_2 text;
alter table public.poll_votes add column if not exists nota_2 smallint check (nota_2 between 0 and 10);

drop function if exists public.communicali_votar(text, text, integer, text, text, text);
create or replace function public.communicali_votar(p_slug text, p_aparelho text, p_nota integer, p_opcao text, p_texto text, p_respondente text, p_nota_2 integer default null)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_poll public.polls%rowtype; v_id uuid; v_recent integer; v_texto text := nullif(left(btrim(coalesce(p_texto, '')), 500), '');
begin
  select * into v_poll from public.polls where slug = lower(btrim(coalesce(p_slug, '')));
  if not found then raise exception 'Votação não encontrada.'; end if;
  if v_poll.status = 'rascunho' then raise exception 'A votação ainda não abriu.'; end if;
  if v_poll.status = 'encerrada' then raise exception 'A votação foi encerrada.'; end if;
  if v_poll.tipo = 'nota' and (p_nota is null or p_nota not between 0 and 10) then raise exception 'Escolha uma nota de 0 a 10.'; end if;
  if v_poll.tipo = 'nota' and v_poll.pergunta_2 is not null and (p_nota_2 is null or p_nota_2 not between 0 and 10) then raise exception 'Responda também a segunda pergunta, de 0 a 10.'; end if;
  if v_poll.tipo = 'multipla' and not (p_opcao = any(v_poll.opcoes)) then raise exception 'Escolha uma das opções.'; end if;
  if v_poll.tipo = 'aberta' and v_texto is null then raise exception 'Escreva sua resposta.'; end if;
  if not v_poll.anonima and length(btrim(coalesce(p_respondente, ''))) < 2 then raise exception 'Informe seu nome.'; end if;
  if length(coalesce(p_aparelho, '')) not between 16 and 80 then raise exception 'Não foi possível registrar o voto. Recarregue a página.'; end if;
  select count(*) into v_recent from public.poll_votes where poll_id = v_poll.id and created_at > now() - interval '1 minute';
  if v_recent >= 120 then raise exception 'Muitos votos ao mesmo tempo. Tente de novo em instantes.'; end if;
  insert into public.poll_votes (poll_id, aparelho_hash, nota, opcao, texto, respondente, nota_2)
  values (v_poll.id, encode(sha256(convert_to(v_poll.id::text || p_aparelho, 'UTF8')), 'hex'),
          case when v_poll.tipo = 'nota' then p_nota end, case when v_poll.tipo = 'multipla' then p_opcao end,
          case when v_poll.tipo = 'aberta' then v_texto end, case when not v_poll.anonima then left(btrim(p_respondente), 160) end,
          case when v_poll.tipo = 'nota' and v_poll.pergunta_2 is not null then p_nota_2 end)
  on conflict (poll_id, aparelho_hash) do nothing returning id into v_id;
  return jsonb_build_object('repetido', v_id is null);
end;
$function$

;
grant execute on function public.communicali_votar(text, text, integer, text, text, text, integer) to anon, authenticated;

-- A votação devolve também a segunda pergunta.
create or replace function public.communicali_votacao(p_slug text)
returns jsonb language sql stable security definer set search_path = pg_catalog, public as $$
  select jsonb_build_object('titulo', p.titulo, 'pergunta', p.pergunta, 'pergunta_2', p.pergunta_2, 'tipo', p.tipo, 'opcoes', to_jsonb(p.opcoes), 'anonima', p.anonima,
         'situacao', p.status, 'revelada', p.revelada, 'votos', (select count(*) from public.poll_votes v where v.poll_id = p.id),
         'media', case when p.revelada then (select round(avg(v.nota), 1) from public.poll_votes v where v.poll_id = p.id) end,
         'distribuicao', case when p.revelada and p.tipo = 'nota' then (select coalesce(jsonb_object_agg(n, c), '{}') from (select v.nota n, count(*) c from public.poll_votes v where v.poll_id = p.id group by v.nota) s) end,
         'por_opcao', case when p.revelada and p.tipo = 'multipla' then (select coalesce(jsonb_object_agg(o, c), '{}') from (select v.opcao o, count(*) c from public.poll_votes v where v.poll_id = p.id group by v.opcao) s) end,
         'textos', case when p.revelada and p.tipo = 'aberta' then (select coalesce(jsonb_agg(t.texto), '[]') from (select v.texto from public.poll_votes v where v.poll_id = p.id order by v.created_at desc limit 12) t) end)
    from public.polls p where p.slug = lower(btrim(coalesce(p_slug, '')));
$$;

-- Tela de resultado: total, médias e distribuição de 0 a 10 das duas perguntas, sempre atualizados.
create or replace function public.communicali_resultado(p_slug text)
returns jsonb language sql stable security definer set search_path = pg_catalog, public as $$
  select jsonb_build_object('titulo', p.titulo, 'pergunta', p.pergunta, 'pergunta_2', p.pergunta_2,
    'votos', (select count(*) from public.poll_votes v where v.poll_id = p.id),
    'media', (select round(avg(v.nota), 1) from public.poll_votes v where v.poll_id = p.id),
    'media_2', (select round(avg(v.nota_2), 1) from public.poll_votes v where v.poll_id = p.id),
    'dist', (select coalesce(jsonb_object_agg(n, c), '{}') from (select v.nota n, count(*) c from public.poll_votes v where v.poll_id = p.id and v.nota is not null group by v.nota) s),
    'dist_2', (select coalesce(jsonb_object_agg(n, c), '{}') from (select v.nota_2 n, count(*) c from public.poll_votes v where v.poll_id = p.id and v.nota_2 is not null group by v.nota_2) s))
  from public.polls p where p.slug = lower(btrim(coalesce(p_slug, ''))) and p.tipo = 'nota';
$$;
revoke all on function public.communicali_resultado(text) from public;
grant execute on function public.communicali_resultado(text) to anon, authenticated;
