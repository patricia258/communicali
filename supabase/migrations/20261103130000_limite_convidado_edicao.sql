-- CommuniCALI (03/11/2026): cada Membro indica até 1 convidado por edição (ajustável no painel). Os +5 pontos continuam só com a presença.
alter table public.editions add column if not exists limite_convidados integer not null default 1 check (limite_convidados >= 0);

create or replace function public.communicali_limite_convidado()
returns trigger language plpgsql security definer set search_path to 'pg_catalog', 'public' as $$
declare v_limite integer; v_usados integer;
begin
  if new.indicado_por is null or new.status = 'cancelado' then return new; end if;
  if tg_op = 'UPDATE' and old.indicado_por is not distinct from new.indicado_por and old.status <> 'cancelado' then return new; end if;
  if exists (select 1 from public.members where id = new.indicado_por and categoria = 'fundadora') then return new; end if;
  perform pg_advisory_xact_lock(hashtext(new.edition_id::text || new.indicado_por::text));
  select limite_convidados into v_limite from public.editions where id = new.edition_id;
  select count(*) into v_usados from public.registrations
   where edition_id = new.edition_id and indicado_por = new.indicado_por and status <> 'cancelado' and id is distinct from new.id;
  -- Inscrição pelo link de quem já usou a cota continua valendo, só sem vínculo de indicação.
  if v_usados >= coalesce(v_limite, 1) then new.indicado_por := null; end if;
  return new;
end;
$$;
revoke all on function public.communicali_limite_convidado() from public, anon, authenticated;
drop trigger if exists communicali_limite_convidado on public.registrations;
create trigger communicali_limite_convidado before insert or update of indicado_por, status on public.registrations
  for each row execute function public.communicali_limite_convidado();

create or replace function public.communicali_indicar_visitante(p_nome text, p_email text, p_whatsapp text, p_cargo text)
returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare m public.members%rowtype; e public.editions%rowtype; v_email text := lower(btrim(coalesce(p_email, ''))); v_usados integer;
begin
  m := public.communicali_eu();
  if m.id is null then raise exception 'Entre novamente para indicar.'; end if;
  select * into e from public.editions where publica and inscricoes_abertas and data_evento >= (now() at time zone 'America/Sao_Paulo')::date order by data_evento limit 1;
  if e.id is null then raise exception 'As inscrições do próximo encontro ainda não abriram.'; end if;
  if length(btrim(coalesce(p_nome, ''))) < 2 then raise exception 'Informe o nome da pessoa.'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Confira o e-mail da pessoa.'; end if;
  if v_email = m.email then raise exception 'Você não pode indicar a si mesmo.'; end if;
  if exists (select 1 from public.registrations where edition_id = e.id and email = v_email and status <> 'cancelado') then raise exception 'Esta pessoa já está inscrita neste encontro.'; end if;
  if m.categoria <> 'fundadora' then
    select count(*) into v_usados from public.registrations where edition_id = e.id and indicado_por = m.id and status <> 'cancelado';
    if v_usados >= e.limite_convidados then
      raise exception 'Você já indicou % neste encontro. No próximo, você pode trazer outra pessoa.', case when e.limite_convidados = 1 then '1 convidado' else e.limite_convidados || ' convidados' end;
    end if;
  end if;
  insert into public.registrations (edition_id, nome, email, whatsapp, cidade, cargo, status, indicado_por)
  values (e.id, left(btrim(p_nome), 160), v_email, left(btrim(coalesce(p_whatsapp, '')), 40), '', nullif(left(btrim(coalesce(p_cargo, '')), 160), ''), 'analise', m.id)
  on conflict (edition_id, email) do update set status = 'analise', indicado_por = m.id;
  return jsonb_build_object('slug', e.slug);
end;
$$;
revoke all on function public.communicali_indicar_visitante(text, text, text, text) from public, anon;
grant execute on function public.communicali_indicar_visitante(text, text, text, text) to authenticated;
