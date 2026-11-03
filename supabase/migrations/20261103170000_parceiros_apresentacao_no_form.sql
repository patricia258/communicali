-- CommuniCALI (03/11/2026): a apresentação para parceiros sai da home e fica só dentro do formulário de parceiros, na primeira etapa.
update public.forms set questions = jsonb_set(questions, '{0,attachment}',
  '{"url":"/communicali/seja-parceiro.pdf","cover":"/communicali/seja-parceiro-capa.jpg","title":"Como ser parceiro da CommuniCALI","text":"Modalidades, o que construímos juntos, a vantagem para os Membros e os próximos passos."}'::jsonb)
where slug = 'parceiros-communicali' and questions->0->>'id' = 'etapa1';
