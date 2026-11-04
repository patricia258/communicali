-- ComuniCALI (03/11/2026): decisão de Patrícia (v23): "pontos" passa a se chamar "milhas" nos textos públicos. Cálculo e histórico não mudam.
update public.site_settings set
  privacidade_texto = replace(replace(replace(privacidade_texto, 'presenças, pontos, categoria', 'presenças, milhas, categoria'), 'registrar presenças, pontos, missões', 'registrar presenças, milhas, missões'), 'Pontos, categoria e crachá deixam de valer', 'Milhas, categoria e crachá deixam de valer'),
  regras_texto = replace(replace(replace(regras_texto, 'presenças, pontos, categoria', 'presenças, milhas, categoria'), 'registrar presenças, pontos, missões', 'registrar presenças, milhas, missões'), 'Pontos, categoria e crachá deixam de valer', 'Milhas, categoria e crachá deixam de valer');
