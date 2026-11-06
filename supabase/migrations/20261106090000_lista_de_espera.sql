-- Lista de espera no mesmo link de inscrição da edição. A organização escolhe na edição:
-- aberta (entra como Inscrito), espera (entra como Lista de espera, com aviso no formulário) ou fechada.

alter table public.editions add column if not exists inscricao_modo text not null default 'aberta' check (inscricao_modo in ('aberta', 'espera', 'fechada'));
alter table public.forms add column if not exists aviso text;

-- Nova situação: espera.
alter table public.registrations drop constraint if exists registrations_situacao_check;
alter table public.registrations add constraint registrations_situacao_check check (situacao in ('espera', 'inscrito', 'contatado', 'confirmado', 'sem_resposta', 'nao_vai'));
alter table public.guests drop constraint if exists guests_situacao_check;
alter table public.guests add constraint guests_situacao_check check (situacao in ('espera', 'inscrito', 'contatado', 'confirmado', 'sem_resposta', 'nao_vai'));
alter table public.edition_kids drop constraint if exists edition_kids_situacao_check;
alter table public.edition_kids add constraint edition_kids_situacao_check check (situacao in ('espera', 'inscrito', 'contatado', 'confirmado', 'sem_resposta', 'nao_vai'));

update public.forms f set stages = '["Lista de espera", "Inscrito", "Contatado", "Confirmado", "Sem resposta", "Não vai"]'::jsonb
 where exists (select 1 from public.editions e where e.form_inscricao = f.slug);

create or replace function public.communicali_situacao_etapa(p_stage text)
returns text language sql immutable as $$
  select case p_stage when 'Lista de espera' then 'espera' when 'Contatado' then 'contatado' when 'Confirmado' then 'confirmado' when 'Sem resposta' then 'sem_resposta' when 'Não vai' then 'nao_vai' else 'inscrito' end;
$$;
create or replace function public.communicali_situacao_registro(p_status text, p_situacao text)
returns text language sql immutable as $$
  select coalesce(p_situacao, case p_status when 'inscrito' then 'confirmado' when 'cancelado' then 'nao_vai' when 'espera' then 'espera' else 'inscrito' end);
$$;

create or replace function public.communicali_definir_situacao(p_fonte text, p_ids uuid[], p_situacao text)
returns integer language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare v integer;
begin
  if not public.is_admin() then raise exception 'Acesso restrito.'; end if;
  if p_situacao not in ('espera', 'inscrito', 'contatado', 'confirmado', 'sem_resposta', 'nao_vai') then raise exception 'Situação inválida.'; end if;
  if p_fonte = 'form' then
    update public.form_responses set stage = case p_situacao when 'espera' then 'Lista de espera' when 'inscrito' then 'Inscrito' when 'contatado' then 'Contatado' when 'confirmado' then 'Confirmado' when 'sem_resposta' then 'Sem resposta' else 'Não vai' end,
      contacted_at = case when p_situacao not in ('inscrito', 'espera') then coalesce(contacted_at, now()) else contacted_at end
     where id = any(p_ids);
  elsif p_fonte = 'registro' then update public.registrations set situacao = p_situacao where id = any(p_ids);
  elsif p_fonte = 'convidado' then update public.guests set situacao = p_situacao where id = any(p_ids);
  elsif p_fonte in ('manual', 'kids') then update public.edition_kids set situacao = p_situacao where id = any(p_ids);
  else raise exception 'Esta pessoa não tem situação para mudar aqui.';
  end if;
  get diagnostics v = row_count;
  return v;
end;
$$;

-- Resposta nova no formulário de uma edição: entra como Inscrito, ou Lista de espera quando a edição está nesse modo.
create or replace function public.communicali_etapa_inscricao()
returns trigger language plpgsql security definer set search_path to 'pg_catalog', 'public' as $$
declare v_modo text;
begin
  select e.inscricao_modo into v_modo from public.editions e join public.forms f on f.slug = e.form_inscricao where f.id = new.form_id limit 1;
  if v_modo is null then return new; end if;
  if v_modo = 'espera' then new.stage := 'Lista de espera'; elsif new.stage is null then new.stage := 'Inscrito'; end if;
  return new;
end;
$$;
drop trigger if exists form_responses_etapa_inscricao on public.form_responses;
create trigger form_responses_etapa_inscricao before insert on public.form_responses for each row execute function public.communicali_etapa_inscricao();

-- Chave da edição: abre, põe em lista de espera ou fecha o mesmo link do formulário.
create or replace function public.communicali_modo_inscricao(p_edition uuid, p_modo text)
returns void language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare v_slug text;
begin
  if not public.is_admin() then raise exception 'Acesso restrito.'; end if;
  if p_modo not in ('aberta', 'espera', 'fechada') then raise exception 'Modo inválido.'; end if;
  update public.editions set inscricao_modo = p_modo where id = p_edition returning form_inscricao into v_slug;
  if v_slug is null then return; end if;
  update public.forms set
    status = case when p_modo = 'fechada' then 'closed' else 'open' end,
    aviso = case when p_modo = 'espera' then 'As vagas desta edição estão preenchidas. Preencha a inscrição para entrar na **lista de espera**: se uma vaga abrir, a organização chama você pela ordem de inscrição.' end,
    success_text = case when p_modo = 'espera' then 'Você está na lista de espera! Se uma vaga abrir, a organização chama você por WhatsApp ou e-mail.' else success_text end
   where slug = v_slug;
  if p_modo <> 'espera' then
    update public.forms set success_text = null where slug = v_slug and success_text like 'Você está na lista de espera!%';
  end if;
end;
$$;
revoke all on function public.communicali_modo_inscricao(uuid, text) from public, anon;
grant execute on function public.communicali_modo_inscricao(uuid, text) to authenticated;
