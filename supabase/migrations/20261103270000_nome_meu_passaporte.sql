-- ComuniCALI (03/11/2026): a área do membro passa a se chamar "Meu passaporte" (decisão de Patrícia). Só troca o nome nos textos; o endereço /meu-espaco continua.
update public.site_settings set
  privacidade_texto = replace(replace(replace(privacidade_texto, 'espaço do membro', 'Meu passaporte'), 'Espaço do membro', 'Meu passaporte'), 'Meu espaço', 'Meu passaporte'),
  regras_texto = replace(replace(replace(regras_texto, 'espaço do membro', 'Meu passaporte'), 'Espaço do membro', 'Meu passaporte'), 'Meu espaço', 'Meu passaporte');
