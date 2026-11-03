-- CommuniCALI (03/11/2026): o formulário de parceiros pergunta pela vantagem exclusiva para os Membros (cupom, condição ou brinde).
update public.forms set questions = jsonb_insert(jsonb_insert(questions, '{21}',
  '{"id":"vantagem_membros","kind":"yes_no","label":"Você pode oferecer uma vantagem exclusiva para os Membros da CommuniCALI?","help":"Ela aparece na vitrine de parceiros do espaço online dos Membros, com seu logo e contatos.","required":true}'::jsonb),
  '{22}', '{"id":"vantagem_detalhe","kind":"long_text","label":"Qual seria a vantagem?","help":"Cupom de desconto, condição especial ou brinde. Se já tiver, inclua o código do cupom, a validade e como usar.","required":false}'::jsonb)
where slug = 'parceiros-communicali' and not questions @> '[{"id":"vantagem_membros"}]';
