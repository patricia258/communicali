-- "Continue com a gente": a pessoa informa o e-mail da inscrição e o sistema reconhece nome, tipo (convidado ou visitante / membro) e quem convidou.
create or replace function public.communicali_continuar_dados(p_slug text, p_email text) returns jsonb
language plpgsql stable security definer set search_path to 'pg_catalog','public' as $$
declare v_ed uuid; v_email text := lower(btrim(coalesce(p_email, ''))); r record;
begin
  select id into v_ed from public.editions where slug = lower(btrim(coalesce(p_slug, '')));
  if v_ed is null or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then return jsonb_build_object('encontrado', false); end if;
  select x.nome, x.categoria, x.convidado_de into r from (
    select btrim(coalesce(fr.respondent_name, '') || case when nullif(btrim(fr.answers ->> 'sobrenome'), '') is not null and position(lower(btrim(fr.answers ->> 'sobrenome')) in lower(coalesce(fr.respondent_name, ''))) = 0 then ' ' || btrim(fr.answers ->> 'sobrenome') else '' end) nome,
      coalesce(fr.categoria, 'Participante') categoria, fr.convidado_de convidado_de, public.communicali_situacao_etapa(fr.stage) situacao
      from public.form_responses fr join public.forms f on f.id = fr.form_id join public.editions e on e.form_inscricao = f.slug
     where e.id = v_ed and lower(btrim(fr.respondent_email)) = v_email
    union all
    select r2.nome, coalesce(r2.categoria, case when r2.indicado_por is null then 'Participante' else 'Convidado' end),
      coalesce(r2.convidado_de, (select m.nome from public.members m where m.id = r2.indicado_por)), public.communicali_situacao_registro(r2.status, r2.situacao)
      from public.registrations r2 where r2.edition_id = v_ed and lower(btrim(r2.email)) = v_email
    union all
    select g.nome, coalesce(g.categoria, 'Convidado'), coalesce(g.convidado_de, (select m.nome from public.members m where m.id = g.member_id)), public.communicali_situacao_convidado(g.status, g.situacao)
      from public.guests g where g.edition_id = v_ed and lower(btrim(g.email)) = v_email
    union all
    select k.nome, k.categoria, k.convidado_de, k.situacao
      from public.edition_kids k where k.edition_id = v_ed and lower(nullif(btrim(k.email), '')) = v_email
  ) x where x.situacao = 'confirmado' limit 1;
  if r.nome is null then return jsonb_build_object('encontrado', false); end if;
  return jsonb_build_object('encontrado', true, 'nome', r.nome, 'tipo', case when r.categoria = 'Convidado' then 'convidado' else 'visitante' end, 'convidado_de', nullif(btrim(coalesce(r.convidado_de, '')), ''));
end $$;
grant execute on function public.communicali_continuar_dados(text, text) to anon, authenticated;

-- Pesquisa anônima: tela final com destaques e botão para a página "Continue com a gente".
update public.forms set success_text = $t$Obrigada pela sua opinião!
**Ela é anônima e já está com a gente.**
*Quer saber dos próximos passos, dos próximos encontros e da comunidade? E como continuar participando?*
Clique no link abaixo.
[Quero saber os próximos passos](/continuar)$t$ where slug = 'pesquisa-1a-edicao';

-- Formulário que recebe o envio da página: só o que não dá para puxar da inscrição.
update public.forms set title = 'Continue com a gente!', questions = $q$[
 {"id":"nome","kind":"short_text","label":"Nome","required":true},
 {"id":"email","kind":"email","label":"E-mail da inscrição","required":true},
 {"id":"tipo","kind":"single_choice","label":"Como participou","options":["Como convidado","Como visitante / membro"],"required":true},
 {"id":"convidou","kind":"short_text","label":"Quem convidou"},
 {"id":"email_novo","kind":"email","label":"Outro e-mail para as novidades"}
]$q$::jsonb where slug = 'continuar-com-a-comunidade';
