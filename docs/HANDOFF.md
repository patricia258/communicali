# Repasse CommuniCALI

Documento único de continuidade entre as IAs que trabalham com Patrícia Lima. Leia inteiro antes de mudar qualquer coisa. Atualizado em 02/11/2026.

## Regras de trabalho

1. Toda mudança precisa de pedido de Patrícia. Faça só o que foi pedido, sem refazer o que já está aprovado.
2. O que está na lista "Decisões aprovadas" não muda sem pedido explícito dela. Em dúvida, pergunte antes.
3. Antes de começar, leia este arquivo e o "Registro de mudanças". Ao terminar, acrescente uma entrada com data, autor, o que mudou, o que foi testado e o que ficou pendente.
4. Não apague nem sobrescreva o trabalho da outra IA. Se o código do pacote estiver mais antigo que este registro, avise Patrícia antes de editar.
5. Nunca mexa em dados reais em massa. Apagar só registros próprios de teste, filtrando por e-mail ou marca.
6. Nunca grave chave, senha ou token em arquivo, chat ou commit.
7. Diga com clareza o que foi testado e o que não foi. Nada de declarar pronto sem conferir no site publicado.
8. Escreva para Patrícia em português simples. Ela não é desenvolvedora e costuma falar por voz. A transcrição pode trazer "comunicar-lhe", "Comuni Cali" ou "Kali": é CommuniCALI.

## Onde está cada coisa

| Item | Local |
| --- | --- |
| Código do site | `~/CALI/communicali` no Mac de Patrícia, git local, sem GitHub até esta data |
| Site publicado | https://comuni.calirh.com |
| Hospedagem | Vercel, time `cali11`, projeto `communicali` |
| Banco | Supabase `ComuniCALI`, ref `cyyrrtekbkltdiatixhp`, conta contato@calirh.com |
| E-mails | Resend, remetente comuni@calirh.com, domínio calirh.com verificado |
| Materiais de design | `~/CALI/communicali-materiais` |
| Logos originais | `~/Downloads/CALI LOGOS` |
| Fonte de fatos da marca | `~/Downloads/COMMUNICALI_SKILL_MESTRA_2026.txt` e `CommuniCALI_Programa_de_Membros_e_Dinamica_1a_Edicao.pdf` |
| Brand Guide | `~/CALI/communicali-materiais/brand-guide` e https://claude.ai/artifact/Tgfxazm82A35bt82wpdp67 |
| Mockup do espaço do membro | https://claude.ai/artifact/1AWPsxHaQqz9SHP36okFgT |

Os links do Claude são privados de Patrícia. Outra IA usa os arquivos locais.

**Não misturar:** `~/CALI/app.cali` é o aplicativo oficial da CALI (repositório `patricia258/app.cali`), com regras próprias. A pasta `Portal leads` é de outra empresa, Azumi RH e Ken Taki, e não recebe nada deste projeto. Este site só usa o projeto Supabase `ComuniCALI`.

## Como funciona

Vite, React 18, TypeScript, react-router 6, Supabase e funções Vercel em `api/`.

- Código das telas: `src/pages`, formulários em `src/forms`, estilos em `src/home.css`, `src/styles.css`, `src/pages/admin.css` e `src/pages/membro.css`.
- O espaço do membro usa o prefixo de estilo `passe__`, porque `.pass` pertence à tela do check-in. Confira `src/styles.css` antes de criar classes globais.
- Tabelas do painel: componente único `src/pages/AdminTabela.tsx`.
- Banco: uma migração por mudança em `supabase/migrations`, sempre aditiva e em ordem de data. Toda regra de acesso fica no servidor.
- E-mails: `api/_email.js`, `api/email-confirmacao.js`, `api/email-admin.js`, `api/email-lembretes.js`, `api/email-conexao.js`, `api/email-indicacao.js`.
- Lembrete automático: tarefa diária na Vercel, às 12h UTC, para edições públicas 2 dias antes.

### Publicar

Com acesso ao Mac:

```bash
cd ~/CALI/communicali && npx tsc --noEmit && npx vite build
```

```bash
set -a; . ./.env.local; set +a; vercel deploy --prod --yes --scope cali11 -b VITE_SUPABASE_URL="$VITE_SUPABASE_URL" -b VITE_SUPABASE_KEY="$VITE_SUPABASE_KEY"
```

Commits com a identidade `CALI RH <patricia@calirh.com>`. Depois de publicar, confira o site no ar. Não crie cache longo em `/assets`. Após um `vercel rollback`, é preciso `vercel promote`.

Sem acesso ao Mac, a outra IA entrega os arquivos alterados e a migração SQL para Patrícia ou para o Claude aplicar. Ela não publica sozinha.

### Acessos

As chaves ficam no Chaves do macOS e na Vercel: Supabase em `supabase-communicali`, conta `contato`; Resend em `resend-communicali`. Variáveis na Vercel: `SUPABASE_SERVICE_KEY`, `RESEND_API_KEY`, `CRON_SECRET`. A chave pública do site está em `.env.local` e em `api/_email.js`. Para dar acesso a outra IA, Patrícia cria um token próprio e o coloca direto na ferramenta dela, nunca no chat.

## Rotas

Públicas: `/`, `/e/:slug`, `/inscricao/:slug`, `/c/:codigo`, `/checkin`, `/votar`, `/telao/checkin`, `/telao/votacao`, `/f/:slug`, `/regras`, `/privacidade`, `/staff`, `/validar/:codigo`, `/convidar`, `/convite/:token`. `/cadastro` redireciona para a home.

Membro: `/meu-espaco`, com Início, Edições, Missões, Rede, Indicar, Programa e Meu perfil.

Painel `/admin`: Início, Membros, Programa, Missões, Matches, Edições, Indicações, Impacto, Votações, Formulários, Staff, Parceiros, Contador, Textos.

## Decisões aprovadas

**Identidade**
- Site público em bordô escuro `#1F0E14`, mostarda `#C9973B` e marfim `#F7F0EA`. Títulos em Funnel Display, textos em Inter. Mostarda nunca vira amarelo.
- Subcartela usada no espaço do membro: oliva `#5F6238`, terracota `#A9502E` e tons claros.
- Fundo nunca fica branco ao arrastar a página além do limite. Barras de rolagem escondidas quando houver pouca informação.
- Molduras de foto retas, sem arcos. Espaço do membro em papel de passaporte claro, com logo horizontal, nunca o empilhado.
- E-mails em página branca, sem bege, sem moldura quadrada, com logo horizontal, foto e blocos arredondados, emojis, saudação "Oi, Nome!" em destaque.
- Logos de parceiros sempre brancos e sem fundo. A conversão acontece no upload.
- Selos em estilo postal ilustrado com picote. Carimbos em traço fino. Arquivos em `public/selos`. Medalhas e rosetas foram recusadas.
- Painel sempre em tabela, com filtros, ordenação, contatos clicáveis e categoria colorida. Lista de cartões foi recusada.
- Só usar logo original, nunca redesenhar.

**Texto**
- Seguir a voz da CALI: sem travessão, sem "não é X, é Y", sem trio de adjetivos, sem inventar fatos. Parceiro só aparece depois de confirmado. O site público não mostra o consumo mínimo de R$ 30.
- A comunidade é nacional, os encontros começam em Curitiba, e membros podem divulgar vagas e serviços.

**Programa**
- Trilha: Visitante, Membro, Conector, Embaixador. Participante Ativo e Membros honorários foram retirados. Convidado, Kids e Organização ficam fora da trilha. contato@ e patricia@ entram como Fundadora.
- Só é membro quem esteve presencialmente. Não existe cadastro público de membro.
- Conector: 100 pontos, 3 encontros e 2 missões. Embaixador: 250 pontos, 6 encontros, parceiro trazido, missões e aprovação. Pontos sozinhos não promovem; a organização muda a categoria.
- Pontos: presença +10, indicado que compareceu +5, recomendação validada +10, contribuição +15, parceiro +20, palestra a convite +30.
- Rede só a partir de Conector. Abaixo disso fica borrada, e o servidor envia apenas a contagem. Conexão não libera contatos.
- A aceitação da política de privacidade inclui a Rede, com saída pelo perfil.
- Quem recebe convite vê o perfil para aceitar ou recusar. Matches passam por aprovação em `/admin/matches`, com prioridade para buscas ligadas à CALI.
- Indicação só vale com presença. Inscrição pelo site é intenção de participar, e a equipe aprova, coloca em espera ou recusa no painel.
- Recusas exigem justificativa, com data e responsável.
- Currículo em área privada, visível para a pessoa e a organização.

**Operação**
- QR Code permanente dos porta-mesas aponta para `https://comuni.calirh.com/checkin`, que descobre a edição do momento. Arquivos em `~/CALI/communicali-materiais/qrcode-checkin`.
- Na edição, a recepção confirma o nome, a pessoa senta, faz check-in pelo QR e recebe o crachá na mesa. Depois vem a votação.
- Supabase fica no plano gratuito. Não sugerir o plano Pro.

## Dados que precisam de cuidado

- **Inscritos do Coffee:** 36 respostas em `forms`, slug `coffee-rh-cwb`, 23 marcadas como contatadas. Dados reais. Não alterar em massa. O original continua no app até Patrícia confirmar.
- **Demonstração:** 12 pessoas `@demo.communicali.test`, edições `demo-1` a `demo-3` e fotos em `site/demo`. Precisa sair antes de pessoas reais entrarem, no máximo antes de 14/11/2026, sempre confirmando com ela. Limpeza: `python3 -I ~/CALI/communicali-materiais/demonstracao/demo.py limpar`.
- **Edição `teste`:** fora do site, com inscrições abertas para testes. Remover antes dos relatórios de 14/11.
- **Parceiros:** DGTZ, Legacy Coffee, BurnsideBarber e Aliado são reais e aparecem no site.

## Pendências

1. Testar o envio real de currículo e os e-mails de indicação e de sugestão.
2. Conferir na tela o menu do painel em duas linhas, a tela final do check-in e o compartilhamento direto do selo em celular real.
3. Corrigir os links do rodapé duplicados nas telas de check-in.
4. Escrever os guias de regras de visitantes, parceiros e lugares, e o documento "Detalhes do programa".
5. Definir vantagens e descontos de Conector e Embaixador.
6. Patrícia decidir se tira Contador e Programa do menu do painel.
7. Enviar a revisão jurídica. Os trechos novos da privacidade ainda não foram revisados.
8. Confirmar o WhatsApp oficial: 41 8787-9244 no site ou 98779-1933 na matriz da marca.
9. Remover demonstração e edição de teste antes de 14/11/2026.
10. Criar repositório no GitHub, se Patrícia quiser que outras IAs leiam e enviem código diretamente.

## Registro de mudanças

Acrescente entradas no topo.

### 02/11/2026, Claude Code
- Mudou: painel em tabelas, auditoria de recusas, Indicações, Impacto, open to work, currículo, logos brancos, Rede bloqueada, matches, convite com aceite e aprovação de inscrições. Último commit antes deste repasse: `88395bd`.
- Testado: Membros, Missões, Edições, Indicações, Matches, Impacto e a faixa de logos no site publicado.
- Pendente: ver a lista acima.
