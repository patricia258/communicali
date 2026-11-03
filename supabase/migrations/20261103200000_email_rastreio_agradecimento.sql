-- ComuniCALI (03/11/2026): abertura e clique de cada e-mail enviado, e o e-mail de agradecimento para quem se inscreveu e não vai à 1ª edição.
alter table public.email_log add column if not exists aberto_em timestamptz, add column if not exists clicado_em timestamptz;
alter table public.email_log drop constraint email_log_tipo_check;
alter table public.email_log add constraint email_log_tipo_check check (tipo in ('recebido', 'confirmacao', 'espera', 'lembrete', 'convite', 'boasvindas', 'agradecimento'));
