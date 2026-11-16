-- Preparada para revisão conjunta, sem aplicar no banco remoto.
begin;
alter table public.event_costs add column feriados_adicionais date[] not null default '{}';
create function public.custo_proximo_dia_util(apos date, adicionais date[] default '{}') returns date
language plpgsql immutable security invoker set search_path=pg_catalog,public as $$
declare alvo date:=apos; ano int; a int; b int; c int; d int; e int; f int; g int; h int; i int; k int; l int; m int; mes int; dia int; pascoa date;
begin
 if apos is null then return null; end if;
 for passo in 1..370 loop
  alvo:=alvo+1;ano:=extract(year from alvo)::int;
  a:=ano%19;b:=ano/100;c:=ano%100;d:=b/4;e:=b%4;f:=(b+8)/25;g:=(b-f+1)/3;h:=(19*a+b-d-g+15)%30;i:=c/4;k:=c%4;l:=(32+2*e+2*i-h-k)%7;m:=(a+11*h+22*l)/451;mes:=(h+l-7*m+114)/31;dia:=(h+l-7*m+114)%31+1;pascoa:=make_date(ano,mes,dia);
  if extract(isodow from alvo)<6 and to_char(alvo,'MM-DD') not in ('01-01','04-21','05-01','09-07','10-12','11-02','11-15','11-20','12-25') and alvo<>pascoa-2 and not(alvo=any(adicionais)) then return alvo; end if;
 end loop;
 raise exception 'Confira o calendário de feriados.';
end $$;
revoke all on function public.custo_proximo_dia_util(date,date[]) from public;
grant execute on function public.custo_proximo_dia_util(date,date[]) to authenticated,service_role;
create function public.agendar_custo_evento() returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
declare p jsonb; anterior jsonb; resultado jsonb:='[]'; data_evento date; modo text; identificador text; vistos text[]:='{}';
begin
 if cardinality(new.feriados_adicionais)>100 or array_position(new.feriados_adicionais,null) is not null then raise exception 'Calendário inválido.'; end if;
 select e.data_evento into data_evento from public.editions e where e.id=new.edition_id;
 for p in select value from jsonb_array_elements(new.parcelas) loop
  identificador:=coalesce(p->>'id',gen_random_uuid()::text);
  perform identificador::uuid;
  if identificador=any(vistos) then raise exception 'Identificador de parcela duplicado.'; end if;vistos:=array_append(vistos,identificador);
  modo:=coalesce(p->>'vencimento_modo',case when concat(p->>'regra',' ',p->>'descricao') ~* 'primeiro dia útil' then 'pos_evento' else 'manual' end);
  if modo not in ('manual','pos_evento') then raise exception 'Regra de vencimento inválida.'; end if;
  p:=p||jsonb_build_object('id',identificador,'vencimento_modo',modo);
  if modo='pos_evento' then p:=p||jsonb_build_object('vencimento',public.custo_proximo_dia_util(data_evento,new.feriados_adicionais)); end if;
  anterior:=null;
  if tg_op='UPDATE' then select value into anterior from jsonb_array_elements(old.parcelas) where value->>'id'=identificador; end if;
  if coalesce((p->>'pago_centavos')::numeric,0)>0 then
   p:=p||jsonb_build_object('pago_registrado_em',case when anterior->>'pago_centavos'=p->>'pago_centavos' and anterior->>'pago_em' is not distinct from p->>'pago_em' and anterior->>'pago_registrado_em' is not null then anterior->>'pago_registrado_em' else to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') end);
  else p:=p||jsonb_build_object('pago_registrado_em',null); end if;
  resultado:=resultado||jsonb_build_array(p);
 end loop;
 new.parcelas:=resultado;return new;
end $$;
revoke all on function public.agendar_custo_evento() from public;
create trigger a_agendar_custo_evento before insert or update on public.event_costs for each row execute function public.agendar_custo_evento();
-- Busca apenas pagamentos pendentes vencendo hoje (ou anteriores, para recuperar uma execução perdida).
create function public.custos_avisos_pendentes(hoje date) returns table(cost_id uuid,parcela_id text,vencimento date,titulo text,encontro text,saldo_centavos bigint)
language sql stable security invoker set search_path=pg_catalog,public as $$
 with parcelas as (
 select c.id,p->>'id' parcela_id,c.titulo,e.titulo encontro,
 case when p->>'vencimento_modo'='pos_evento' then public.custo_proximo_dia_util(e.data_evento,c.feriados_adicionais) else nullif(p->>'vencimento','')::date end vencimento,
 greatest(0,(p->>'valor_centavos')::bigint-coalesce((p->>'pago_centavos')::bigint,0)) saldo
 from public.event_costs c join public.editions e on e.id=c.edition_id cross join lateral jsonb_array_elements(c.parcelas) p
 where p->>'valor_centavos' is not null
 )select id,parcela_id,vencimento,titulo,encontro,saldo from parcelas where vencimento<=hoje and saldo>0;
$$;
revoke all on function public.custos_avisos_pendentes(date) from public,anon,authenticated;
grant execute on function public.custos_avisos_pendentes(date) to service_role;
create table public.event_cost_reminders(
 chave text primary key,
 cost_id uuid not null references public.event_costs(id) on delete restrict,
 parcela_id text not null,
 vencimento date not null,
 email text not null,
 reservado_em timestamptz,
 enviado_em timestamptz,
 resend_id text,
 erro text,
 created_at timestamptz not null default now()
);
alter table public.event_cost_reminders enable row level security;
create policy cost_reminders_admin_read on public.event_cost_reminders for select to authenticated using(public.is_admin());
revoke all on public.event_cost_reminders from anon,authenticated;
grant select on public.event_cost_reminders to authenticated;
grant all on public.event_cost_reminders to service_role;
-- Normaliza registros anteriores: IDs estáveis, calendário e horário de registro.
update public.event_costs set parcelas=parcelas;
commit;
