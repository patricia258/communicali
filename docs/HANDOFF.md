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
- Conector: 60 pontos no ciclo de 12 meses, 4 encontros e 1 contribuição de conexão. Embaixador: 180 pontos, 6 encontros, 2 contribuições diferentes e 12 meses como Conector (v21, confirmada em 03/11). Pontos sozinhos não promovem; a organização muda a categoria.
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

### 03/11/2026, Claude Code — vantagem exclusiva dos parceiros para Membros
- Publicado `dpl_8zPQag4paKCf2BFWhTBFXtG5CvVC`. PDF `public/communicali/seja-parceiro.pdf` com o bloco "Um cupom só para os Membros" na página 3 e "a vantagem para os Membros" no passo Acordo (fonte: `build.py` + `deck.html` no scratchpad do Claude, exportado pelo Chrome sem cabeçalho). Formulário `parceiros-communicali` ganhou "Você pode oferecer uma vantagem exclusiva para os Membros?" e "Qual seria a vantagem?" (migração `20261103160000`). O que o parceiro combinar entra em Parceiros > perfil (vantagem, desconto, detalhes, cupom) e aparece na vitrine do Meu espaço.
- Selo terracota: o texto "Conhecimento" passava da largura e cortava a borda da direita; corrigido.

### 03/11/2026, Claude Code — selos fixos e botão Registrar interesse
- Publicado `dpl_2HYzfmrNcksxasKVScGbZzwaiDfC`. Sem carrossel: os quatro selos ficam lado a lado em tamanho fixo (postal mostarda, redondo vinho, recorte terracota, oval oliva), todos coloridos com borda marfim. Título em duas linhas: "Apoie este encontro." / "Seja um parceiro.". Os botões "Quero participar" do topo e da abertura viraram "Registrar interesse" e levam direto a `/f/quero-ser-membro`.
- Próximo pedido dela: revisar e aprovar o layout dos e-mails automáticos.

### 03/11/2026, Claude Code — home: primeira vez, +300 e selos de parceria
- Publicado `dpl_ByF41DSjN92Jz51EPusbggP7hmA1`. Pedidos de Patrícia: botões "Quero participar" mais finos; número fixo "+300 pessoas" (comunidade toda, não só o grupo); seção "Escolha como participar" substituída por "Primeira vez? Venha nos conhecer." com dois blocos (visitar a comunidade → `/f/quero-ser-membro`, e grupo do WhatsApp com QR); sem a porta "Encontros presenciais" (a agenda já mostra) e sem texto lateral; sem texto lateral no Programa de membros; categorias de parceria em carrossel de selos com quatro estilos (postal picotado, carimbo redondo, recorte terracota, oval oliva), girando sozinho com setas.
- Regra dela: quem vem pela primeira vez é visitante, não entra direto como Membro. O formulário virou "Quero conhecer a CommuniCALI", com a pergunta online ou presencial em Curitiba e região (migração `20261103150000`). O slug continua `quero-ser-membro`.

### 03/11/2026, Claude Code — decisões de Patrícia publicadas
- Decisões novas ficam no Google Doc "CommuniCALI — Decisões após a v21 (atualizar sempre)", na mesma pasta do Documento Mestre: https://docs.google.com/document/d/1SYHtmoAL0-AyaTV7EMbRR_ECkcjinya-Jsyhs3gTWhU/edit . Ele prevalece sobre a v21 em caso de conflito. Acrescente decisões no topo.
- Publicado (`dpl_AJuFkGBTPAL1a5h57im5kzq8AKzh`, commit em `main`):
  - Home: "Fazer parte da CommuniCALI é gratuito" (sem citar planos), terceira porta "Cadastro de Membro" → `/f/quero-ser-membro`, visitante em até dois encontros abertos, FAQ de gratuidade, categorias de parceria só com nome, em linha.
  - Formulário `quero-ser-membro` (migração `20261103120000`), respostas no painel Formulários com etapas Novo, Em análise, Aprovado, Lista de espera, Não aprovado. Não cria Membro sozinho.
  - Convidados: `editions.limite_convidados` (padrão 1, campo "Convidados por membro" em Edições), trigger com trava contra corrida; inscrição pelo link acima da cota segue sem vínculo; indicação direta mostra aviso. Fundadora fora do limite. +5 só com presença (já existia). Migração `20261103130000`, testada com rollback.
  - Perfis de parceiros, vantagens/cupom e comentários com aprovação: rascunhos etapa_6 + ajuste_beneficios aplicados (migração `20261103140000`), com uma mudança: `communicali_private.rede_perfis` aceita qualquer Membro ativo com check-in. Comentários seguem a barreira da Rede (Conector+). Caixa de comentário com convite e sugestões com emoji. Membro abaixo de Conector vê a vitrine de empresas embaixo da Rede bloqueada.
  - Requisitos v21 nas telas: Conector 60 pts/4 encontros/1 contribuição; Embaixador 180/6/2 contribuições/12 meses; faixas do painel 0-59, 60-179, 180+.
- Não feito, por decisão dela: kits e crachá (em estudo); escolha do que aparece na Rede (ela pediu explicação); trava de capacidade A4; política de privacidade nova.
- Testado: build e TypeScript, limite de convidado no banco com rollback, Home e formulário no site publicado. Não testado com sessão real de Membro: vitrine e comentários.

### 03/11/2026, Claude Code — sincronização com a produção
- Mudou: o repositório `~/CALI/communicali` (branch `main`, commit `ca56442`) agora é idêntico à produção `dpl_AZBqRustLkBAEGj72tYxsESLZbec`, conferido arquivo por arquivo pelo SHA-1 do manifesto. As preparações v20/v21/v22 do pacote único ficaram na branch `preparacao-chatgpt-v21` (commit `d23c592`, pasta `~/CALI/communicali-prep`), fora do que é publicado.
- Banco (somente leitura): nenhum objeto dos rascunhos de `docs/sql` existe no ComuniCALI (sem `communicali_private`, `communicali_feedback`, `communicali_partner_profiles`, `codigo_alteracoes`, funções de convite, vitrine ou capacidade). Nenhum erro de tela registrado em `client_errors` nos últimos 3 dias.
- Regra daqui em diante: publicar só a partir de `main`. Pacote da outra IA entra por branch e é integrado por diferença.
- Pendente: integrações A3 a A9, conforme decisões de Patrícia.

### 02/11/2026, ChatGPT — ajuste isolado dos carimbos da tela inicial
- Pedido específico: diminuir um pouco os selos/carimbos da tela inicial e restringir a movimentação à horizontal, sem redesenhar nada.
- Carimbos: 168 × 168 → 140 × 140 px; espaço do próximo encontro 130 → 110 px. Artes, cores e rotação original intactas. Faixa com overflow-y hidden, touch-action pan-x pinch-zoom, contenção horizontal e espaço vertical para não cortar as imagens inclinadas. Imagens com draggable=false; sem seleção/arraste nativo. Pinça para ampliar preservada.
- Atualizado no código de trabalho v21 e preparada publicação visual isolada a partir da base dpl_BKcpNVGD7dVea62MiFakvSN9dhGf, conferida por SHA-1 contra o pacote da etapa 8. Código de produção difere somente em MeuEspaco.tsx (atributo draggable) e membro.css; HANDOFF do pacote contém registro final. Não publicar o restante da v21 nesta ação.
- Prévia local regenerada com três carimbos fictícios e os mesmos assets originais, permitindo conferir a rolagem horizontal. Sem API ou conta real.
- Verificações: TypeScript da cópia de produção aprovado; origem/diferenças conferidas. Gestos no celular real e tela autenticada não foram testados. Não houve SQL, alteração de pontos, banco ou dados reais.
- Publicação: em andamento. Acrescentar identificador real e estado ao concluir. Manter pendências v21/da outra IA independentes deste ajuste visual.


### 02/11/2026, ChatGPT — exemplos de parceiros e etapa 8, Programa visual
- Pedido autorizado: dois modelos fictícios completos de empresas parceiras e continuidade para Programa, preservando selos e trabalho aprovado.
- Exemplos: novo src/pages/ParceirosExemplos.tsx usa o mesmo ParceiroRede da interface real. Casa Enlace (espaço, 10%) e Entrelinhas (livraria, 5%), com apresentação, monograma fictício, cinco canais, benefício, condições/validade e cupom. Dados explicitamente ilustrativos; não há cadastro, consulta extra ou escrita no banco. Contatos e cópia dos exemplos desativados. Em Rede → Parceiros e prestadores, botão “Ver dois exemplos de parceiros preenchidos”, apenas na visão Fundadora; pode ocultar novamente. Não mistura contagens nem lista real. Preview de Membro continua respeitando bloqueio da Rede.
- Programa: novo src/pages/TrilhaPrograma.tsx, título com ícone, papel atual em bordô, indicação da próxima etapa e trilha vertical numerada com os PNGs postais originais. Fundadora e demais papéis fora da trilha não são tratados como degraus de promoção. Estados de etapa representam posição na trilha, não comprovação de presenças históricas.
- Divergência identificada: lido documento mestre v19 consolidado operacional (Library libfile_7330d38229348191934c1cd55014bcd1, seção 33). Especifica Conector 60 pontos/4 presenças/1 contribuição e Embaixador 180 pontos/6 presenças/2 contribuições distintas/12 meses como Conector, além de ciclos individuais, aceites e revalidação. O app fornecido ainda contém critérios anteriores e não tem esses fluxos ativos. Esta tarefa é refinamento visual: NÃO recalculou pontos, NÃO promoveu membros e NÃO ativou regras v19. Na trilha nova, não exibe limiares antigos 100/250 nem aplica os novos como se estivessem implementados; informa requisitos em atualização e avaliação pela organização. Inicio/META, backend e permissões continuam intactos. Implementar v19 de forma coerente em todas as telas/servidor é tarefa específica pendente, não apenas trocar textos.
- Preservado por comparação: blocos Minha pontuação, Meu histórico, Como ganhar pontos, relato, prévia da Fundadora e ações existentes. Selos do Programa/arquivos originais, missões, Início, Indicar, convite recém-aprovado e funções de compartilhamento sem alterações. Rede real mantém autorização e filtros existentes.
- Testado: TypeScript/Vite; 39 verificações de componentes (2 exemplos completos, canais desativados, zero RPC dos modelos, quatro etapas, nível atual, papéis fora da trilha, selos PNG originais, sem elegibilidade numérica); 9 de integração (visão Fundadora, Rede bloqueada, pontuação/histórico e compartilhamento preservados). Testes anteriores de parceiro/feedback (17) e benefício/editor (14) permanecem aprovados. Sem banco remoto, SQL, dados reais, e-mails ou novas dependências de produção.
- Prévia entregue: ComuniCALI_modelos_parceiros_programa.html, HTML estático gerado a partir dos mesmos componentes, com fontes e imagens incorporadas, exemplos e visão Membro, sem chamadas externas. É prévia sintética, não conferência de conta real ou screenshot autenticado. Interfaces validadas por componente; visual no aparelho real permanece pendente.
- Base: dpl_6ctmGMswgHvML8EMKQdyrKzTmwV1, ComuniCALI/cali11. Publicado: dpl_BKcpNVGD7dVea62MiFakvSN9dhGf, produção READY, https://comuni.calirh.com/meu-espaco. Build remoto aprovado; entrada pública carregou index-wYa6ch7c.js e index-CI1KOnLR.css. Sem sessão de membro para inspeção interna do Programa/Rede. HANDOFF final no pacote; publicação contém entrada preliminar.
- Pendências mantidas: ativação de cadastro extra/benefícios e feedback (etapa 6), limite de duas alterações do código (etapa 7), implementação completa das regras v19, sessão real/celular e revisão visual final de conjunto. Não marcar integrações sem banco como concluídas.


### 02/11/2026, ChatGPT — correções do convite e vantagens dos parceiros
- Pedido de Patrícia antes de Programa: convite em primeira pessoa, grafia ComuniCALI com um M nos textos, desenvolvimento humano/gestão/conexões além do online, bilhete com código destacado, instrução de inscrição/aguardar contato e “Toda honra a Deus!” no canto inferior direito. Lista de indicações aprovada e preservada.
- Cartão: somente desenho do PNG e texto de compartilhamento em ConviteMembro.tsx. Logo original intacto; fontes da marca, título/textos com pesos diferentes, bilhete com recortes, borda e tamanho de código ajustável. QR mantém /c/codigo e não afirma inscrição garantida. Removida frase “Nome convida você” e “Café, encontros e conexões”. Identificadores técnicos legados não foram renomeados.
- Parceiros: links por ícones acessíveis, com toque de 44 px; só canais cadastrados. Preparada seção abaixo dos contatos com benefício, desconto/condição, detalhes/validade e cupom copiável, somente quando preenchidos. Não criados descontos, cupons ou vantagens reais.
- Painel: novo grupo de campos de vantagens no editor de perfis das empresas. Confere a disponibilidade das colunas no servidor; com schema anterior mantém o editor compatível e não envia campos desconhecidos. Fila de feedback e cadastros anteriores preservados.
- Banco NÃO alterado. Novo rascunho docs/sql/ajuste_beneficios_parceiros.sql exige etapa_6_parceiros_feedback.sql e adiciona quatro campos, mantendo RLS/barreira de Rede e parceiros ativos. Destino exclusivo cyyrrtekbkltdiatixhp. Conferir schema e formalizar migração antes de aplicar. Ativação dos cadastros extras, comentários e limite de código continua pendente da conexão correta.
- Testado: TypeScript/Vite; 12 verificações do convite/PNG, QR decodificado, imagem renderizada e inspecionada; 14 verificações específicas de ícones, benefício/cupom condicionais, cópia e compatibilidade do editor; testes anteriores de logos/feedback (17) mantidos; 26 verificações SQL em PostgreSQL isolado com dados sintéticos, incluindo limite de tamanho, leitura autorizada e bloqueio de alteração por membro. Nenhum banco remoto ou e-mail real acessado para testes.
- Preservado por comparação com publicação: MeuEspaco.tsx inteiro, lista Minhas indicações, Programa, selos, pontos, carimbos, limites de código e APIs de envio. Sem novas dependências de produção.
- Base: dpl_CtNBqh4H8QY8aY8JhHADh97Q42UD, ComuniCALI/cali11. Publicado: dpl_6ctmGMswgHvML8EMKQdyrKzTmwV1, produção READY, https://comuni.calirh.com/meu-espaco. Build remoto aprovado; entrada pública carregou index-z_MgXgET.js e index-CytsxmgN.css. Sem sessão real de membro nessa conferência. SQL não aplicado. HANDOFF final neste pacote; versão publicada contém registro preliminar. Prévia PNG com código PATRICIA informado pela própria Patrícia nos prints, sem alterar seu cadastro.
- Pendente: conferência autenticada/celular e ativação do banco. Programa permanece sem alteração, aguardando revisão deste ajuste.


### 02/11/2026, ChatGPT — etapa 7, convite com cartão e limite preparado
- Pedido: Patrícia autorizou continuar e perguntou sobre comentar no perfil. Esclarecido: feedback da etapa 6 está preparado, mas NÃO ativo; falta banco CommuniCALI na conexão. Sem alteração nessa condição.
- Mudou: novo src/pages/ConviteMembro.tsx, integração limitada à aba Indicar em MeuEspaco.tsx e CSS específico. Código salvo no convite, cópia/WhatsApp/link explícito; cartão PNG 1080×1350 gerado no aparelho, com logo original, primeiro nome, código destacado e QR para https://comuni.calirh.com/c/CODIGO. Não promete desconto. Download e compartilhamento nativo quando disponível, falhas tratadas, botão de tentar novamente, foco e Escape no modal, URLs de imagem revogadas ao fechar.
- Histórico de visitantes ordenado por data mais recente, sem mutação da resposta. Funções de envio de indicação/recomendação e e-mails idênticas à base por comparação.
- Servidor preparado: docs/sql/etapa_7_limite_convite.sql, rascunho NÃO aplicado. Usa código único existente, bloqueio de linha para serializar trocas, máximo de duas alterações por membro, repetição do mesmo código idempotente, conta ativa e identidade conferidas. Mantém assinatura antiga communicali_escolher_codigo, delegando à mesma regra para não haver desvio por clientes antigos.
- Contagem: sem histórico anterior recuperável; começa em zero na ativação. Cada novo código diferente do atualmente atribuído conta uma alteração, inclusive personalizar o sugerido. Preserva códigos atuais e indicações existentes. Código antigo deixa de resolver após troca, como no fluxo anterior; aviso pede compartilhar novo link e regenerar cartões. Sem aliases, sem reserva de códigos antigos.
- Banco NÃO alterado: projeto cyyrrtekbkltdiatixhp continua ausente da conexão Supabase (lista apenas Prospect, Mapa e Portal). Conferir schema, criar migração formal e validar no projeto correto antes de aplicar SQL. Nunca executar em outro banco. Até ativação, personalização fica indisponível no novo componente; copiar convite, WhatsApp e cartão continuam com o código atual. Limite não foi declarado ativo no servidor.
- Testado: TypeScript/Vite; 12 verificações de componente/imagem com RPC simulada, incluindo código salvo versus rascunho e edição bloqueada sem backend; PNG renderizado com fontes da marca/inspecionado e QR decodificado para endereço correto. 24 verificações SQL em PostgreSQL isolado/PGlite com dados sintéticos (unicidade, normalização, validação, duas trocas, repetição, função antiga, acesso e conta inativa). Sem banco remoto, e-mails de teste ou dados reais.
- Preservado por comparação: demais abas, pontos, carimbos, selos e etapas anteriores; cadastro, aprovação, contatos, e-mails e atribuição de indicações. Sem novas dependências de produção.
- Base: dpl_8M3zCkDT171fXhB9TPQJsykoQBzx, CommuniCALI/cali11. Publicado: dpl_CtNBqh4H8QY8aY8JhHADh97Q42UD, produção READY, https://comuni.calirh.com/meu-espaco. Build remoto aprovado; entrada pública carregou index-BOwXuxpW.js e index-oPHc1Qh_.css. Sem sessão real de membro nessa conferência. SQL não aplicado. Registro final no pacote; publicação contém entrada preliminar.
- Pendente: validação autenticada no app e celular real, download/compartilhamento/câmera real e ativação de banco das etapas 6 e 7. Próxima etapa planejada: 8, Programa. Não marcar as etapas com banco como integralmente concluídas.


### 02/11/2026, ChatGPT — etapa 6, parceiros e comentários (ativação parcial)
- Pedido autorizado: continuar parceiros/prestadores; Patrícia definiu feedback com nome do autor, sem foto e aprovação da CALI antes de publicar.
- Interface: separa empresas parceiras de membros prestadores, explica filtros e mostra site cadastrado. Logo branco existente fica legível sobre bordô; falha de imagem usa inicial. Originais usam fundo branco quando cadastrados.
- Novos módulos preparados: src/pages/RedeExtras.tsx e AdminRedeExtras.tsx, integrados em MeuEspaco.tsx/Admin.tsx; estilos limitados em membro.css. O painel permite enviar original sem conversão e cadastrar descrição/contatos. Cadastro antigo e faixa branca do site preservados.
- Limitação dos logos: o fluxo antigo não guardava original. Enviar novamente o arquivo original em Perfis das empresas após ativação; o novo editor é separado do cadastro antigo. Nenhuma logo colorida foi recuperada ou inventada.
- Feedback preparado: 1–5 estrelas, nome/comentário sem foto; um comentário por autor/perfil, sem autoavaliação; edição volta a pendente. Aprovação/ocultação só admin, motivo obrigatório para não publicar, auditoria e conferência da versão revisada. Mantida barreira da Rede: categorias autorizadas, conta ativa e check-in; sem ampliar acesso.
- Banco NÃO alterado. docs/sql/etapa_6_parceiros_feedback.sql é rascunho exclusivo de cyyrrtekbkltdiatixhp. A conexão Supabase lista outros projetos, não CommuniCALI. Não usar Prospect/Mapa/Portal. Conferir schema real, criar migração formal e validar antes de aplicar nesse projeto. Sem backend novo, módulos de cadastro extra/comentários ficam ocultos e a Rede antiga continua disponível.
- Testado: TypeScript/Vite; 17 verificações de componentes com RPC simulada (logos, contatos, backend ausente, edição pendente, ausência de foto, perfil próprio); 21 verificações SQL em PostgreSQL isolado/PGlite com dados sintéticos (RLS, identidade, níveis, conta inativa, envio, aprovação admin, edição, revisão concorrente e auditoria). Nenhum teste gravou em banco remoto. Sem validação autenticada de ponta a ponta, upload real ou inspeção visual no celular nesta revisão.
- Preservado: carimbos, pontos, selos ilustrados de três estilos, prévias, regras de liberação, filtros aprovados, agenda, Início/alertas, Indicar, Programa e inscrições. Sem novas dependências de produção, e-mails ou alteração de variáveis privadas.
- Base: dpl_EyKEzghpgZTo7Gd8uimtouSzJETr, CommuniCALI/cali11. Publicado: dpl_8M3zCkDT171fXhB9TPQJsykoQBzx, produção READY, https://comuni.calirh.com/meu-espaco. Build remoto aprovado; entrada pública carregou index-CDno5wgM.js e index-Dioso5eb.css. Sem sessão de membro nesta conferência. SQL NÃO aplicado. Registro final neste pacote; publicação contém entrada preliminar do HANDOFF.
- Próximo passo da sequência: etapa 7, Indicar. Pendência da etapa 6 permanece explicitamente aberta até ativação e validação real; não marcar como integralmente concluída.


### 02/11/2026, ChatGPT — três estilos de selo alternados
- Pedido: Patrícia aprovou usar os três tipos da proposta, revezando.
- Mudou: somente apresentação de SeloMissao em src/pages/MeuEspaco.tsx. Convidou/Palestrou com borda ondulada; Conectou/Aproximou com borda serrilhada; Recomendou/Representou com aro e faixa. Contornos em SVG, bordô/marfim, com ilustrações originais e legenda. Associação fixa por missão.
- Preservado: arquivos originais de selos, selos do Programa, estados conquistado/pendente, regras de pontos/liberação/envio, prévias e filtros recém-aprovados. Sem CSS, dados, banco, SQL, e-mail ou novas dependências.
- Testado: TypeScript/Vite local; comparação confirmou alteração limitada ao componente visual de selo e seu helper de contorno; renderização dos seis selos inspecionada com ilustrações e legendas visíveis. Sem sessão real de membro no navegador de revisão.
- Base: dpl_9V3xQ4a1Qm5Tu1xgp2oVT1D1r4hZ, CommuniCALI/cali11. Publicação autorizada pela aprovação nesta conversa.
- Publicado: `dpl_EyKEzghpgZTo7Gd8uimtouSzJETr`, produção READY, https://comuni.calirh.com/meu-espaco. Build remoto aprovado; entrada pública e novo JS `index-DtErNJRz.js` conferidos. CSS permanece `index-6fW_lCYG.css`. Selos inspecionados em renderização local do componente, não em sessão autenticada. Registro final no pacote; entrada preliminar na publicação.
- Continuidade: Parceiros/prestadores, etapa 6. Conferência visual no celular real permanece pendente.


### 01/11/2026, ChatGPT — filtros menores na web e estudo de selos
- Pedido: Patrícia aprovou o tamanho no celular e a prévia de missões disponíveis, mas pediu filtros menores no computador. Enviou modelos de contornos para selos redondos.
- Mudou no site: somente src/pages/membro.css. Media query para telas a partir de 761 px com mouse fino e hover: filtros com 36 px de altura, fonte de 14 px, etiquetas de 11 px e menores intervalos. Fora dessa condição, permanecem exatamente os estilos aprovados do celular (44 px e fonte de entrada de 16 px).
- Preservado: TSX, busca/filtros funcionais, imagens, pessoas, dados, pontos, permissões, selos publicados e prévia de Missões. Sem SQL, banco, dependências ou e-mails.
- Estudo visual: imagem gerada do print selecionado como proposta de filtros compactos, distinta de verificação do site; proposta de contornos de selo (ondulado, serrilhado e com faixa) baseada nos modelos enviados e na cartela/ilustrações existentes. Estudos não são imagens de teste da aplicação e não entram automaticamente no código.
- Testado: TypeScript/Vite local aprovado; comparação do CSS confirmou que a única alteração de estilo é a media query de desktop. Celular e TSX sem mudanças.
- Base: dpl_RsV1ZMi3VcPiKTLEKrctwGqNDx13, CommuniCALI/cali11. Publicação autorizada pela continuidade do ajuste.
- Pendente: conferir os campos com sessão real no computador, definir o estilo dos novos selos e seguir para Parceiros/prestadores (etapa 6).
- Publicado: `dpl_9V3xQ4a1Qm5Tu1xgp2oVT1D1r4hZ`, produção READY, https://comuni.calirh.com/meu-espaco. Build remoto aprovado. Entrada pública e novos arquivos `index-6fW_lCYG.css` / `index-DV_QCRbm.js` conferidos. Navegador confirmou a condição de media query desktop ativa; não há sessão de membro para medir os campos autenticados. Registro final no pacote, entrada preliminar na publicação.


### 01/11/2026, ChatGPT — correção dos selos/prévia e etapa 5: Rede
- Pedido: Patrícia esclareceu que queria selos redondos, não ícones. Pediu status separado no canto superior direito, visualização de missões não concluídas e continuidade para a próxima etapa. Reforçou primeiro cumprir os pedidos e depois refinar o conjunto.
- Correção de Missões: selos ilustrados circulares, compostos em SVG a partir das ilustrações originais em public/selos, com borda de selo e legenda. PNGs originais e selos do Programa permanecem intactos. Estado pendente atenuado; conquistado em cores. Esta entrada substitui a decisão visual de ícones circulares registrada na etapa 4.
- Status: separado em linha alinhada ao canto superior direito; missão aberta e liberada mostra Disponível, mantendo Bloqueada, Por convite, Em análise, Pode reenviar e Concluída conforme a condição atual.
- Prévia: em Missões, a Fundadora pode escolher Minhas missões, Prévia: Membro e Prévia: Conector. Mostra missões por cumprir e os bloqueios da categoria; não altera pontos/conquistas e não permite envio na prévia. Voltar a Minhas missões restaura a apresentação real. Formulário só permanece montado quando podeEnviar for verdadeiro.
- Rede/pessoas: ícone no título, filtros mais delicados com alvo de toque de 44 px, segmento sobre o canto inferior esquerdo da foto e contatos por ícones acessíveis, somente quando informados e autorizados pelo fluxo existente. Sem contato, aviso explícito.
- Preservado por comparação: Início/alertas, agenda e etiquetas dos encontros, Indicar, Programa, edição do perfil e controle principal. Sem SQL, banco, e-mail, novas dependências ou ampliação de acesso. Parceiros/prestadores e feedback ficam na etapa 6.
- Testado: TypeScript/Vite local aprovado após corrigir import de marca não exportado pela versão instalada de lucide. Testes React com dados sintéticos para selos/recortes únicos, status separado, prévias reversíveis e sem envio, contatos condicionais/autorizados por ícones, normalização WhatsApp, segmento na foto, busca e Rede bloqueada. Selos renderizados para inspeção da composição SVG; ilustrações e legendas conferidas. Não foi usado um membro real nem gravado dado de teste.
- Base: `dpl_88wZzujvxvz21RKMbj1hrYvTkJRQ`, CommuniCALI/cali11. Publicação autorizada pela continuidade desta conversa.
- Pendente: conferência visual autenticada e celular; novos limites de pontos continuam sem definição; revisão final de conjunto registrada no plano.
- Publicado: `dpl_RsV1ZMi3VcPiKTLEKrctwGqNDx13`, produção READY, https://comuni.calirh.com/meu-espaco. Build remoto aprovado. Entrada pública e arquivos `index-2qXZvq7m.css` / `index-BtPfj3P-.js` conferidos em navegador. Sem sessão de membro no navegador de revisão: não foi declarada conferência visual de Missões/Rede autenticadas. Este pacote contém o registro final; a publicação contém a entrada preliminar.
- Continuidade: etapa 6, Parceiros/prestadores e comentários, respeitando as definições ainda pendentes para feedback.


### 01/11/2026, ChatGPT — etiquetas dos encontros e etapa 4: Missões
- Pedido: antes de prosseguir, acrescentar status no canto superior direito dos encontros; depois continuar a sequência em Missões.
- Agenda: etiqueta Encerrado em vermelho para datas anteriores; Inscrições abertas para atual/futuro com o campo ativo; Previsto para atual/futuro sem inscrições abertas. Data usa America/Sao_Paulo. O encerramento é pela data, sem interpretar o campo de horário em texto livre. Nenhum estado manual de reserva/definição foi criado ou inferido como confirmação.
- Missões: título com ícone de alvo, introdução curta e explicação expansível; cartões neutros com etiqueta de estado, ícones de ação circulares e requisitos do bloqueio com atalho ao Programa. Concluída tem prioridade na apresentação de uma missão já cumprida.
- Preservado: condições de liberação e envio; pontos, promoção manual, formulário e RPC existentes. Selos e carimbos originais não foram alterados, recortados ou redesenhados. Programa e demais abas permanecem iguais, exceto o encaminhamento do botão de requisitos à aba Programa. Início/alertas e lógica da agenda preservados.
- Arquivos: `src/pages/MeuEspaco.tsx`, `src/pages/membro.css`, este registro e plano. Sem SQL, sem banco, sem e-mail e sem dependências novas de produção.
- Testado: TypeScript/Vite local; componente React com dados sintéticos e RPC simulada cobrindo as três etiquetas, encerrado mesmo se o campo de inscrição estiver ativo, estados de missão, bloqueio e requisitos, atalho ao Programa, visualização como Membro, categorias autorizadas e envio simulado. Comparação confirmou regras de liberação e envio idênticas à base.
- Base: `dpl_7PG4GysUxGeH6oumJ3JYKG1P5bYw`; publicação no CommuniCALI/cali11 autorizada pela continuidade deste pedido.
- Pendente: visual e envio em sessão real/celular; novos limites de pontos não definidos. Não foi feita gravação real de missão para testar.
- Publicado: `dpl_88wZzujvxvz21RKMbj1hrYvTkJRQ`, produção READY, https://comuni.calirh.com/meu-espaco. Build remoto aprovado. Entrada pública do Meu espaço e novos arquivos `index-u6co4nbx.css` / `index-Df_YX96Q.js` conferidos em navegador. Sem sessão de membro: não foi declarada conferência visual de Missões autenticada. Este pacote contém o registro final; a publicação contém o registro preliminar.
- Continuidade: próxima etapa é Rede / pessoas e perfis (etapa 5). Pendências anteriores continuam assinaladas no plano.


### 01/11/2026, ChatGPT — Meu espaço, etapa 3: Edições/agenda
- Pedido: seguir para a próxima etapa da sequência, Edições/agenda.
- Mudou: `src/pages/MeuEspaco.tsx` e `src/pages/membro.css`. Título com ícone de calendário; próximos encontros por data crescente e anteriores por data decrescente; agenda combina edições públicas com as já autorizadas no passaporte, deduplicadas por slug. “Ver o encontro” abre o resumo no próprio cartão, com parágrafos, links e fotos existentes. Sem resumo, aviso explícito; em falha, preserva os encontros recebidos e oferece nova tentativa.
- Conteúdo: reutiliza `editions.resumo` e `fotos_url`, que já têm editor no painel Edições. Nenhum relato inventado. Consulta apenas campos da edição com `publica = true`, mantendo RLS e cliente público/autenticado existentes. Não usa service role nem busca outros dados privados.
- Categorias: proposta de separar tipo e público registrada no plano. Não foram criados campos, categorias, filtros ou atribuições sem definição da Patrícia.
- Preservado por comparação: Início e alertas das etapas 1–2, carimbos, pontos e demais abas. Rodapé, painel, autenticação, permissões e dados não foram alterados. Sem SQL, sem e-mail e sem novas dependências de produção.
- Testado: TypeScript/Vite local; componente React com dados sintéticos para ordenação, hoje, deduplicação, preservação das listas de origem, resumo, parágrafos, links/fotos, texto escapado, filtro público, falha com preservação de encontros, nova tentativa e estado vazio. Consulta direta de leitura pública tentou validar a seleção real, mas expirou por timeout neste ambiente; nenhum dado foi gravado.
- Base: `dpl_78LrSCjtYzDZmtJGHmc5o4upvP9K`. Publicação no CommuniCALI, time cali11, autorizada pela continuidade deste pedido.
- Pendente: conferência visual de Edições com sessão real e em celular; validação da consulta real nesse fluxo; definição das categorias. As pendências anteriores continuam no plano.
- Publicado: `dpl_7PG4GysUxGeH6oumJ3JYKG1P5bYw`, produção READY, https://comuni.calirh.com/meu-espaco. TypeScript/Vite remoto aprovados; domínio carrega o novo CSS `index-CCTYCYkX.css` e JS `index-BX2Qn2HT.js`. Entrada pública conferida em navegador. Sem sessão de membro nesse navegador, não foi declarada conferência visual da agenda autenticada. O registro final deste pacote é posterior à publicação, que contém a entrada preliminar.
- Continuidade: próxima etapa é Missões (etapa 4), mantendo regras de liberação existentes até definição dos limites solicitados.


### 01/11/2026, ChatGPT — Meu espaço, etapas 1 e 2
- Pedido: iniciar a sequência de refinamento do Meu espaço, preservando o trabalho aprovado. Ordem completa e pendências registradas em `docs/PLANO_REFINAMENTO_MEU_ESPACO.md` (8 etapas).
- Mudou: `src/pages/MeuEspaco.tsx` e `src/pages/membro.css`. Saudação única com nome completo, cartão bordô #5A1E2D, lápis para editar e botão para compartilhar selo. Sininho com contador abre a lista de avisos; nomes e a referência disponível aos serviços ganham destaque. Marcar como lido continua usando `communicali_aviso_lido`, com tratamento de falha. Link administrativo de matches mantém a condição de Fundadora e o destino existente.
- Preservado: carimbos e blocos de pontuação, níveis, selos, compartilhamento, permissões, demais abas, rodapé aprovado e todos os dados. Sem SQL, sem novas dependências de produção, sem disparo de e-mail.
- Limite: a resposta atual dos alertas não informa o serviço específico do match. O texto genérico foi preservado e destacado, sem inventar a informação. Enriquecimento no servidor segue pendente.
- Base: dpl_7gLuA6m5PohUvHuCjEnrPP41gMDs. Publicação no projeto CommuniCALI, time cali11, conforme autorização do fluxo desta conversa. Não publicar em outro projeto.
- Testado localmente: TypeScript e Vite aprovados; testes do componente React com dados sintéticos cobriram abrir/fechar sininho, contador, estado vazio/carregamento, nome único, editar/compartilhar, destaque de texto, restrição do link administrativo, texto escapado, ver perfil e leitura simulada com sucesso, falha e nova tentativa. Comparação confirmou carimbos, pontos e demais abas idênticos à base. Nenhuma chamada real de teste ao banco.
- Pendente: serviço específico no alerta; conferência visual e leitura de alertas com sessão real da Patrícia; compartilhamento no celular real. Não foi declarada validação visual do passaporte autenticado.
- Publicado: `dpl_78LrSCjtYzDZmtJGHmc5o4upvP9K`, produção READY, https://comuni.calirh.com/meu-espaco. Build remoto aprovado. Entrada pública do Meu espaço abre normalmente após recarregar, com o CSS novo index-CFkiE7yh.css. No navegador desta revisão não há sessão de membro: o cartão autenticado foi verificado por testes do componente com dados sintéticos, não por inspeção visual da conta real.
- Continuidade: próxima etapa é Edições/agenda (etapa 3). Todos os pedidos posteriores estão no plano; pendências específicas das etapas 1–2 permanecem assinaladas. O registro final deste pacote é posterior à publicação, que contém a entrada preliminar.


### 01/11/2026, ChatGPT — revisão do rodapé conforme prints
- Pedido: Patrícia recusou a versão centralizada anterior. Pediu separação visual do FAQ e organização semelhante ao rodapé do site CALI; formulários com somente Regras e Privacidade.
- Mudou: SiteFooter.tsx, PublicFormPage.tsx, styles.css e public-form.css. Rodapé do site em fundo de painel bordô, com limite superior sutil, marca à esquerda, navegação ao centro e canais por ícones à direita; assinatura em linha inferior. Em telas estreitas, os grupos se empilham. No formulário, somente Regras e Privacidade em uma linha, com espaço para os controles.
- Preservado: destinos dos links mantidos, logos originais, textos do site, regras, APIs e dados. Nenhum SQL.
- Esclarecimento: versões anteriores são apenas histórico da hospedagem. Nenhum rodapé antigo é montado por trás do novo e não há alternância automática entre versões.
- Base publicada: dpl_AwSrnusCaoCm2LSxEbVkyCKZdz8k. Publicação autorizada no fluxo atual por Patrícia.
- Testado: TypeScript/Vite local e build remoto aprovados. Site publicado conferido em desktop: fundo próprio #2A151C, borda superior, navegação e três canais por ícones. Formulário de parceiros conferido com somente dois links legais, altura de 60 px. Nenhum envio de formulário, e-mail ou alteração em dados. Celular real segue pendente.
- Publicação: dpl_7gLuA6m5PohUvHuCjEnrPP41gMDs, https://comuni.calirh.com. O registro final é entregue neste pacote; a publicação contém o registro preliminar da tarefa. O comando de build permanece o documentado na entrada anterior.

### 01/11/2026, ChatGPT — rodapé discreto
- Pedido: Patrícia pediu rodapé mais discreto, com elementos em linhas separadas, e autorizou expressamente a publicação nesta tarefa.
- Mudou: somente `src/styles.css` e `src/forms/public-form.css`. Rodapé centralizado e sem linha divisória; marca acima, contatos e navegação em duas linhas, assinatura abaixo. Formulários reservam espaço próprio para os links e mantêm os controles de navegação acima.
- Preservado: textos, destinos dos links, logos, dados, APIs e regras de acesso. Nenhum SQL ou alteração no banco.
- Base: arquivos de código conferidos por SHA-1 com a publicação `dpl_BHkurGy3p7PvVFDdLyjkEQRpVKKg`; divergências limitadas aos dois estilos desta tarefa.
- Testado: instalação com lockfile, TypeScript e Vite locais; build Vercel; página principal e formulário de parceiros no domínio publicado em navegador desktop. Rodapé sem borda, seis links em duas linhas, sem sobreposição com a navegação do formulário (10 px entre os blocos na tela conferida). Não foi enviado formulário nem disparado e-mail. Teste em celular real permanece pendente.
- Publicado: `dpl_AwSrnusCaoCm2LSxEbVkyCKZdz8k`, produção READY, https://comuni.calirh.com. A autorização expressa de Patrícia nesta conversa substituiu a restrição anterior de não publicar somente para este pedido. Referência anterior: `dpl_BHkurGy3p7PvVFDdLyjkEQRpVKKg`.
- Build desta publicação: a conexão API não recebe as variáveis públicas de build que o Claude passa por CLI; o comando abaixo lê somente os valores públicos já existentes em api/_email.js. Não foram criadas chaves nem alteradas variáveis na Vercel. As variáveis privadas de produção continuam as existentes.
  ```bash
  npx tsc --noEmit && node --input-type=module -e 'import{SUPABASE,PUBLIC_KEY}from"./api/_email.js";Object.assign(process.env,{VITE_SUPABASE_URL:SUPABASE,VITE_SUPABASE_KEY:PUBLIC_KEY});await(await import("vite")).build()'
  ```
- Pendências mantidas: celular real; demais itens da lista anterior. A duplicidade antiga de links internos no check-in não foi alterada neste ajuste. Este registro final está no pacote entregue ao Claude; o código-fonte da publicação contém o registro preliminar da mesma tarefa.

### 02/11/2026, Claude Code
- Mudou: painel em tabelas, auditoria de recusas, Indicações, Impacto, open to work, currículo, logos brancos, Rede bloqueada, matches, convite com aceite e aprovação de inscrições. Último commit antes deste repasse: `88395bd`.
- Testado: Membros, Missões, Edições, Indicações, Matches, Impacto e a faixa de logos no site publicado.
- Pendente: ver a lista acima.
