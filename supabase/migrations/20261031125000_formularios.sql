create extension if not exists pg_cron;

create table if not exists public.companies (id uuid primary key default gen_random_uuid(), display_name text, status text);

alter table public.companies enable row level security;

create table if not exists public.runtime_secrets (secret_key text primary key, secret_value text);

alter table public.runtime_secrets enable row level security;

create table if not exists public.admins (email text primary key check (email = lower(email)));

insert into public.admins (email) values ('contato@calirh.com'), ('patricia@calirh.com') on conflict do nothing;

alter table public.admins enable row level security;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select exists (select 1 from public.admins a where a.email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- origem: 20261021240000_cali_forms
-- CALI Forms (21/10/2026, autorizado pela proprietária): formulários próprios da CALI, criados pela administradora,
-- respondidos por link público (uma pergunta por tela) e com respostas reunidas no app. Só acréscimo: duas tabelas
-- novas e três funções; nada existente muda. Quem responde não faz login: lê e envia só pelas funções públicas abaixo.

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 60),
  title text not null check (length(title) between 1 and 160),
  description text not null default '' check (length(description) <= 1200),
  thank_you text not null default '' check (length(thank_you) <= 600),
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  company_id uuid references public.companies(id) on delete set null,
  questions jsonb not null default '[]'::jsonb check (jsonb_typeof(questions) = 'array'),
  confirm_email boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.form_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  respondent_name text,
  respondent_email text,
  submitted_at timestamptz not null default now(),
  confirmation_sent_at timestamptz
);
create index if not exists form_responses_form_idx on public.form_responses (form_id, submitted_at desc);
create index if not exists form_responses_email_idx on public.form_responses (respondent_email, confirmation_sent_at);

alter table public.forms enable row level security;
alter table public.form_responses enable row level security;
create policy forms_admin_all on public.forms for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy form_responses_admin_read on public.form_responses for select to authenticated using (public.is_admin());
create policy form_responses_admin_delete on public.form_responses for delete to authenticated using (public.is_admin());
grant select, insert, update, delete on public.forms to authenticated;
grant select, delete on public.form_responses to authenticated;

-- Leitura pública: só formulário aberto ou encerrado (encerrado volta sem perguntas, para a tela avisar).
create or replace function public.cali_form_public(p_slug text)
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select jsonb_build_object('slug', f.slug, 'title', f.title, 'description', f.description, 'thank_you', f.thank_you,
         'status', f.status, 'confirm_email', f.confirm_email,
         'questions', case when f.status = 'open' then f.questions else '[]'::jsonb end)
    from public.forms f
   where f.slug = lower(btrim(coalesce(p_slug, ''))) and f.status in ('open', 'closed');
$$;
revoke all on function public.cali_form_public(text) from public;
grant execute on function public.cali_form_public(text) to anon, authenticated;

-- Envio público: valida obrigatórias e formatos, guarda só as perguntas do formulário e pede o e-mail de confirmação.
create or replace function public.cali_form_submit(p_slug text, p_answers jsonb)
returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'public', 'public' as $$
declare
  v_form public.forms%rowtype;
  q jsonb; v_val jsonb; v_kind text; v_txt text; v_item jsonb;
  v_clean jsonb := '{}'::jsonb; v_email text; v_name text; v_id uuid; v_hook text; v_recent integer;
begin
  select * into v_form from public.forms where slug = lower(btrim(coalesce(p_slug, '')));
  if not found or v_form.status <> 'open' then raise exception 'Este formulário não está recebendo respostas.'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' or length(p_answers::text) > 100000 then raise exception 'Respostas inválidas.'; end if;
  select count(*) into v_recent from public.form_responses where form_id = v_form.id and submitted_at > now() - interval '1 minute';
  if v_recent >= 30 then raise exception 'Muitas respostas ao mesmo tempo. Tente de novo em instantes.'; end if;

  for q in select value from jsonb_array_elements(v_form.questions) loop
    v_kind := q->>'kind';
    continue when v_kind = 'statement' or coalesce(q->>'id', '') = '';
    v_val := p_answers -> (q->>'id');
    if v_val is null or v_val = 'null'::jsonb
       or (jsonb_typeof(v_val) = 'string' and btrim(v_val #>> '{}') = '')
       or (jsonb_typeof(v_val) = 'array' and jsonb_array_length(v_val) = 0) then
      if coalesce((q->>'required')::boolean, false) then raise exception 'Responda a pergunta: %', q->>'label'; end if;
      continue;
    end if;
    if jsonb_typeof(v_val) = 'array' then
      if v_kind <> 'multi_choice' then raise exception 'Resposta inválida em: %', q->>'label'; end if;
      select coalesce(jsonb_agg(to_jsonb(left(btrim(x #>> '{}'), 300))), '[]'::jsonb) into v_item
        from (select x from jsonb_array_elements(v_val) x limit 50) s where jsonb_typeof(x) = 'string';
      v_val := v_item;
    elsif jsonb_typeof(v_val) = 'number' then
      if v_kind not in ('scale', 'number') then raise exception 'Resposta inválida em: %', q->>'label'; end if;
    elsif jsonb_typeof(v_val) = 'string' then
      v_txt := left(btrim(v_val #>> '{}'), 5000);
      if v_kind = 'email' then
        if v_txt !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Confira o e-mail em: %', q->>'label'; end if;
        v_txt := lower(v_txt);
        if v_email is null then v_email := v_txt; end if;
      elsif v_kind = 'name' and v_name is null then v_name := left(v_txt, 160);
      end if;
      v_val := to_jsonb(v_txt);
    else
      raise exception 'Resposta inválida em: %', q->>'label';
    end if;
    v_clean := v_clean || jsonb_build_object(q->>'id', v_val);
  end loop;

  insert into public.form_responses (form_id, answers, respondent_name, respondent_email)
  values (v_form.id, v_clean, v_name, v_email) returning id into v_id;

  -- Confirmação por e-mail: no máximo 5 por endereço por dia (evita usar o formulário para disparar e-mails).
  if v_form.confirm_email and v_email is not null then
    select count(*) into v_recent from public.form_responses
     where respondent_email = v_email and confirmation_sent_at > now() - interval '1 day';
    if v_recent < 5 then
      select secret_value into v_hook from public.runtime_secrets where secret_key = 'notification_email_hook';
      if v_hook is not null then
        perform net.http_post(
          url := 'https://kqtbfeeqbcllwvlkbrkq.supabase.co/functions/v1/cali-forms-confirmation',
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-workspace-hook', v_hook),
          body := jsonb_build_object('response_id', v_id));
      end if;
    end if;
  end if;
  return jsonb_build_object('ok', true, 'thank_you', v_form.thank_you, 'confirmation', v_form.confirm_email and v_email is not null);
end $$;
revoke all on function public.cali_form_submit(text, jsonb) from public;
grant execute on function public.cali_form_submit(text, jsonb) to anon, authenticated;

-- Contagem de respostas por formulário para a lista da administradora.
create or replace function public.admin_form_overview()
returns table(form_id uuid, responses bigint, last_response timestamptz)
language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select r.form_id, count(*), max(r.submitted_at) from public.form_responses r
   where public.is_admin() group by r.form_id;
$$;
revoke all on function public.admin_form_overview() from public, anon;
grant execute on function public.admin_form_overview() to authenticated;

-- 21/10 (mesmo dia, aplicado como cali_forms_category_audience): categoria exibida ao respondente e público interno
-- ("Uso da CALI" ou "Clientes"). A função pública passa a devolver a categoria.
alter table public.forms add column if not exists category text not null default 'Formulário' check (length(btrim(category)) between 1 and 40);
alter table public.forms add column if not exists audience text not null default 'cali' check (audience in ('cali', 'client'));
create or replace function public.cali_form_public(p_slug text)
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select jsonb_build_object('slug', f.slug, 'title', f.title, 'description', f.description, 'thank_you', f.thank_you,
         'status', f.status, 'confirm_email', f.confirm_email, 'category', f.category,
         'questions', case when f.status = 'open' then f.questions else '[]'::jsonb end)
    from public.forms f
   where f.slug = lower(btrim(coalesce(p_slug, ''))) and f.status in ('open', 'closed');
$$;


-- origem: 20261021250000_cali_forms_files_logic
-- CALI Forms (21/10, aplicada como cali_forms_files_and_logic): pergunta de arquivo e perguntas condicionais.
-- Bucket privado cali-forms (25 MB, imagens/PDF/Office/áudio/vídeo). Quem responde só envia para a pasta de um formulário
-- aberto que tenha pergunta de arquivo; só a administradora lê e apaga. A função pública passa a devolver o id do
-- formulário (pasta do envio) e o envio aceita o caminho percorrido (__visited): obrigatória só vale para o que foi visto.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cali-forms', 'cali-forms', false, 26214400, array[
  'image/jpeg','image/png','image/webp','image/heic','image/heif','image/gif','application/pdf',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain','video/mp4','video/quicktime','audio/mpeg','audio/mp4','audio/x-m4a'])
on conflict (id) do nothing;

create or replace function public.cali_form_accepts_uploads(p_folder text)
returns boolean language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select exists (select 1 from public.forms f
                  where f.id::text = p_folder and f.status = 'open' and f.questions @> '[{"kind":"file"}]'::jsonb);
$$;
revoke all on function public.cali_form_accepts_uploads(text) from public;
grant execute on function public.cali_form_accepts_uploads(text) to anon, authenticated;

create policy cali_forms_public_upload on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'cali-forms' and public.cali_form_accepts_uploads((storage.foldername(name))[1]));
create policy cali_forms_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'cali-forms' and public.is_admin());
create policy cali_forms_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'cali-forms' and public.is_admin());

create or replace function public.cali_form_public(p_slug text)
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select jsonb_build_object('id', f.id, 'slug', f.slug, 'title', f.title, 'description', f.description, 'thank_you', f.thank_you,
         'status', f.status, 'confirm_email', f.confirm_email, 'category', f.category,
         'questions', case when f.status = 'open' then f.questions else '[]'::jsonb end)
    from public.forms f
   where f.slug = lower(btrim(coalesce(p_slug, ''))) and f.status in ('open', 'closed');
$$;

create or replace function public.cali_form_submit(p_slug text, p_answers jsonb)
returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'public', 'public' as $$
declare
  v_form public.forms%rowtype;
  q jsonb; v_val jsonb; v_kind text; v_txt text; v_item jsonb; v_visited jsonb;
  v_clean jsonb := '{}'::jsonb; v_email text; v_name text; v_id uuid; v_hook text; v_recent integer;
begin
  select * into v_form from public.forms where slug = lower(btrim(coalesce(p_slug, '')));
  if not found or v_form.status <> 'open' then raise exception 'Este formulário não está recebendo respostas.'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' or length(p_answers::text) > 100000 then raise exception 'Respostas inválidas.'; end if;
  select count(*) into v_recent from public.form_responses where form_id = v_form.id and submitted_at > now() - interval '1 minute';
  if v_recent >= 30 then raise exception 'Muitas respostas ao mesmo tempo. Tente de novo em instantes.'; end if;
  -- Perguntas condicionais: a página manda o caminho percorrido; obrigatória só vale para o que a pessoa viu.
  v_visited := case when jsonb_typeof(p_answers -> '__visited') = 'array' then p_answers -> '__visited' else null end;

  for q in select value from jsonb_array_elements(v_form.questions) loop
    v_kind := q->>'kind';
    continue when v_kind = 'statement' or coalesce(q->>'id', '') = '';
    v_val := p_answers -> (q->>'id');
    if v_val is null or v_val = 'null'::jsonb
       or (jsonb_typeof(v_val) = 'string' and btrim(v_val #>> '{}') = '')
       or (jsonb_typeof(v_val) = 'array' and jsonb_array_length(v_val) = 0) then
      if coalesce((q->>'required')::boolean, false) and (v_visited is null or v_visited ? (q->>'id')) then
        raise exception 'Responda a pergunta: %', q->>'label';
      end if;
      continue;
    end if;
    if jsonb_typeof(v_val) = 'array' then
      if v_kind <> 'multi_choice' then raise exception 'Resposta inválida em: %', q->>'label'; end if;
      select coalesce(jsonb_agg(to_jsonb(left(btrim(x #>> '{}'), 300))), '[]'::jsonb) into v_item
        from (select x from jsonb_array_elements(v_val) x limit 50) s where jsonb_typeof(x) = 'string';
      v_val := v_item;
    elsif jsonb_typeof(v_val) = 'number' then
      if v_kind not in ('scale', 'number') then raise exception 'Resposta inválida em: %', q->>'label'; end if;
    elsif jsonb_typeof(v_val) = 'string' then
      v_txt := left(btrim(v_val #>> '{}'), 5000);
      if v_kind = 'file' then
        if v_txt not like v_form.id::text || '/%' or length(v_txt) > 400 then raise exception 'Arquivo inválido em: %', q->>'label'; end if;
      elsif v_kind = 'email' then
        if v_txt !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Confira o e-mail em: %', q->>'label'; end if;
        v_txt := lower(v_txt);
        if v_email is null then v_email := v_txt; end if;
      elsif v_kind = 'name' and v_name is null then v_name := left(v_txt, 160);
      end if;
      v_val := to_jsonb(v_txt);
    else
      raise exception 'Resposta inválida em: %', q->>'label';
    end if;
    v_clean := v_clean || jsonb_build_object(q->>'id', v_val);
  end loop;

  insert into public.form_responses (form_id, answers, respondent_name, respondent_email)
  values (v_form.id, v_clean, v_name, v_email) returning id into v_id;

  if v_form.confirm_email and v_email is not null then
    select count(*) into v_recent from public.form_responses
     where respondent_email = v_email and confirmation_sent_at > now() - interval '1 day';
    if v_recent < 5 then
      select secret_value into v_hook from public.runtime_secrets where secret_key = 'notification_email_hook';
      if v_hook is not null then
        perform net.http_post(
          url := 'https://kqtbfeeqbcllwvlkbrkq.supabase.co/functions/v1/cali-forms-confirmation',
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-workspace-hook', v_hook),
          body := jsonb_build_object('response_id', v_id));
      end if;
    end if;
  end if;
  return jsonb_build_object('ok', true, 'thank_you', v_form.thank_you, 'confirmation', v_form.confirm_email and v_email is not null);
end $$;


-- origem: 20261021260000_cali_forms_response_followup
-- CALI Forms (21/10, aplicada como cali_forms_response_followup): acompanhamento das respostas pela administradora —
-- "entrei em contato" (data) e nota interna. Quem responde nunca vê nem altera esses campos.
alter table public.form_responses add column if not exists contacted_at timestamptz;
alter table public.form_responses add column if not exists admin_note text check (admin_note is null or length(admin_note) <= 2000);
create policy form_responses_admin_update on public.form_responses for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant update (contacted_at, admin_note) on public.form_responses to authenticated;


-- origem: 20261022090000_cali_forms_admin_edit
-- CALI Forms (22/10, aplicada como cali_forms_admin_edit_responses): a administradora completa respostas recebidas por
-- fora (texto e anexos) sem refazer o formulário. A política de update de form_responses (só administradora) já existe.
grant update (answers, respondent_name, respondent_email) on public.form_responses to authenticated;
create policy cali_forms_admin_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'cali-forms' and public.is_admin());


-- origem: 20261023090000_cali_forms_pipeline
-- CALI Forms (23/10, aplicada como cali_forms_pipeline): triagem por formulário. Cada formulário pode ter etapas de
-- acompanhamento próprias (ex.: Novo, Em análise, Aprovado...); cada resposta guarda a etapa e o responsável.
-- Só a administradora lê e altera (políticas de form_responses já existentes).
alter table public.forms add column if not exists stages jsonb check (stages is null or jsonb_typeof(stages) = 'array');
alter table public.form_responses add column if not exists stage text check (stage is null or length(stage) <= 60);
alter table public.form_responses add column if not exists owner text check (owner is null or length(owner) <= 120);
grant update (stage, owner) on public.form_responses to authenticated;


-- origem: 20261023120000_cali_forms_submit_success
-- CALI Forms (23/10, aplicada como cali_forms_submit_label_success): texto do botão final e mensagem de sucesso
-- próprios por formulário (vazios = padrão "Enviar" e "Muito obrigado!"). A função pública passa a devolvê-los.
alter table public.forms add column if not exists submit_label text check (submit_label is null or length(submit_label) <= 60);
alter table public.forms add column if not exists success_text text check (success_text is null or length(success_text) <= 600);
create or replace function public.cali_form_public(p_slug text)
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select jsonb_build_object('id', f.id, 'slug', f.slug, 'title', f.title, 'description', f.description, 'thank_you', f.thank_you,
         'status', f.status, 'confirm_email', f.confirm_email, 'category', f.category,
         'submit_label', f.submit_label, 'success_text', f.success_text,
         'questions', case when f.status = 'open' then f.questions else '[]'::jsonb end)
    from public.forms f
   where f.slug = lower(btrim(coalesce(p_slug, ''))) and f.status in ('open', 'closed');
$$;


-- origem: 20261029180000_cali_forms_lixeira
-- CALI Forms: lixeira. Excluir um formulário ou respostas guarda antes uma cópia completa por 30 dias,
-- e a administradora restaura pela tela Formulários → Lixeira. Só acréscimo: tabelas, gatilhos e funções novas.
-- Motivo: em 29/10/2026 o "Coffee RH CWB" foi excluído sem querer e as respostas foram apagadas junto (cascade).

create table if not exists public.forms_trash (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('form', 'responses')),
  form_id uuid not null,
  form_title text not null,
  form jsonb,
  responses jsonb not null default '[]'::jsonb,
  deleted_by uuid default auth.uid(),
  deleted_at timestamptz not null default now(),
  restored_at timestamptz
);
create index if not exists forms_trash_deleted_at_idx on public.forms_trash (deleted_at desc);
alter table public.forms_trash enable row level security;
create policy forms_trash_admin_read on public.forms_trash for select to authenticated using (public.is_admin());
grant select on public.forms_trash to authenticated;

-- Formulário excluído: guarda o formulário e todas as respostas antes do cascade.
create or replace function public.forms_trash_form() returns trigger
language plpgsql security definer set search_path to 'public', 'public' as $$
begin
  insert into public.forms_trash (kind, form_id, form_title, form, responses)
  values ('form', old.id, old.title, to_jsonb(old),
          coalesce((select jsonb_agg(to_jsonb(r) order by r.submitted_at) from public.form_responses r where r.form_id = old.id), '[]'::jsonb));
  return old;
end $$;
drop trigger if exists forms_trash_form on public.forms;
create trigger forms_trash_form before delete on public.forms for each row execute function public.forms_trash_form();

-- Respostas excluídas pela tela (o formulário continua): uma entrada por exclusão, com as respostas apagadas.
create or replace function public.forms_trash_responses() returns trigger
language plpgsql security definer set search_path to 'public', 'public' as $$
begin
  insert into public.forms_trash (kind, form_id, form_title, responses)
  select 'responses', d.form_id, coalesce(f.title, 'Formulário'), jsonb_agg(to_jsonb(d) order by d.submitted_at)
  from deleted d left join public.forms f on f.id = d.form_id
  where f.id is not null -- respostas apagadas junto com o formulário já estão na entrada do formulário
  group by d.form_id, f.title;
  return null;
end $$;
drop trigger if exists forms_trash_responses on public.form_responses;
create trigger forms_trash_responses after delete on public.form_responses
  referencing old table as deleted for each statement execute function public.forms_trash_responses();

-- Restaurar: devolve o formulário (se for o caso) e as respostas com os mesmos ids. Só a administradora.
create or replace function public.cali_forms_trash_restore(p_id uuid) returns jsonb
language plpgsql security definer set search_path to 'public', 'public' as $$
declare v public.forms_trash%rowtype; v_count integer;
begin
  if not public.is_admin() then raise exception 'Sem permissão.'; end if;
  select * into v from public.forms_trash where id = p_id and restored_at is null for update;
  if not found then raise exception 'Item não encontrado na lixeira.'; end if;
  if v.kind = 'form' then
    if exists (select 1 from public.forms where id = v.form_id) then raise exception 'Este formulário já está na lista.'; end if;
    if exists (select 1 from public.forms where slug = v.form->>'slug') then raise exception 'Já existe um formulário com o endereço %. Troque o endereço dele antes de restaurar.', v.form->>'slug'; end if;
    insert into public.forms select * from jsonb_populate_record(null::public.forms, v.form);
  elsif not exists (select 1 from public.forms where id = v.form_id) then
    raise exception 'O formulário destas respostas foi excluído. Restaure o formulário primeiro.';
  end if;
  insert into public.form_responses
  select * from jsonb_populate_recordset(null::public.form_responses, v.responses)
  on conflict (id) do nothing;
  get diagnostics v_count = row_count;
  update public.forms_trash set restored_at = now() where id = p_id;
  return jsonb_build_object('ok', true, 'responses', v_count);
end $$;
revoke all on function public.cali_forms_trash_restore(uuid) from public, anon;
grant execute on function public.cali_forms_trash_restore(uuid) to authenticated;

-- Depois de 30 dias a cópia sai da lixeira.
create or replace function public.forms_trash_purge() returns void
language sql security definer set search_path to 'public' as $$
  delete from public.forms_trash where deleted_at < now() - interval '30 days' or restored_at < now() - interval '30 days';
$$;
revoke all on function public.forms_trash_purge() from public, anon, authenticated;
select cron.schedule('cali-forms-trash-purge', '20 6 * * *', $cron$select public.forms_trash_purge();$cron$);
