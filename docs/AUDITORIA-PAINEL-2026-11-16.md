# Auditoria do painel — 16/11/2026

Feita pelo Claude. Método: leitura do código de todas as telas do painel, as 12 telas abertas no computador (1440 px) e no celular (390 px) com dados simulados vazios (para ver espaçamento, textos e estados), e os prints enviados pela Patrícia. Referência de qualidade: padrão Apple (hierarquia clara, espaço generoso, poucos elementos, texto legível, respostas imediatas).

**Não foi possível ver:** dados reais, a ficha de cada pessoa, as janelas de edição e o painel com a conta da organização. Itens com esse limite estão marcados como "conferir".

Imagens: `~/CALI/auditoria-painel-2026-11-16/`.

## Nível 1 — Errado ou confuso (corrigir primeiro)

1. **Aprovações vazia fala em "Quero ser Membro" e "parte 4 do plano".** Texto antigo e proibido. Trocar por "Nenhum pedido esperando decisão." (`AdminPainel.tsx`, linha 90).
2. **Configurações é uma lista de tarefas interna e está desatualizada.** Mostra como pendentes coisas que já estão prontas: check-in sem acesso total, pedido para fazer parte, bloqueio após 2 visitas, modelos e histórico de e-mails, home editável, álbum, aprovações com e-mail automático. Usa jargão ("parte 4", "validar com Claude"). Mover para um documento e deixar em Configurações o que é de verdade (equipe, registro de alterações, avisos).
3. **Erros aparecem crus.** Ex.: em E-mails, "Failed to execute 'json' on 'Response': Unexpected end of JSON input". Padronizar: frase simples + botão "Tentar de novo". 21 pontos mostram a mensagem técnica.
4. **A tela mostra "Nenhum… encontrado" enquanto ainda carrega.** Parece que não há dados. Precisa de estado de carregamento (esqueleto) antes do vazio. Só 6 de 15 telas têm.
5. **Texto pequeno demais em todas as telas.** 13 a 31 elementos por tela com menos de 12 px (rótulos de 10 e 11 px, cabeçalho de tabela). Padrão mínimo: 13 px, corpo 14 a 15 px.
6. **E-mail pós-evento sem medição.** 16 enviados, 16 entregues, 0 aberturas e 0 cliques, enquanto os outros e-mails têm 50 a 60 por cento de abertura. Provável envio sem contador. Conferir como foi disparado e, nos próximos, enviar pelo mesmo caminho dos outros.
7. **Rótulos de topo inconsistentes.** "ÁREA ADMINISTRATIVA", "GESTÃO DO APP", "PARCEIROS", "COMUNICAÇÃO", "SITE"... sem regra. Definir um por seção, igual ao menu.
8. **"Rede e parceiros" abre numa tela chamada "Logos na faixa do site".** Nome do menu e título não combinam.

## Nível 2 — Falta (funções e informação)

**Início**
- Hoje só mostra "Fazer agora" e quatro números. Faltam: próximo encontro com inscritos e check-ins, aprovações separadas por tipo, recados novos, acessos ao álbum, custos que vencem em 7 dias, e-mails com problema.

**Edições**
- A lista tem 4 colunas (edição, data, local, inscrições). Faltam: check-ins, álbum publicado ou não, recados para aprovar, custo total e situação.

**Pessoas**
- Conferir com dados reais: visitas usadas de 2, última presença, origem (convidado por quem), cidade, empresa, WhatsApp, milhas. Filtros por edição e por situação. Ações em lote (aprovar vários, enviar e-mail a vários).

**Aprovações**
- Aprovar ou recusar vários de uma vez. Contador visível no menu (já existe). Histórico de quem decidiu.

**E-mails**
- Medição de abertura e clique no pós-evento. Reenviar para quem voltou. Exportar a lista de enviados.

**Álbum**
- Acessos por pessoa (já existe) com exportação. Aviso quando alguém tenta e o e-mail não bate.

**Custos**
- Exportar para Excel (hoje só a tela). Total por categoria. Alerta de vencimento no Início.

**Painel em geral**
- Busca geral (⌘K). Registro de alterações (quem mudou o quê). Equipe e permissões para a parceira. Desfazer depois de excluir ou recusar. Exportar em todas as listas (hoje só em Pessoas e Programa).

## Nível 3 — Acabamento no padrão Apple

- **Menu.** No computador há um botão "Menu" que esconde a navegação. Em tela larga, mostrar a barra lateral fixa; o botão fica só no celular.
- **Controles nativos do navegador.** 28 listas de escolha e 5 seleções de arquivo ("Escolher arquivo / Nenhum arquivo escolhido") com aparência padrão. Trocar por controles no mesmo estilo (lista com cantos arredondados, área "Arraste a imagem ou escolha").
- **Confirmações.** 18 usam a janela feia do navegador. Trocar por uma folha de confirmação no próprio visual, com o nome do que será apagado e o botão em vermelho.
- **Avisos.** Mensagens soltas de texto no meio da tela. Trocar por aviso discreto no canto, que some sozinho, com "Desfazer" quando fizer sentido.
- **Espaçamento.** Adotar uma escala única (4, 8, 12, 16, 24, 32, 48) e usar em todas as telas. Mais ar entre blocos do que dentro deles.
- **Hierarquia.** Um título por tela, um rótulo discreto acima, uma frase de apoio. Tirar textos longos de explicação do fim das telas (Custos tem três parágrafos).
- **Vazio com ação.** "Nenhuma edição cadastrada" deve ter o botão "Criar a primeira edição". Hoje só diz que está vazio.
- **Cor com significado.** Estados (aprovado, pendente, atrasado, recusado) sempre na mesma cor em todas as telas. Já restaurado em e-mails e pessoas; falta nas demais.
- **Foco e teclado.** Anel de foco visível em todos os controles; Esc fecha janelas; ⌘K busca.
- **Celular.** Sem sobra lateral em nenhuma tela. Toque mínimo de 44 px: formulários têm 2 elementos menores. Custos tem uma faixa de abas que rola para o lado (aceitável, mas indicar).

## Ordem sugerida de trabalho

1. Nível 1, itens 1 a 5 e 8: meio dia, sem risco.
2. Início útil, lista de Edições e colunas de Pessoas: um dia.
3. Menu lateral fixo, controles e confirmações no padrão: um dia e meio.
4. Exportações, busca geral, registro de alterações, equipe: dois dias.
5. Passada final de espaçamento e acessibilidade, já com dados reais e a conta da organização.
