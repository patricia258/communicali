-- Regras v23 (15/11/2026), parte 4: o que contradizia a regra nova.
-- Contador de presenças antes da adesão (só check-in validado, atividade aberta e gratuita).
create or replace function public.communicali_presencas_pre_membro(p_member uuid) returns integer
language sql stable security definer set search_path = pg_catalog, public as $$
  select count(*)::int from public.checkins c join public.editions e on e.id = c.edition_id join public.members m on m.id = c.member_id
  where c.member_id = p_member and e.elegivel_pre_membro and (m.adesao_decidida_em is null or c.checked_in_at < m.adesao_decidida_em);
$$;

alter table public.adesao_log add column if not exists email_enviado_em timestamptz;

CREATE OR REPLACE FUNCTION public.communicali_registrar_presenca(p_edition uuid, p_member uuid, p_origem text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_id uuid; v_codigo text; m public.members%rowtype; e public.editions%rowtype; v_junto jsonb;
begin
  select * into e from public.editions where id = p_edition;
  select * into m from public.members where id = p_member;
  -- Regras v23: até 2 presenças antes da adesão aprovada, só em atividade aberta e gratuita.
  if m.adesao_status is distinct from 'aprovada' and e.elegivel_pre_membro
     and not exists (select 1 from public.checkins where edition_id = p_edition and member_id = p_member)
     and public.communicali_presencas_pre_membro(p_member) >= 2 then
    raise exception 'Você já viveu as 2 experiências abertas e gratuitas antes da adesão. Para continuar, peça a adesão como Membro.';
  end if;
  insert into public.checkins (edition_id, member_id, origem) values (p_edition, p_member, p_origem)
  on conflict (edition_id, member_id) do nothing returning id into v_id;
  -- Milhas só depois da adesão aprovada; a presença anterior fica no histórico, sem crédito retroativo.
  if m.adesao_status = 'aprovada' then
    insert into public.point_events (member_id, edition_id, acao, pontos) values (p_member, p_edition, 'presenca', 10)
    on conflict (member_id, edition_id, acao) do nothing;
  end if;
  if m.adesao_status is distinct from 'aprovada' and m.estagio_entrada is null then
    update public.members set estagio_entrada = case when exists (select 1 from public.guests g where g.edition_id = p_edition and g.email = lower(m.email) and g.status in ('inscrito', 'confirmado', 'presente')) then 'convidado' else 'visitante' end
     where id = p_member;
  end if;
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
  return jsonb_build_object('nome', coalesce(nullif(m.apelido, ''), m.nome), 'categoria', case when m.adesao_status = 'aprovada' then m.categoria else coalesce(m.estagio_entrada, 'visitante') end, 'edicao', e.titulo, 'selo', e.selo, 'codigo', v_codigo, 'repetido', v_id is null, 'junto', v_junto);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.communicali_meu_espaco()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare m public.members%rowtype; v_codigo text; v_conv integer;
begin
  m := public.communicali_eu();
  if m.id is null then return jsonb_build_object('membro', null); end if;
  -- A organização vê o passaporte mesmo antes do primeiro check-in.
  -- Passaporte trancado até a liberação (site_settings.passaporte_aberto): só a organização entra antes.
  if m.categoria not in ('fundadora', 'organizador') then
    if not coalesce((select passaporte_aberto from public.site_settings limit 1), false) then return jsonb_build_object('membro', null, 'em_breve', true); end if;
    -- Regras v23: o passaporte completo só abre depois da adesão aprovada. Antes, só o estado do pedido.
    if m.adesao_status is distinct from 'aprovada' then
      return jsonb_build_object('membro', null, 'adesao', jsonb_build_object('status', m.adesao_status, 'motivo', m.adesao_motivo, 'presencas', public.communicali_presencas_pre_membro(m.id), 'limite', 2, 'nome', coalesce(nullif(m.apelido, ''), m.nome)));
    end if;
  end if;
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
$function$
;

CREATE OR REPLACE FUNCTION public.communicali_rede()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare m public.members%rowtype; v_acesso boolean;
begin
  m := public.communicali_eu();
  if m.id is null or not exists (select 1 from public.checkins where member_id = m.id) then raise exception 'A Rede abre depois do primeiro encontro presencial.'; end if;
  v_acesso := m.categoria in ('fundadora', 'conector', 'embaixador', 'organizador');
  if not v_acesso then
    return jsonb_build_object('eu', m.id, 'acesso', false, 'total', (select count(*) from public.members p where p.na_rede and p.adesao_status = 'aprovada' and p.status = 'ativo'), 'pessoas', '[]'::jsonb, 'parceiros', '[]'::jsonb);
  end if;
  return jsonb_build_object('eu', m.id, 'acesso', true,
    'pessoas', coalesce((select jsonb_agg(public.communicali_ficha(p, true, m.id)
        order by case p.categoria when 'fundadora' then 0 when 'embaixador' then 1 when 'conector' then 2 when 'membro' then 3 when 'organizador' then 4 else 9 end, p.nome)
      from public.members p where p.na_rede and p.adesao_status = 'aprovada' and p.status = 'ativo' and exists (select 1 from public.checkins c where c.member_id = p.id)), '[]'::jsonb),
    'parceiros', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'nome', x.nome, 'logo_url', x.logo_url, 'site_url', x.site_url) order by x.ordem, x.nome) from public.partners x where x.ativo), '[]'::jsonb));
end;
$function$
;

-- Pedido de adesão feito pela própria pessoa, depois da primeira presença validada.
create or replace function public.communicali_pedir_adesao(p_termos boolean, p_privacidade boolean, p_comunicacoes boolean, p_imagem boolean, p_diretorio boolean)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare m public.members%rowtype; v_pre integer;
begin
  m := public.communicali_eu();
  if m.id is null then raise exception 'Entre com o e-mail do seu cadastro.'; end if;
  if m.adesao_status = 'aprovada' then raise exception 'Você já é Membro.'; end if;
  if m.adesao_status in ('solicitada', 'em_analise') then raise exception 'O seu pedido já está em análise.'; end if;
  if m.adesao_status = 'nao_aprovada' then raise exception 'Este pedido já foi analisado. Escreva para contato@calirh.com.'; end if;
  v_pre := public.communicali_presencas_pre_membro(m.id);
  if v_pre < 1 then raise exception 'O pedido fica disponível depois da sua primeira presença validada.'; end if;
  if not coalesce(p_termos, false) or not coalesce(p_privacidade, false) then raise exception 'Para pedir a adesão, aceite os Termos de participação e a Política de privacidade.'; end if;
  update public.members set
    adesao_status = 'solicitada', adesao_motivo = null, adesao_solicitada_em = now(), adesao_origem = 'pedido',
    termos_aceitos_em = now(), privacidade_aceita_em = now(), regras_aceitas_em = coalesce(regras_aceitas_em, now()),
    autoriza_comunicacoes = coalesce(p_comunicacoes, false), autoriza_imagem = coalesce(p_imagem, false), na_rede = coalesce(p_diretorio, false), updated_at = now()
  where id = m.id;
  insert into public.adesao_log (member_id, de, para, por) values (m.id, m.adesao_status, 'solicitada', m.email);
  return jsonb_build_object('status', 'solicitada');
end $$;
revoke all on function public.communicali_pedir_adesao(boolean, boolean, boolean, boolean, boolean) from public, anon;
grant execute on function public.communicali_pedir_adesao(boolean, boolean, boolean, boolean, boolean) to authenticated;
revoke all on function public.communicali_presencas_pre_membro(uuid) from public, anon;
grant execute on function public.communicali_presencas_pre_membro(uuid) to authenticated;

-- Aparecer na Rede é escolha da pessoa: novos cadastros começam fora; quem ainda não é Membro aprovado sai da Rede.
alter table public.members alter column na_rede set default false;
update public.members set na_rede = false where adesao_status is distinct from 'aprovada' and na_rede;
