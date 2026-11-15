-- Regras v23: e-mail depois da presença (convite à adesão ou aviso de limite). As presenças já existentes ficam como avisadas, para ninguém receber e-mail antigo.
alter table public.checkins add column if not exists email_pos_em timestamptz;
update public.checkins set email_pos_em = now() where email_pos_em is null;
