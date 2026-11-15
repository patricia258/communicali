-- Correção pedida pela Patrícia em 15/11/2026: quem foi à edição inaugural como "membro" é Visitante, não Membro.
-- Conector, Embaixador e Fundadora continuam como estavam (legado).
update public.members set adesao_status = null, adesao_origem = null, estagio_entrada = 'visitante'
where categoria = 'membro' and adesao_origem = 'legado';
