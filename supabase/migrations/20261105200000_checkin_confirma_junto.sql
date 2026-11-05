-- Check-in junto: o responsável marca quem veio com ele. Quem não veio não é contado.
-- registrar_presenca deixa de marcar sozinho e devolve a lista (id, tipo, nome) para a tela de sucesso.

create or replace function public.communicali_registrar_presenca(p_edition uuid, p_member uuid, p_origem text)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog', 'public' as $function$
declare
  v_id uuid; v_codigo text; m public.members%rowtype; e public.editions%rowtype; v_junto jsonb;
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
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'tipo', x.tipo, 'nome', x.nome, 'chegou', x.chegou) order by x.nome), '[]'::jsonb) into v_junto from (
    select k.id, 'kids' tipo, k.nome, k.chegou_em is not null chegou from public.edition_kids k
     where k.edition_id = p_edition and lower(btrim(k.responsavel_email)) = lower(m.email) and k.situacao <> 'nao_vai'
    union all
    select fr.id, 'form', btrim(fr.respondent_name || coalesce(' ' || nullif(btrim(fr.answers ->> 'sobrenome'), ''), '')), fr.chegou_em is not null
      from public.form_responses fr join public.forms f on f.id = fr.form_id where f.slug = e.form_inscricao and lower(btrim(fr.junto_com_email)) = lower(m.email)
  ) x;
  select codigo into v_codigo from public.checkins where edition_id = p_edition and member_id = p_member;
  return jsonb_build_object('nome', coalesce(nullif(m.apelido, ''), m.nome), 'categoria', m.categoria, 'edicao', e.titulo, 'selo', e.selo, 'codigo', v_codigo, 'repetido', v_id is null, 'junto', v_junto);
end;
$function$;

-- Tela de sucesso do check-in: o código do check-in identifica quem fez; só marca quem está ligado a essa pessoa.
create or replace function public.communicali_confirmar_junto(p_codigo text, p_ids uuid[])
returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare c public.checkins%rowtype; v_email text; v_slug text; v_nomes text[];
begin
  select * into c from public.checkins where codigo = upper(btrim(coalesce(p_codigo, '')));
  if not found then raise exception 'Check-in não encontrado.'; end if;
  select lower(m.email) into v_email from public.members m where m.id = c.member_id;
  select e.form_inscricao into v_slug from public.editions e where e.id = c.edition_id;
  update public.edition_kids set chegou_em = coalesce(chegou_em, now())
   where id = any(coalesce(p_ids, '{}')) and edition_id = c.edition_id and lower(btrim(responsavel_email)) = v_email;
  update public.form_responses fr set chegou_em = coalesce(fr.chegou_em, now()) from public.forms f
   where fr.id = any(coalesce(p_ids, '{}')) and f.id = fr.form_id and f.slug = v_slug and lower(btrim(fr.junto_com_email)) = v_email;
  select array_agg(x.nome order by x.nome) into v_nomes from (
    select k.nome from public.edition_kids k where k.id = any(coalesce(p_ids, '{}')) and k.edition_id = c.edition_id and lower(btrim(k.responsavel_email)) = v_email
    union all
    select fr.respondent_name from public.form_responses fr where fr.id = any(coalesce(p_ids, '{}')) and lower(btrim(fr.junto_com_email)) = v_email) x;
  return jsonb_build_object('nomes', coalesce(to_jsonb(v_nomes), '[]'::jsonb));
end;
$$;
grant execute on function public.communicali_confirmar_junto(text, uuid[]) to anon, authenticated;
