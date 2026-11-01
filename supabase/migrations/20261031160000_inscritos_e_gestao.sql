-- CommuniCALI (31/10/2026): check-in de quem já se inscreveu no formulário da edição, suspensão e exclusão de membros
-- e lançamentos manuais de pontos. Quem digita um e-mail nunca recebe dados pessoais: o banco usa a inscrição internamente.

alter table public.members add column status text not null default 'ativo' check (status in ('ativo', 'suspenso'));
alter table public.editions add column form_inscricao text;
update public.editions set form_inscricao = 'coffee-rh-cwb' where slug = 'fundadora';
update public.editions set form_inscricao = 'coffee-rh-cwb' where slug = 'teste';

alter table public.point_events alter column edition_id drop not null;
alter table public.point_events add column motivo text;

create or replace function public.communicali_inscricao(p_edition public.editions, p_email text)
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select r.answers from public.form_responses r join public.forms f on f.id = r.form_id
   where f.slug = p_edition.form_inscricao and lower(r.respondent_email) = lower(btrim(coalesce(p_email, '')))
   order by r.submitted_at desc limit 1;
$$;
revoke all on function public.communicali_inscricao(public.editions, text) from public, anon, authenticated;

create or replace function public.communicali_situacao_email(p_slug text, p_email text)
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog', 'public' as $$
declare e public.editions%rowtype; v_inscricao jsonb; v_status text; v_email text := lower(btrim(coalesce(p_email, '')));
begin
  select * into e from public.editions where slug = lower(btrim(coalesce(p_slug, '')));
  if not found then raise exception 'Edição não encontrada.'; end if;
  if now() < e.checkin_abre then raise exception 'O check-in ainda não abriu.'; end if;
  if now() > e.checkin_fecha then raise exception 'O check-in desta edição foi encerrado.'; end if;
  select status into v_status from public.members where email = v_email;
  if v_status = 'suspenso' then raise exception 'Procure a organização na recepção.'; end if;
  if v_status is not null then return jsonb_build_object('membro', true, 'inscrito', false); end if;
  v_inscricao := public.communicali_inscricao(e, v_email);
  return jsonb_build_object('membro', false, 'inscrito', v_inscricao is not null, 'nome', split_part(btrim(coalesce(v_inscricao ->> 'nome', '')), ' ', 1));
end;
$$;

-- Inscrito na edição: confirma os aceites e o cadastro é montado com o que ele já respondeu.
create or replace function public.communicali_checkin_inscrito(
  p_slug text, p_email text, p_privacidade boolean, p_regras boolean, p_comunicacoes boolean, p_imagem boolean
) returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare e public.editions%rowtype; v jsonb; v_member uuid;
begin
  select * into e from public.editions where slug = lower(btrim(coalesce(p_slug, '')));
  if not found then raise exception 'Edição não encontrada.'; end if;
  if now() < e.checkin_abre then raise exception 'O check-in ainda não abriu.'; end if;
  if now() > e.checkin_fecha then raise exception 'O check-in desta edição foi encerrado.'; end if;
  v := public.communicali_inscricao(e, p_email);
  if v is null then raise exception 'Não encontramos sua inscrição.'; end if;
  v_member := public.communicali_novo_membro(btrim(coalesce(v ->> 'nome', '') || ' ' || coalesce(v ->> 'sobrenome', '')), null, p_email,
    v ->> 'whatsapp', v ->> 'cidade', v ->> 'empresa', v ->> 'cargo', null, '{}', 'Inscrição no encontro', p_privacidade, p_regras, p_comunicacoes, p_imagem);
  return public.communicali_registrar_presenca(e.id, v_member, 'qr');
end;
$$;
revoke all on function public.communicali_checkin_inscrito(text, text, boolean, boolean, boolean, boolean) from public;
grant execute on function public.communicali_checkin_inscrito(text, text, boolean, boolean, boolean, boolean) to anon, authenticated;

create or replace function public.communicali_registrar_presenca(p_edition uuid, p_member uuid, p_origem text)
returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare
  v_id uuid; v_codigo text; m public.members%rowtype; e public.editions%rowtype;
begin
  select * into e from public.editions where id = p_edition;
  select * into m from public.members where id = p_member;
  if m.status = 'suspenso' then raise exception 'Procure a organização na recepção.'; end if;
  insert into public.checkins (edition_id, member_id, origem) values (p_edition, p_member, p_origem)
  on conflict (edition_id, member_id) do nothing returning id into v_id;
  insert into public.point_events (member_id, edition_id, acao, pontos) values (p_member, p_edition, 'presenca', 10)
  on conflict (member_id, edition_id, acao) do nothing;
  update public.members set cracha_status = 'disponivel', updated_at = now() where id = p_member and cracha_status = 'nao_disponivel';
  select * into m from public.members where id = p_member;
  perform public.communicali_creditar_convidado(p_edition, m.email);
  select codigo into v_codigo from public.checkins where edition_id = p_edition and member_id = p_member;
  return jsonb_build_object('nome', coalesce(nullif(m.apelido, ''), m.nome), 'categoria', m.categoria, 'edicao', e.titulo, 'selo', e.selo, 'codigo', v_codigo, 'repetido', v_id is null);
end;
$$;
revoke all on function public.communicali_registrar_presenca(uuid, uuid, text) from public, anon, authenticated;

-- Exclusão definitiva de um membro, com presenças, pontos e indicações. Fica registrada no histórico de alterações.
create or replace function public.admin_excluir_membro(p_member uuid)
returns void language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão.'; end if;
  delete from public.guests where member_id = p_member;
  delete from public.point_events where member_id = p_member;
  delete from public.checkins where member_id = p_member;
  delete from public.members where id = p_member;
end;
$$;
revoke all on function public.admin_excluir_membro(uuid) from public;
grant execute on function public.admin_excluir_membro(uuid) to authenticated;
grant delete on public.members to authenticated;
