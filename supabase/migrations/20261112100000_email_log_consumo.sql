-- Lembrete de consumação mínima: novo tipo de e-mail registrado no log.
alter table public.email_log drop constraint if exists email_log_tipo_check;
alter table public.email_log add constraint email_log_tipo_check check (tipo = any (array['recebido','confirmacao','espera','lembrete','convite','boasvindas','agradecimento','card','pesquisa','consumo']));
