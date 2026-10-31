-- CommuniCALI (31/10/2026): vitrine do site e administradora. Fotos, parceiros e contador são públicos para leitura;
-- gravação só para quem está em public.admins.

alter table public.editions
  add column capa_url text,
  add column resumo text,
  add column fotos_url text,
  add column inscricao_url text,
  add column endereco text;
update public.editions set endereco = 'Rua Tibagi, 294, Centro' where slug = 'fundadora';

create table public.edition_photos (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions(id) on delete restrict,
  url text not null,
  legenda text,
  ordem integer not null default 0,
  no_carrossel boolean not null default true,
  created_at timestamptz not null default now()
);

-- Só entra aqui parceiro confirmado: prospecção nunca aparece no site.
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  logo_url text,
  site_url text,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.site_settings (
  id boolean primary key default true check (id),
  membros_contador integer check (membros_contador >= 0),
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id) values (true);

alter table public.edition_photos enable row level security;
alter table public.partners enable row level security;
alter table public.site_settings enable row level security;

create policy editions_public_read on public.editions for select to anon, authenticated using (publica or public.is_admin());
create policy editions_admin on public.editions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy photos_public_read on public.edition_photos for select to anon, authenticated using (true);
create policy photos_admin on public.edition_photos for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy partners_public_read on public.partners for select to anon, authenticated using (ativo or public.is_admin());
create policy partners_admin on public.partners for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy settings_public_read on public.site_settings for select to anon, authenticated using (true);
create policy settings_admin on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy members_admin_read on public.members for select to authenticated using (public.is_admin());
create policy members_admin_write on public.members for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy checkins_admin_read on public.checkins for select to authenticated using (public.is_admin());
create policy checkins_admin_delete on public.checkins for delete to authenticated using (public.is_admin());
create policy points_admin_read on public.point_events for select to authenticated using (public.is_admin());
create policy points_admin_write on public.point_events for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- A leitura pública das edições não precisa dos horários de check-in nem de dados pessoais.
grant select on public.editions, public.edition_photos, public.partners, public.site_settings to anon, authenticated;
grant insert, update, delete on public.editions, public.edition_photos, public.partners, public.site_settings to authenticated;
grant select, update on public.members to authenticated;
grant select, delete on public.checkins to authenticated;
grant select, insert, update, delete on public.point_events to authenticated;

-- Contador: o número definido na área administrativa ou, sem ele, quem tem presença registrada em edição pública.
create or replace function public.communicali_membros() returns integer language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select coalesce((select membros_contador from public.site_settings),
    (select count(distinct c.member_id)::integer from public.checkins c join public.editions e on e.id = c.edition_id where e.publica));
$$;
grant execute on function public.communicali_membros() to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site', 'site', true, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);
create policy site_public_read on storage.objects for select to anon, authenticated using (bucket_id = 'site');
create policy site_admin_write on storage.objects for insert to authenticated with check (bucket_id = 'site' and public.is_admin());
create policy site_admin_update on storage.objects for update to authenticated using (bucket_id = 'site' and public.is_admin());
create policy site_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'site' and public.is_admin());

create or replace function public.admin_form_overview() returns table (form_id uuid, responses bigint, last_response timestamptz)
language sql stable security definer set search_path to 'pg_catalog', 'public' as $$
  select r.form_id, count(*), max(r.submitted_at) from public.form_responses r where public.is_admin() group by r.form_id;
$$;
grant execute on function public.admin_form_overview() to authenticated;
