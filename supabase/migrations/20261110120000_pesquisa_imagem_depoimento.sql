-- Pesquisa de satisfação: depoimento, nome para a citação, autorização de imagem e mensagem final.
update public.forms set
  description = replace(description, ' e você não precisa se identificar', ''),
  success_text = 'Obrigada por viver o primeiro encontro com a gente! Sua opinião já está com a gente e vai desenhar a próxima edição. Fique de olho no seu e-mail: em breve temos novidades da ComuniCALI. Até a próxima!',
  questions = (
    select jsonb_agg(q order by ord) from (
      select q, ord from jsonb_array_elements(questions) with ordinality as t(q, ord) where q->>'id' <> 'citar'
      union all select '{"id":"depoimento","kind":"long_text","label":"Deixe um depoimento sobre o encontro, para compartilharmos com a comunidade."}'::jsonb, 100
      union all select '{"id":"nome","kind":"short_text","label":"Qual é o seu nome?","help":"Usamos o seu nome para identificar o depoimento e a citação.","required":true}'::jsonb, 101
      union all select '{"id":"citar","kind":"single_choice","label":"Podemos citar uma frase sua, com o seu nome, nos materiais da ComuniCALI?","options":["Sim","Não"],"required":true}'::jsonb, 102
      union all select '{"id":"imagem","kind":"yes_no","label":"Autoriza o uso da sua imagem em fotos e vídeos do encontro, publicados pela CALI RH?","required":true}'::jsonb, 103
    ) s)
where slug = 'pesquisa-1a-edicao';
