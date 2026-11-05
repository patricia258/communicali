-- Card Eu vou!: além de quem compartilhou, registra quem gerou o card, quando e em quais formatos (feed, story),
-- e a aprovação do post pela organização. A retirada do mimo sai da tela: a recepção usa a lista impressa.
alter table public.compartilhamentos
  add column if not exists gerado_em timestamptz,
  add column if not exists formatos text[] not null default '{}',
  add column if not exists compartilhado_em timestamptz,
  add column if not exists conferido_em timestamptz;
update public.compartilhamentos set compartilhado_em = coalesce(compartilhado_em, created_at) where cardinality(redes) > 0;
