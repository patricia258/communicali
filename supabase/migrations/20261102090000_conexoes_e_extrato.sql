-- CommuniCALI (02/11/2026): conexões entre membros, avisos no espaço, extrato de pontos e parabéns por mudança de nível.

alter table public.members add column nivel_visto text;
update public.members set nivel_visto = categoria;

create table public.connections (
  de uuid not null references public.members(id) on delete cascade,
  para uuid not null references public.members(id) on delete cascade,
  email_enviado boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (de, para),
  check (de <> para)
);
alter table public.connections enable row level security;
create policy connections_admin on public.connections for select to authenticated using (public.is_admin());
grant select on public.connections to authenticated;
grant select, update on public.connections to service_role;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  tipo text not null check (tipo in ('conexao', 'nivel')),
  texto text not null,
  de uuid references public.members(id) on delete cascade,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy notifications_admin on public.notifications for select to authenticated using (public.is_admin());
grant select on public.notifications to authenticated;

create or replace function public.communicali_conectar(p_para uuid)
returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'public' as $$
declare m public.members%rowtype; v_novo boolean := false; v_volta boolean;
begin
  m := public.communicali_eu();
  if m.id is null or not exists (select 1 from public.checkins where member_id = m.id) then raise exception 'Entre novamente para conectar.'; end if;
  if not exists (select 1 from public.members where id = p_para and na_rede and status = 'ativo') or p_para = m.id then raise exception 'Esta pessoa não está disponível.'; end if;
  if (select count(*) from public.connections where de = m.id and created_at > now() - interval '1 hour') >= 30 then raise exception 'Aguarde um pouco antes de novas conexões.'; end if;
  insert into public.connections (de, para) values (m.id, p_para) on conflict do nothing;
  get diagnostics v_novo = row_count;
  v_volta := exists (select 1 from public.connections where de = p_para and para = m.id);
  if v_novo then
    insert into public.notifications (member_id, tipo, texto, de)
    values (p_para, 'conexao', split_part(coalesce(nullif(m.apelido, ''), m.nome), ' ', 1) || case when v_volta then ' se conectou de volta com você.' else ' quer se conectar com você.' end, m.id);
    update public.notifications set lida = true where member_id = m.id and de = p_para;
  end if;
  return jsonb_build_object('novo', v_novo, 'mutua', v_volta);
end;
$$;
revoke all on function public.communicali_conectar(uuid) from public, anon;
grant execute on function public.communicali_conectar(uuid) to authenticated;

create or replace function public.communicali_meu_extra()
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog', 'public' as $$
declare m public.members%rowtype;
begin
  m := public.communicali_eu();
  if m.id is null then return null; end if;
  return jsonb_build_object(
    'extrato', coalesce((select jsonb_agg(jsonb_build_object('acao', p.acao, 'pontos', p.pontos, 'motivo', p.motivo, 'titulo', e.titulo, 'data', coalesce(e.data_evento, (p.created_at at time zone 'America/Sao_Paulo')::date)) order by coalesce(e.data_evento, (p.created_at at time zone 'America/Sao_Paulo')::date) desc, p.pontos desc)
      from public.point_events p left join public.editions e on e.id = p.edition_id where p.member_id = m.id), '[]'::jsonb),
    'avisos', coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'tipo', n.tipo, 'texto', n.texto, 'de', n.de, 'foto_url', d.foto_url,
        'pode_voltar', n.de is not null and not exists (select 1 from public.connections c where c.de = m.id and c.para = n.de)) order by n.created_at desc)
      from public.notifications n left join public.members d on d.id = n.de where n.member_id = m.id and not n.lida), '[]'::jsonb),
    'conexoes', (select count(*) from public.connections a join public.connections b on a.de = b.para and a.para = b.de where a.de = m.id),
    'nivel_novo', case when m.categoria in ('conector', 'embaixador') and m.nivel_visto is distinct from m.categoria then m.categoria end);
end;
$$;
revoke all on function public.communicali_meu_extra() from public, anon;
grant execute on function public.communicali_meu_extra() to authenticated;

create or replace function public.communicali_nivel_visto()
returns void language sql volatile security definer set search_path to 'pg_catalog', 'public' as $$
  update public.members set nivel_visto = categoria where id = (public.communicali_eu()).id;
$$;
revoke all on function public.communicali_nivel_visto() from public, anon;
grant execute on function public.communicali_nivel_visto() to authenticated;

create or replace function public.communicali_aviso_lido(p_id uuid)
returns void language sql volatile security definer set search_path to 'pg_catalog', 'public' as $$
  update public.notifications set lida = true where id = p_id and member_id = (public.communicali_eu()).id;
$$;
revoke all on function public.communicali_aviso_lido(uuid) from public, anon;
grant execute on function public.communicali_aviso_lido(uuid) to authenticated;

-- Quem sobe de nível recebe um aviso no próprio espaço.
create or replace function public.communicali_aviso_nivel() returns trigger
language plpgsql set search_path to 'pg_catalog', 'public' as $$
begin
  if new.categoria in ('conector', 'embaixador') and new.categoria is distinct from old.categoria then
    insert into public.notifications (member_id, tipo, texto) values (new.id, 'nivel', 'Parabéns! Você agora é ' || initcap(new.categoria) || '.');
  end if;
  return new;
end;
$$;
create trigger members_aviso_nivel after update of categoria on public.members for each row execute function public.communicali_aviso_nivel();

create or replace function public.communicali_rede()
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog', 'public' as $$
declare m public.members%rowtype; v_contatos boolean;
begin
  m := public.communicali_eu();
  if m.id is null or not exists (select 1 from public.checkins where member_id = m.id) then raise exception 'A Rede abre depois do primeiro encontro presencial.'; end if;
  v_contatos := m.categoria in ('fundadora', 'conector', 'embaixador', 'organizador');
  return jsonb_build_object(
    'eu', m.id,
    'pode_ver_contatos', v_contatos,
    'pessoas', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'foto_url', p.foto_url, 'categoria', p.categoria, 'cidade_uf', p.cidade_uf, 'empresa', p.empresa, 'cargo', p.cargo, 'temas', to_jsonb(p.temas), 'interesses', to_jsonb(p.interesses), 'presta_servicos', p.presta_servicos,
          'eu_conectei', exists (select 1 from public.connections c where c.de = m.id and c.para = p.id), 'me_conectou', exists (select 1 from public.connections c where c.de = p.id and c.para = m.id))
        || case when v_contatos then jsonb_build_object('whatsapp', p.whatsapp, 'email', p.email, 'instagram', p.instagram, 'linkedin', p.linkedin) else '{}'::jsonb end order by p.nome)
      from public.members p where p.na_rede and p.status = 'ativo' and exists (select 1 from public.checkins c where c.member_id = p.id)), '[]'::jsonb),
    'parceiros', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'nome', x.nome, 'logo_url', x.logo_url, 'site_url', x.site_url) order by x.ordem, x.nome) from public.partners x where x.ativo), '[]'::jsonb));
end;
$$;
revoke all on function public.communicali_rede() from public, anon;
grant execute on function public.communicali_rede() to authenticated;
