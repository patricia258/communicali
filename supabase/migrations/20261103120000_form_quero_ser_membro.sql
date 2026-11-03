-- CommuniCALI (03/11/2026): formulário de interesse em ser Membro, independente de encontro marcado. Respostas entram em análise no painel Formulários.
insert into public.forms (slug, title, description, thank_you, status, questions, confirm_email, category, audience, stages, submit_label, success_text)
values ('quero-ser-membro', 'Quero ser Membro da CommuniCALI',
'**Falar de pessoas pode mudar o mundo.**

Fazer parte da CommuniCALI é gratuito. Conte um pouco sobre você para entrar na nossa lista. A equipe lê cada pedido com atenção e retorna pelo e-mail ou WhatsApp informado.

Você não precisa esperar um encontro marcado para se cadastrar.',
'Recebemos seu pedido. A equipe vai ler com atenção e retornar pelo e-mail ou WhatsApp que você informou.',
'open',
'[
 {"id":"nome","kind":"name","label":"Qual é o seu nome?","required":true},
 {"id":"email","kind":"email","label":"Qual é o seu e-mail?","required":true},
 {"id":"whatsapp","kind":"phone","label":"Qual é o seu WhatsApp?","required":true},
 {"id":"cidade","kind":"short_text","label":"Em que cidade e estado você mora?","required":true},
 {"id":"atuacao","kind":"short_text","label":"O que você faz hoje?","help":"Área, função ou o momento de carreira em que você está.","required":true},
 {"id":"motivo","kind":"long_text","label":"O que faz você querer participar da comunidade?","required":true},
 {"id":"contribuicao","kind":"long_text","label":"Tem algo que você gostaria de compartilhar com a comunidade?","help":"Um assunto que domina, uma experiência, uma ideia de encontro. Pode deixar em branco.","required":false},
 {"id":"origem","kind":"single_choice","label":"Como você conheceu a CommuniCALI?","options":["Grupo de WhatsApp","Instagram","LinkedIn","Indicação de alguém","Participei de um encontro","Outro"],"required":false},
 {"id":"aceite","kind":"yes_no","label":"Você leu e concorda com as regras da comunidade e a política de privacidade?","help":"Regras: comuni.calirh.com/regras · Privacidade: comuni.calirh.com/privacidade","required":true}
]'::jsonb,
false, 'CommuniCALI | Café & Pessoas', 'cali',
'["Novo","Em análise","Aprovado","Lista de espera","Não aprovado"]'::jsonb,
'Enviar meu pedido',
'Recebemos seu pedido! A equipe vai ler com atenção e retornar pelo e-mail ou WhatsApp que você informou.')
on conflict (slug) do nothing;
