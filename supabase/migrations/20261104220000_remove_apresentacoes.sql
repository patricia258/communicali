-- O modo apresentação saiu (a apresentação fica no Canva). Remove tabela e funções criadas para ele.
drop function if exists public.communicali_ao_vivo_atual();
drop function if exists public.communicali_ao_vivo(uuid);
drop table if exists public.apresentacoes;
