# Atualização geral do Claude para o Codex — 16/11/2026

Enquanto o Codex estava sem limite, a Patrícia pediu que o Claude assumisse o site e tudo o que estava parado. Este documento diz o que mudou, onde está o código e o que fica para cada um.

## 1. Onde está o código (leia primeiro)

- Repositório: `github.com/patricia258/communicali`, branch **`producao-integrada`**, pasta local `~/CALI/communicali-integrada`. **É a versão que está no ar.**
- Ela nasceu da sua pasta `Documents/Codex/.../work/painel-producao` (commit `0a9287f`, sobre `189d186`). Tudo o que você tinha integrado foi guardado, 47 testes aprovados.
- **A partir de agora, trabalhe nessa branch.** Não use mais `communicali-home-nova` (está parada em `0b18a1a`, com alterações soltas) nem `painel-producao` (cópia antiga). Se tiver algo novo em `painel-producao`, compare antes de copiar: `diff -r` contra `~/CALI/communicali-integrada`.
- Publicar: sempre de cópia limpa (`git archive HEAD`), **sem o `.gitignore`**, com `vercel deploy --prod --skip-domain` e depois `vercel promote`. As chaves públicas do Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`) já estão no projeto da Vercel. Avise a Patrícia antes de promover.
- Quem publica por último vence: combine com o Claude antes de promover.

## 2. Banco (Supabase `cyyrrtekbkltdiatixhp`)

Aplicadas hoje, na ordem: `20261115235443` (álbum), `20261116002203`, `20261116005554` (custos), `20261116125141` (modelos e histórico de e-mails), `20261116132759` (conteúdo da home), `20261116134621` (originais e enquadramento) e **`20261116160000` (avatar nos recados)**, esta última nova, em `supabase/migrations/`. A edição `fundadora` está com o álbum `publicado = true` e o link do Drive salvo.

## 3. O que o Claude fez sobre a sua base

- **Álbum ligado:** `ALBUM_REAL = true`. O álbum completo agora abre em outra aba (`AlbumDoEncontro.tsx`). Testado de ponta a ponta com um e-mail de check-in.
- **Fotos leves:** o editor de enquadramento gera cópia de exibição de no máximo 2200 px em JPEG (antes eram PNGs de até 37 MB). Botão **Deixar as fotos leves** em Site, Encontros e fotos refaz as já enviadas. A aba da edição mostra só a **capa**; as fotos da galeria ficam em um lugar só (Site, Encontros e fotos).
- **Resumo da edição:** título "Como foi o nosso encontro", texto leve, parágrafos, `**negrito**`, listas e `## subtítulo` (`TextoEdicao.tsx`), limite de 1200 caracteres no painel.
- **Recados:** `RecadosEdicao.tsx` com 12 avatares (`AvatarRecado.tsx`, lucide, degradê suave, estilo Apple), limite de 500 caracteres, botão na mesma linha das pílulas. No painel, aba **Comentários** dentro de cada edição (`AdminComentarios.tsx`, filtros Para aprovar, Publicados, Recusados). Em Revisar aprovações fica a visão geral.
- **Tabelas do painel** (`AdminTabela.tsx` e `identidade.css`): voltam a mostrar **todas as colunas** por padrão (você tinha limitado a 4 e escondido Entrega, Abriu, Clicou), ícones sem sobreposição, pílulas e estados **coloridos** de novo, esqueleto de carregamento em vez de "nenhum registro" nos primeiros instantes.
- **Auditoria do painel, nível 1** (`docs/AUDITORIA-PAINEL-2026-11-16.md`): textos antigos e "Quero ser Membro" removidos, Configurações reescrita com o que falta de verdade, erros técnicos viram frases simples (`src/lib/erros.ts`), letras mínimas de 12 a 13 px, rótulos de topo no padrão "SEÇÃO · TELA".
- E-mail de teste do painel agora vai para quem está logada (antes: e-mail fixo no código). O e-mail `posevento` aparece como "Pós-evento (material e pesquisa)".
- **Site:** rodapé mais baixo, foto nova da fundadora (4:5), cookies, abertura 48 h, ícone do app com o nome completo, e-mail de código de acesso do Supabase redesenhado, `/e/:slug` com layout melhor.

## 4. Decisões da Patrícia que valem para o painel

- Padrão visual **Apple**, para site e painel: poucos elementos, espaço generoso, texto legível, cores com significado, nada grudado. Ela reclama (com razão) de espaçamento e de perda de cor.
- Ela quer ver **mockup antes** de qualquer mudança visual nova.
- Nada de "Quero ser Membro": é "Quero fazer parte da comunidade". Hoje não há Membros, só a Fundadora.
- Não sugerir enquete nem caixinha de perguntas.
- Painel: tudo por edição, junto (recados, e-mails, fotos, custos, pessoas).

## 5. Quem faz o quê agora

- **Claude (em andamento): auditoria nível 2** — Início útil (próximo encontro, aprovações por tipo, recados novos, acessos ao álbum, custos a vencer), lista de Edições com mais colunas e status, colunas de Pessoas. Arquivos tocados: `AdminPainel.tsx` (Início), `Admin.tsx` (lista de edições), `AdminPrograma.tsx` (lista de pessoas), `AdminInicio.tsx`. **Não edite esses arquivos até o Claude avisar.**
- **Codex, sugerido depois que o Claude subir o nível 2:** nível 3 da auditoria — menu lateral fixo no computador, controles no mesmo estilo (listas e envio de arquivo), confirmações no lugar da janela do navegador, avisos discretos com "Desfazer"; exportações (custos, e-mails, acessos, recados), busca geral, registro de alterações, equipe e permissões.
- **Pendente de investigação (Codex ou Claude):** o e-mail pós-evento foi enviado sem contador de abertura (16 enviados, 0 aberturas). Descobrir por qual caminho saiu e enviar os próximos como os outros.
- Pendências antigas que continuam: janela de Membros por edição, lista de espera automática, milhas já lançadas, lembrete de pendências, selos novos, revisão jurídica final.

## 6. Limites que o Claude encontrou

- Não leio a chave de servidor do Supabase: o sistema bloqueou. Por isso o enquadramento das fotos já enviadas só se refaz pelo painel (com a conta da organização).
- Não vê o painel com a conta real; testes visuais usam dados simulados vazios. Valide com a sessão da organização.
