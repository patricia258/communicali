-- Somente painel administrativo. Preparada; não aplicada em produção nesta tarefa.
begin;
create table public.event_costs (
 id uuid primary key default gen_random_uuid(),
 edition_id uuid not null references public.editions(id) on delete restrict,
 categoria text not null check(categoria in ('staff','fornecedor','parceiro')),
 titulo text not null check(length(btrim(titulo)) between 1 and 250),
 origem_tabela text not null default 'manual' check(origem_tabela in ('manual','staff','fornecedores','partners')),
 origem_id uuid,
 recebedor jsonb not null,
 itens jsonb not null,
 parcelas jsonb not null,
 documento text not null default 'a_definir' check(documento in ('nf','recibo','a_definir','nao_exige')),
 observacoes text not null default '',
 conhecido_centavos bigint not null default 0,
 total_centavos bigint,
 version integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index event_costs_edicao on public.event_costs(edition_id,categoria);
create function public.validar_custo_evento() returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
declare item jsonb; p jsonb; conhecido numeric:=0; faltam boolean:=false; soma_bp integer:=0; total numeric; base numeric; sobra integer; plano jsonb; pago numeric; calculo numeric;
begin
 if jsonb_typeof(new.recebedor) is distinct from 'object' or coalesce(new.recebedor->>'pessoa','') not in ('PF','PJ','a_definir') or length(btrim(coalesce(new.recebedor->>'nome','')))=0 then raise exception 'Informe o recebedor e o tipo de pessoa.'; end if;
 if jsonb_typeof(new.itens) is distinct from 'array' or jsonb_array_length(new.itens) not between 1 and 100 then raise exception 'Informe de 1 a 100 itens.'; end if;
 for item in select value from jsonb_array_elements(new.itens) loop
  if length(btrim(coalesce(item->>'descricao','')))=0 or coalesce(item->>'quantidade_mil','') !~ '^[0-9]+$' or (item->>'quantidade_mil')::numeric not between 1 and 1000000000 then raise exception 'Quantidade ou descrição inválida.'; end if;
  if item->>'unitario_centavos' is null then faltam:=true;
  else
   if (item->>'unitario_centavos') !~ '^[0-9]+$' or (item->>'unitario_centavos')::numeric not between 0 and 10000000000 then raise exception 'Valor unitário inválido.'; end if;
   conhecido:=conhecido+floor(((item->>'quantidade_mil')::numeric*(item->>'unitario_centavos')::numeric+500)/1000);
  end if;
 end loop;
 if conhecido>1000000000000 then raise exception 'Total acima do limite.'; end if;
 new.conhecido_centavos:=conhecido; total:=case when faltam then null else conhecido end; new.total_centavos:=total;
 if jsonb_typeof(new.parcelas) is distinct from 'array' or jsonb_array_length(new.parcelas) not between 1 and 24 then raise exception 'Informe de 1 a 24 parcelas.'; end if;
 for p in select value from jsonb_array_elements(new.parcelas) loop
  if length(btrim(coalesce(p->>'descricao','')))=0 then raise exception 'Descreva a parcela.'; end if;
  if coalesce(p->>'percentual_bp','') !~ '^[0-9]+$' or (p->>'percentual_bp')::numeric not between 1 and 10000 then raise exception 'Percentual inválido.'; end if;
  soma_bp:=soma_bp+(p->>'percentual_bp')::integer;
 end loop;
 if soma_bp<>10000 then raise exception 'As parcelas precisam somar 100 por cento.'; end if;
 -- Arredondamento exato e distribuição de centavos pelos maiores restos.
 calculo:=conhecido;
 if calculo is not null then
  select sum(floor(calculo*(value->>'percentual_bp')::numeric/10000)) into base from jsonb_array_elements(new.parcelas);
  sobra:=(calculo-base)::integer;
 end if;
 with partes as (
  select value,ordinality as n, floor(calculo*(value->>'percentual_bp')::numeric/10000) as v,
   row_number() over(order by mod(calculo*(value->>'percentual_bp')::numeric,10000) desc,ordinality) as prioridade
  from jsonb_array_elements(new.parcelas) with ordinality
 ) select jsonb_agg(value || jsonb_build_object('valor_centavos',case when total is null then null else v+case when prioridade<=sobra then 1 else 0 end end, 'limite_conhecido_centavos', v+case when prioridade<=sobra then 1 else 0 end) order by n) into plano from partes;
 for p in select value from jsonb_array_elements(plano) loop
  if coalesce(p->>'pago_centavos','') !~ '^[0-9]+$' then raise exception 'Pagamento inválido.'; end if;
  pago:=(p->>'pago_centavos')::numeric;
  if pago<0 or pago>1000000000000 or (pago>0 and (pago>(p->>'limite_conhecido_centavos')::numeric or nullif(p->>'pago_em','') is null)) then raise exception 'Pagamento exige data e valor dentro da parte já informada da parcela.'; end if;
  if nullif(p->>'pago_em','') is not null then if p->>'pago_em' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Data de pagamento inválida.'; end if; perform (p->>'pago_em')::date; end if;
  if nullif(p->>'vencimento','') is not null then if p->>'vencimento' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Vencimento inválido.'; end if; perform (p->>'vencimento')::date; end if;
 end loop;
 new.parcelas:=plano; new.updated_at:=now();
 if tg_op='UPDATE' then new.version:=old.version+1; else new.version:=1; end if;
 return new;
end $$;
revoke all on function public.validar_custo_evento() from public;
create trigger validar_custo_evento before insert or update on public.event_costs for each row execute function public.validar_custo_evento();
create table public.event_cost_documents (
 id uuid primary key default gen_random_uuid(),
 cost_id uuid not null references public.event_costs(id) on delete restrict,
 tipo text not null check(tipo in ('nf','recibo','comprovante','outro')),
 nome text not null,
 storage_path text not null unique,
 created_at timestamptz not null default now(),
 check(storage_path like cost_id::text || '/%')
);
alter table public.event_costs enable row level security;
alter table public.event_cost_documents enable row level security;
create policy costs_admin on public.event_costs for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy cost_documents_admin on public.event_cost_documents for all to authenticated using(public.is_admin()) with check(public.is_admin());
revoke all on public.event_costs,public.event_cost_documents from anon,authenticated;
grant select,insert,update on public.event_costs to authenticated;
grant select,insert on public.event_cost_documents to authenticated;
grant all on public.event_costs,public.event_cost_documents to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('event-cost-documents','event-cost-documents',false,10485760,array['application/pdf','application/xml','text/xml','image/jpeg','image/png'])
 on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy cost_objects_admin on storage.objects for all to authenticated
 using(bucket_id='event-cost-documents' and public.is_admin()) with check(bucket_id='event-cost-documents' and public.is_admin());
commit;
