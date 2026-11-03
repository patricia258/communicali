-- DIAGNÓSTICO SOMENTE LEITURA. Executar SOMENTE em cyyrrtekbkltdiatixhp após conferir
-- o projeto no painel/conexão. Não é migração. Não salvar saídas com dados pessoais,
-- políticas integrais ou eventuais segredos em repositórios públicos.
begin transaction read only;

select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name in
 ('members','registrations','editions','checkins','point_events','partners','site_settings',
  'communicali_partner_profiles','communicali_feedback')
order by table_name, ordinal_position;

select tablename, policyname, roles, cmd, qual, with_check
from pg_catalog.pg_policies where schemaname = 'public' and tablename in
 ('members','registrations','editions','checkins','point_events','partners','site_settings',
  'communicali_partner_profiles','communicali_feedback') order by tablename, policyname;

select n.nspname as esquema, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid) as argumentos,
 p.prosecdef as security_definer, p.proconfig as configuracao,
 pg_catalog.pg_get_functiondef(p.oid) as definicao
from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('public','communicali_private') and p.prokind='f' and p.proname in
 ('communicali_eu','communicali_novo_membro','communicali_checkin_inscrito',
  'communicali_registrar_presenca','communicali_checkin_novo','communicali_checkin_membro',
  'communicali_inscrever','communicali_inscricao','communicali_situacao_email',
  'communicali_indicar_visitante','communicali_rede','communicali_perfil','communicali_ficha',
  'communicali_salvar_perfil','communicali_rede_perfis','communicali_parceiros_membros',
  'communicali_escolher_codigo','communicali_feedback_listar','communicali_feedback_enviar')
order by n.nspname,p.proname;

select n.nspname as esquema,c.relname as tabela,t.tgname,pg_catalog.pg_get_triggerdef(t.oid) as definicao
from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid=t.tgrelid
join pg_catalog.pg_namespace n on n.oid=c.relnamespace
where not t.tgisinternal and n.nspname='public' and c.relname in
 ('members','registrations','editions','checkins','point_events') order by c.relname,t.tgname;

select c.relname as tabela,con.conname,pg_catalog.pg_get_constraintdef(con.oid) as definicao
from pg_catalog.pg_constraint con join pg_catalog.pg_class c on c.oid=con.conrelid
join pg_catalog.pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('members','registrations','checkins','point_events')
order by c.relname,con.conname;

-- Textos efetivamente publicados: preservar cópia privada com data/versão antes de comparar.
-- Se colunas não existirem, parar e adaptar após a inspeção acima; não criar por suposição.
select regras_texto,privacidade_texto from public.site_settings;
commit;
