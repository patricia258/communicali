-- CommuniCALI (02/11/2026): open to work, currículo privado, recrutadores por região, relatos de impacto e trilha de decisões.

alter table public.members
  add column aberto_trabalho boolean not null default false,
  add column recrutador boolean not null default false,
  add column curriculo_path text;

alter table public.member_missions add column justificativa text, add column decidido_por text;
alter table public.recommendations add column justificativa text, add column decidido_por text;
alter table public.matches add column justificativa text, add column decidido_por text;

create table public.impactos (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  tipo text not null check (tipo in ('Conheci pessoas', 'Consegui uma entrevista', 'Consegui um emprego', 'Fechei uma parceria', 'Conquistei um cliente', 'Aprendi algo novo', 'Outro')),
  com_quem text,
  relato text not null check (length(relato) between 10 and 1500),
  created_at timestamptz not null default now()
);
alter table public.impactos enable row level security;
create policy impactos_admin on public.impactos for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, delete on public.impactos to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('curriculos', 'curriculos', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;
create policy curriculos_proprio_grava on storage.objects for insert to authenticated with check (bucket_id = 'curriculos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy curriculos_proprio_le on storage.objects for select to authenticated using (bucket_id = 'curriculos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy curriculos_proprio_apaga on storage.objects for delete to authenticated using (bucket_id = 'curriculos' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.communicali_salvar_mercado(p_aberto boolean, p_recrutador boolean, p_curriculo text)
returns void language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare m public.members%rowtype; v_path text := nullif(btrim(coalesce(p_curriculo, '')), '');
begin
  m := public.communicali_eu();
  if m.id is null then raise exception 'Entre novamente para salvar.'; end if;
  if v_path is not null and v_path not like auth.uid()::text || '/%' then raise exception 'Envie o currículo novamente.'; end if;
  update public.members set aberto_trabalho = coalesce(p_aberto, false), recrutador = coalesce(p_recrutador, false), curriculo_path = v_path, updated_at = now() where id = m.id;
  perform public.communicali_gerar_matches(m.id);
end;
$$;
revoke all on function public.communicali_salvar_mercado(boolean, boolean, text) from public, anon;
grant execute on function public.communicali_salvar_mercado(boolean, boolean, text) to authenticated;

create or replace function public.communicali_meu_mercado()
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select jsonb_build_object('aberto_trabalho', m.aberto_trabalho, 'recrutador', m.recrutador, 'curriculo_path', m.curriculo_path) from public.members m where m.id = (public.communicali_eu()).id;
$$;
revoke all on function public.communicali_meu_mercado() from public, anon;
grant execute on function public.communicali_meu_mercado() to authenticated;

create or replace function public.communicali_registrar_impacto(p_tipo text, p_com_quem text, p_relato text)
returns void language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare m public.members%rowtype;
begin
  m := public.communicali_eu();
  if m.id is null then raise exception 'Entre novamente para enviar.'; end if;
  if length(btrim(coalesce(p_relato, ''))) < 10 then raise exception 'Conte um pouco mais.'; end if;
  insert into public.impactos (member_id, tipo, com_quem, relato) values (m.id, p_tipo, nullif(left(btrim(coalesce(p_com_quem, '')), 160), ''), left(btrim(p_relato), 1500));
end;
$$;
revoke all on function public.communicali_registrar_impacto(text, text, text) from public, anon;
grant execute on function public.communicali_registrar_impacto(text, text, text) to authenticated;

create or replace function public.communicali_gerar_matches(p_member uuid)
returns void language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare m public.members%rowtype; f uuid; t text; v_novos integer := 0; v_linhas integer;
  v_cali constant text[] := array['Treinamento e desenvolvimento','Treinamento de liderança','Treinamento de atendimento','Treinamento de vendas','Desenvolvimento de líderes','Consultoria de RH','RH estratégico','Recrutamento e seleção','Cargos e salários','Remuneração e benefícios','Cultura e clima','Pesquisa de clima','Departamento pessoal','Onboarding e integração','Avaliação de desempenho','Palestras','Coaching e mentoria'];
begin
  select * into m from public.members where id = p_member;
  if m.id is null or m.status <> 'ativo' then return; end if;
  select id into f from public.members where categoria = 'fundadora' order by email limit 1;
  foreach t in array m.busca loop
    if f is not null and f <> m.id and t = any(v_cali) then
      insert into public.matches (a, b, motivo, cali) values (m.id, f, t, true) on conflict do nothing;
      get diagnostics v_linhas = row_count;
      v_novos := v_novos + v_linhas;
    end if;
    insert into public.matches (a, b, motivo)
      select m.id, p.id, t from public.members p
       where p.id <> m.id and p.id is distinct from f and p.status = 'ativo' and t = any(p.temas)
      on conflict do nothing;
  end loop;
  if m.aberto_trabalho and m.regiao is not null then
    insert into public.matches (a, b, motivo)
      select m.id, p.id, 'Open to work e recrutador na mesma região' from public.members p
       where p.id <> m.id and p.recrutador and p.status = 'ativo' and p.regiao = m.regiao on conflict do nothing;
  end if;
  if m.recrutador and m.regiao is not null then
    insert into public.matches (a, b, motivo)
      select p.id, m.id, 'Open to work e recrutador na mesma região' from public.members p
       where p.id <> m.id and p.aberto_trabalho and p.status = 'ativo' and p.regiao = m.regiao on conflict do nothing;
  end if;
  if v_novos > 0 and f is not null then
    insert into public.notifications (member_id, tipo, texto, de)
    values (f, 'match', split_part(m.nome, ' ', 1) || ' busca algo ligado aos serviços da CALI. Veja em Matches no painel.', m.id);
  end if;
end;
$$;
revoke all on function public.communicali_gerar_matches(uuid) from public, anon, authenticated;

create or replace function public.communicali_ficha(p public.members, p_contatos boolean, p_eu uuid)
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select jsonb_build_object('id', p.id, 'nome', p.nome, 'foto_url', p.foto_url, 'categoria', p.categoria, 'cidade_uf', p.cidade_uf, 'regiao', p.regiao, 'segmento', p.segmento, 'empresa', p.empresa, 'cargo', p.cargo, 'temas', to_jsonb(p.temas), 'interesses', to_jsonb(p.interesses), 'busca', to_jsonb(p.busca), 'presta_servicos', p.presta_servicos, 'aberto_trabalho', p.aberto_trabalho, 'recrutador', p.recrutador,
      'eu_conectei', exists (select 1 from public.connections c where c.de = p_eu and c.para = p.id), 'me_conectou', exists (select 1 from public.connections c where c.de = p.id and c.para = p_eu and not c.recusada))
    || case when p_contatos then jsonb_build_object('whatsapp', p.whatsapp, 'email', p.email, 'instagram', p.instagram, 'linkedin', p.linkedin) else '{}'::jsonb end;
$$;
revoke all on function public.communicali_ficha(public.members, boolean, uuid) from public, anon, authenticated;

update public.site_settings set privacidade_texto = replace(privacidade_texto,
  'Use apenas contatos profissionais ou públicos, ou dados que a pessoa tenha permitido compartilhar.',
  'Use apenas contatos profissionais ou públicos, ou dados que a pessoa tenha permitido compartilhar. Se você quiser, também guardamos sua disponibilidade no mercado de trabalho, se você recruta pessoas, o currículo que enviar e os relatos de como a comunidade ajudou você. O currículo fica em área privada, visível para você e para a organização, e a disponibilidade aparece na Rede.');
