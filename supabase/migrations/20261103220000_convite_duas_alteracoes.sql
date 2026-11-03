-- ComuniCALI (03/11/2026): o Membro pode trocar o código do convite duas vezes. Base: rascunho etapa_7 do ChatGPT.
alter table public.members add column codigo_alteracoes integer not null default 0
  check (codigo_alteracoes between 0 and 2);

create schema if not exists communicali_private;
revoke all on schema communicali_private from public, anon;
grant usage on schema communicali_private to authenticated;

create function communicali_private.convite_config() returns jsonb
language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare m public.members%rowtype;
begin
  if auth.uid() is null then raise exception 'Entre novamente.' using errcode = '42501'; end if;
  m := public.communicali_eu();
  if m.id is null or m.status is distinct from 'ativo' then raise exception 'Entre novamente.' using errcode = '42501'; end if;
  return jsonb_build_object('codigo', m.codigo, 'alteracoes', m.codigo_alteracoes, 'restantes', 2 - m.codigo_alteracoes);
end;
$$;

create function communicali_private.convite_alterar(p_codigo text) returns jsonb
language plpgsql volatile security definer set search_path = pg_catalog, public as $$
declare m public.members%rowtype; v_codigo text := upper(btrim(coalesce(p_codigo,'')));
begin
  if auth.uid() is null then raise exception 'Entre novamente.' using errcode = '42501'; end if;
  m := public.communicali_eu();
  if m.id is null then raise exception 'Entre novamente.' using errcode = '42501'; end if;
  -- Serializa trocas do mesmo membro. O índice UNIQUE existente protege códigos de membros diferentes.
  select * into m from public.members where id = m.id for update;
  if m.id is null or m.status is distinct from 'ativo' then raise exception 'Entre novamente.' using errcode = '42501'; end if;
  if v_codigo !~ '^[A-Z0-9-]{4,20}$' then raise exception 'Use de 4 a 20 letras, números ou hífen, sem espaços nem acentos.'; end if;
  -- Repetir uma requisição já salva não gasta outra alteração.
  if m.codigo = v_codigo then
    return jsonb_build_object('codigo',m.codigo,'alteracoes',m.codigo_alteracoes,'restantes',2-m.codigo_alteracoes);
  end if;
  if m.codigo_alteracoes >= 2 then raise exception 'Você já usou as duas alterações do código.'; end if;
  begin
    update public.members set codigo = v_codigo, codigo_alteracoes = codigo_alteracoes + 1, updated_at = now()
      where id = m.id returning * into m;
  exception when unique_violation then
    raise exception 'Este código já está em uso. Escolha outro.';
  end;
  return jsonb_build_object('codigo',m.codigo,'alteracoes',m.codigo_alteracoes,'restantes',2-m.codigo_alteracoes);
end;
$$;

create function public.communicali_convite_config() returns jsonb language sql stable security invoker
  set search_path = pg_catalog as $$ select communicali_private.convite_config(); $$;
create function public.communicali_convite_alterar(p_codigo text) returns jsonb language sql volatile security invoker
  set search_path = pg_catalog as $$ select communicali_private.convite_alterar(p_codigo); $$;
create or replace function public.communicali_escolher_codigo(p_codigo text) returns text language sql volatile security invoker
  set search_path = pg_catalog as $$ select communicali_private.convite_alterar(p_codigo)->>'codigo'; $$;
revoke all on function communicali_private.convite_config(), communicali_private.convite_alterar(text) from public, anon, authenticated;
grant execute on function communicali_private.convite_config(), communicali_private.convite_alterar(text) to authenticated;
revoke all on function public.communicali_convite_config(), public.communicali_convite_alterar(text), public.communicali_escolher_codigo(text) from public, anon, authenticated;
grant execute on function public.communicali_convite_config(), public.communicali_convite_alterar(text), public.communicali_escolher_codigo(text) to authenticated;
notify pgrst, 'reload schema';
