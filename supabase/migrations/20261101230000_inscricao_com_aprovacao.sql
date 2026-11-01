-- CommuniCALI (01/11/2026): inscrição vira intenção de participar; a equipe aprova, coloca em espera ou recusa pelo painel.

alter table public.registrations drop constraint registrations_status_check;
alter table public.registrations add constraint registrations_status_check check (status in ('analise', 'inscrito', 'espera', 'cancelado'));
alter table public.registrations alter column status set default 'analise';

alter table public.email_log drop constraint email_log_tipo_check;
alter table public.email_log add constraint email_log_tipo_check check (tipo in ('recebido', 'confirmacao', 'espera', 'lembrete', 'convite'));

create or replace function public.communicali_inscrever(p_slug text, p_nome text, p_email text, p_whatsapp text, p_cidade text, p_empresa text, p_cargo text, p_privacidade boolean)
returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare
  e public.editions%rowtype; v_recent integer;
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  select * into e from public.editions where slug = lower(btrim(coalesce(p_slug, '')));
  if not found then raise exception 'Edição não encontrada.'; end if;
  if not e.inscricoes_abertas then raise exception 'As inscrições desta edição estão encerradas.'; end if;
  if length(btrim(coalesce(p_nome, ''))) < 2 then raise exception 'Informe seu nome completo.'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Confira o e-mail digitado.'; end if;
  if length(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g')) < 10 then raise exception 'Confira o WhatsApp com DDD.'; end if;
  if length(btrim(coalesce(p_cidade, ''))) < 2 then raise exception 'Informe sua cidade e estado.'; end if;
  if not coalesce(p_privacidade, false) then raise exception 'Para continuar, aceite a política de privacidade.'; end if;
  select count(*) into v_recent from public.registrations where created_at > now() - interval '1 minute';
  if v_recent >= 30 then raise exception 'Muitas inscrições ao mesmo tempo. Tente de novo em instantes.'; end if;
  if exists (select 1 from public.registrations where edition_id = e.id and email = v_email and status <> 'cancelado') then raise exception 'Este e-mail já está inscrito nesta edição.'; end if;
  insert into public.registrations (edition_id, nome, email, whatsapp, cidade, empresa, cargo, status)
  values (e.id, left(btrim(p_nome), 160), v_email, left(btrim(p_whatsapp), 40), left(btrim(p_cidade), 120), nullif(left(btrim(coalesce(p_empresa, '')), 160), ''), nullif(left(btrim(coalesce(p_cargo, '')), 160), ''), 'analise')
  on conflict (edition_id, email) do update set status = 'analise', nome = excluded.nome;
  return jsonb_build_object('status', 'analise');
end;
$$;
