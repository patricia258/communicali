-- CommuniCALI (03/11/2026): o formulário vira cadastro de interesse de quem vem pela primeira vez (visitante), com preferência online ou presencial.
update public.forms set
  title = 'Quero conhecer a CommuniCALI',
  description = '**Falar de pessoas pode mudar o mundo.**

Na primeira vez, você participa como visitante. Cadastre seu interesse e avisamos sobre os próximos encontros, online ou presenciais em Curitiba e região.

Fazer parte da CommuniCALI é gratuito.',
  submit_label = 'Cadastrar meu interesse',
  questions = jsonb_insert(questions, '{4}', '{"id":"formato","kind":"multi_choice","label":"Como você prefere participar?","options":["Encontros online","Encontros presenciais em Curitiba e região"],"required":true}'::jsonb)
where slug = 'quero-ser-membro' and not questions @> '[{"id":"formato"}]';
