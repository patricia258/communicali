-- Valor mostrado de cada edição (texto livre). 1ª edição foi gratuita.
alter table public.editions add column if not exists valor_texto text;
update public.editions set valor_texto = 'Gratuito' where slug = 'fundadora' and valor_texto is null;
