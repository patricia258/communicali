-- Tela ao vivo: informa também se a votação está aberta (para avisar na tela quando ainda não foi ativada).
create or replace function public.communicali_resultado(p_slug text)
returns jsonb language sql stable security definer set search_path = pg_catalog, public as $$
  select jsonb_build_object('titulo', p.titulo, 'pergunta', p.pergunta, 'pergunta_2', p.pergunta_2, 'situacao', p.status,
    'votos', (select count(*) from public.poll_votes v where v.poll_id = p.id),
    'media', (select round(avg(v.nota), 1) from public.poll_votes v where v.poll_id = p.id),
    'media_2', (select round(avg(v.nota_2), 1) from public.poll_votes v where v.poll_id = p.id),
    'dist', (select coalesce(jsonb_object_agg(n, c), '{}') from (select v.nota n, count(*) c from public.poll_votes v where v.poll_id = p.id and v.nota is not null group by v.nota) s),
    'dist_2', (select coalesce(jsonb_object_agg(n, c), '{}') from (select v.nota_2 n, count(*) c from public.poll_votes v where v.poll_id = p.id and v.nota_2 is not null group by v.nota_2) s))
  from public.polls p where p.slug = lower(btrim(coalesce(p_slug, ''))) and p.tipo = 'nota';
$$;
