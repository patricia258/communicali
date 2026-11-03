-- ComuniCALI (03/11/2026): e-mail de boas-vindas no lugar do convite de agenda; grafia oficial ComuniCALI, com um M, nos textos guardados no banco.
alter table public.email_log drop constraint email_log_tipo_check;
alter table public.email_log add constraint email_log_tipo_check check (tipo in ('recebido', 'confirmacao', 'espera', 'lembrete', 'convite', 'boasvindas'));
update public.forms set title = replace(title, 'CommuniCALI', 'ComuniCALI'), description = replace(description, 'CommuniCALI', 'ComuniCALI'), thank_you = replace(thank_you, 'CommuniCALI', 'ComuniCALI'), success_text = replace(success_text, 'CommuniCALI', 'ComuniCALI'), questions = replace(questions::text, 'CommuniCALI', 'ComuniCALI')::jsonb, category = replace(category, 'CommuniCALI', 'ComuniCALI');
update public.site_settings set regras_texto = replace(regras_texto, 'CommuniCALI', 'ComuniCALI'), privacidade_texto = replace(privacidade_texto, 'CommuniCALI', 'ComuniCALI');
do $$
declare c record;
begin
  for c in select table_name, column_name from information_schema.columns
    where table_schema = 'public' and data_type = 'text' and table_name in ('editions', 'missions', 'partners')
  loop
    execute format('update public.%I set %I = replace(%I, %L, %L) where %I like %L', c.table_name, c.column_name, c.column_name, 'CommuniCALI', 'ComuniCALI', c.column_name, '%CommuniCALI%');
  end loop;
end $$;
