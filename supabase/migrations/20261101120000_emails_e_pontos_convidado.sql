-- CommuniCALI (01/11/2026): registro de e-mails por edição, lembrete automático ligável e convidado valendo 5 pontos.

alter table public.editions add column lembrete_ativo boolean not null default true;

create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions(id) on delete cascade,
  email text not null check (email = lower(email)),
  tipo text not null check (tipo in ('confirmacao', 'espera', 'lembrete', 'convite')),
  situacao text not null default 'enviando' check (situacao in ('enviando', 'enviado', 'erro')),
  resend_id text,
  erro text,
  created_at timestamptz not null default now(),
  unique (edition_id, email, tipo)
);
alter table public.email_log enable row level security;
create policy email_log_admin on public.email_log for select to authenticated using (public.is_admin());
grant select on public.email_log to authenticated;
grant select, insert, update, delete on public.email_log to service_role;

-- Quem deve receber os e-mails da edição: inscrições do site, formulário da edição e convidados aceitos, uma linha por e-mail.
create or replace function public.communicali_destinatarios(p_edition uuid)
returns table (email text, nome text, acionado boolean) language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select distinct on (t.email) t.email, t.nome, t.acionado from (
    select lower(r.email) as email, r.nome, true as acionado
      from public.registrations r where r.edition_id = p_edition and r.status = 'inscrito'
    union all
    select lower(btrim(fr.respondent_email)), fr.respondent_name, fr.contacted_at is not null
      from public.form_responses fr join public.forms f on f.id = fr.form_id join public.editions e on e.form_inscricao = f.slug
     where e.id = p_edition and fr.respondent_email like '%@%'
    union all
    select g.email, g.nome, true
      from public.guests g where g.edition_id = p_edition and g.status in ('inscrito', 'confirmado')
  ) t order by t.email, t.acionado desc;
$$;
revoke all on function public.communicali_destinatarios(uuid) from public, anon, authenticated;
grant execute on function public.communicali_destinatarios(uuid) to service_role;

create or replace function public.communicali_creditar_convidado(p_edition uuid, p_email text)
returns void language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare g public.guests%rowtype;
begin
  select * into g from public.guests where edition_id = p_edition and email = lower(p_email) and status in ('inscrito', 'confirmado', 'presente');
  if not found then return; end if;
  update public.guests set status = 'presente' where id = g.id and status <> 'presente';
  insert into public.point_events (member_id, edition_id, acao, pontos) values (g.member_id, p_edition, 'convidado:' || g.id::text, 5)
  on conflict (member_id, edition_id, acao) do nothing;
end;
$$;
revoke all on function public.communicali_creditar_convidado(uuid, text) from public, anon, authenticated;
