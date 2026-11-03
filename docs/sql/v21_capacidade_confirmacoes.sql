-- RASCUNHO NÃO APLICADO. Destino exclusivo: cyyrrtekbkltdiatixhp.
-- Verificar schema/triggers reais antes de formalizar migração. Não altera inscrições
-- existentes. Cobertura por trigger inclui o PATCH administrativo atual via service role.
-- Capacidade é de inscrições confirmadas; oferta temporária de espera é outro módulo.
begin;
create schema if not exists communicali_private;
revoke all on schema communicali_private from public;

create or replace function communicali_private.conferir_capacidade()
returns trigger language plpgsql volatile security definer set search_path = '' as $$
declare v_limite integer; v_total bigint; v_anterior uuid;
begin
  if new.status is distinct from 'inscrito' then return new; end if;
  if tg_op = 'UPDATE' then
    if old.status = 'inscrito' and old.edition_id = new.edition_id then return new; end if;
    v_anterior := old.edition_id;
  end if;
  -- Ordem estável também para uma eventual transferência entre duas edições.
  perform e.id from public.editions e
    where e.id = new.edition_id or e.id = v_anterior order by e.id for update;
  select e.capacidade into v_limite from public.editions e where e.id = new.edition_id;
  if not found then raise exception 'Edição não encontrada.'; end if;
  if v_limite is null then return new; end if;
  if v_limite < 0 then raise exception 'Confira a capacidade da edição.'; end if;
  select count(*) into v_total from public.registrations r
    where r.edition_id = new.edition_id and r.status = 'inscrito' and r.id is distinct from new.id;
  if v_total >= v_limite then
    raise exception 'As vagas confirmadas desta edição estão preenchidas. Use a lista de espera.';
  end if;
  return new;
end;
$$;
revoke all on function communicali_private.conferir_capacidade() from public, anon, authenticated;
drop trigger if exists communicali_v21_capacidade on public.registrations;
create trigger communicali_v21_capacidade
  before insert or update of status, edition_id on public.registrations
  for each row execute function communicali_private.conferir_capacidade();
commit;
