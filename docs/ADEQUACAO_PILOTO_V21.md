> Continuidade consolidada em HANDOFF.md. Este arquivo é referência complementar e pode descrever uma etapa anterior; o estado atual está no HANDOFF único.

# Adequação para o primeiro encontro — v21

02/11/2026. Responsável pela implementação: ChatGPT. Situação: código preparado e testado localmente; NÃO publicado e SQL NÃO aplicado. Este registro é de continuidade entre as IAs, não uma tarefa de curadoria para Patrícia.

## Fonte e limites

Documento lido no Drive: CommuniCALI_Documento_Mestre_v21_Rede_Parceiros.docx, id 1qOjnKx9owUCy54BHbDYlBA68NOB6Pnwz, atualizado em 02/11/2026. Referência: https://docs.google.com/document/d/1qOjnKx9owUCy54BHbDYlBA68NOB6Pnwz/edit . Seções 33 e 35 orientam a operação; seção 34 contém minutas que não devem ser publicadas automaticamente. A grafia ComuniCALI com um M segue a orientação explícita posterior de Patrícia; arquivos e identificadores legados não foram renomeados.

Base online confirmada na análise anterior: dpl_BKcpNVGD7dVea62MiFakvSN9dhGf. O código entregue foi comparado com essa base local. Não foi inspecionado o schema remoto: o projeto correto cyyrrtekbkltdiatixhp segue ausente dos projetos acessíveis. Nada foi executado em Prospect, Mapa ou Portal.

## Alterações concluídas no código

- Home: gratuidade e condições próprias dos encontros no FAQ; adesão facultativa; removida a promessa de que presença sozinha transforma alguém em Membro. Embaixador não é apresentado como representante autônomo da comunidade. Destinos das ações, identidade e layout mantidos.
- Início: total existente de pontos e presenças preservados; retiradas metas 100/250 e a barra calculada sobre esses limiares. Não calcular avanço com o total legado como se fosse saldo do ciclo anual. Link leva aos critérios no Programa. Não foram zerados nem recalculados pontos.
- Programa: critérios aprovados de Conector 60/4/1 e Embaixador 180/6/2/12 meses, incluindo avaliação e aceite, em explicação expansível. Nenhuma elegibilidade individual é calculada. Selos postais e blocos Minha pontuação/Meu histórico preservados. A antiga tabela de promessa de pontos por ações legadas foi substituída por orientação sobre validação; o extrato continua mostrando os valores existentes.
- Missões: retirado requisito textual antigo 100 pontos/3 encontros/2 missões. Mantidas regras atuais de disponibilidade e envio; ilustrações, três contornos de selos, estados e carimbos intactos.
- Rede: na visão bloqueada, empresas têm seção própria; a restrição passa a identificar especificamente os perfis pessoais. O módulo de empresas usa somente communicali_parceiros_membros, sem consulta a membros, contatos pessoais ou metadata de benefícios. Até a função existir, oferece a lista pública do site; não inventa dados nem contorna permissões. Prévia de Membro da Fundadora não consulta essa função com privilégios reais. A visão autorizada anterior de parceiros/prestadores mantém o fluxo aprovado.
- Vitrine preparada é a primeira parte da separação, com nome, logo e site já públicos. Novos contatos institucionais autorizados, condições de oferta e cupons válidos ainda exigem integração dos cadastros e decisões da seção 35. Não anunciar a Rede completa como concluída.

## SQL preparado, fora das migrações automáticas

| Arquivo | Efeito após ativação e verificação | O que não faz |
| --- | --- | --- |
| docs/sql/v21_vitrine_parceiros_membros.sql | Função pública invoker com implementação em schema privado, sessão e cadastro ativo conferidos; empresas ativas ordenadas por nome; projeção explícita de quatro campos públicos. | Não abre pessoas/contatos, não cria ofertas, não rastreia resgate, não migra consentimentos, não muda categorias. |
| docs/sql/v21_capacidade_confirmacoes.sql | Trigger em inscrição confirmada, com trava da edição e contagem na transação. Cobre INSERT e mudanças de status/edição, inclusive o PATCH atual da API administrativa. | Não muda inscrições existentes, não cria lista de espera com reserva temporária e não envia mensagens. |

O trigger mantém capacidade nula como sem limite configurado, zero como nenhuma vaga e permite manter uma confirmação já existente. Não corrige excesso anterior silenciosamente. A API atual devolve erro genérico se o PATCH for rejeitado; melhorar a mensagem ao integrar com o banco real. Examinar triggers e permissões existentes, conferir a lista de papéis elegíveis e formalizar migrações somente no projeto correto. Testar duas conexões concorrentes de PostgreSQL antes de ativar a proteção de capacidade.

## Revisão dos fluxos essenciais e impedimentos para publicação

| Fluxo | Evidência no pacote | Próxima implementação necessária |
| --- | --- | --- |
| Adesão e visitante | memberQuestions/confirmQuestions e communicali_checkin_inscrito combinam aceites, presença e criação de membro; falta escolha independente de adesão. | Separar identidade da pessoa, adesão voluntária e presença; contar apenas visitas elegíveis, preservar os cadastros atuais. Não oferecer escolha falsa na tela sem servidor correspondente. |
| Inscrição | communicali_inscrever grava analise; api/email-admin.js decide por PATCH e envia confirmação/espera. | Aplicar proteção transacional de capacidade após homologação, verificar retornos e evitar mensagem de sucesso sem confirmação persistida. |
| Check-in | Unicidade de edition/member e de eventos de pontos existe no SQL; na base online, a tela Success anunciava +10 para qualquer novo check-in. Na continuação local, só anuncia crédito explícito registrado na resposta e não promete crachá. | Conferir todas as funções vigentes, diferenciar Visitante/Membro e retorno do crédito efetivamente concedido. Validar repetição, janela e papel; não substituir o texto por um crédito presumido. |
| Convites | Indicação direta, código e check-in são caminhos distintos. | Homologar limite por edição e +5 somente após presença; não considerar indicação como vaga. Rascunho de duas trocas do código continua pendente. |
| Cancelamento, espera e faltas | Não identificado no pacote o fluxo completo de cancelamento pelo titular, oferta com expiração, justificativa e recurso da v21. | Criar atendimento funcional e registro antes de anunciar os prazos. Sem penalidade automática para cancelamento tardio e sem confundir recusa administrativa com cancelamento pelo participante. |
| Rede e privacidade | na_rede existe; canais pessoais são retornados em conjunto pela ficha autorizada. | Controles independentes e versionados de canais, revogação no servidor; não inferir autorizações novas de booleanos antigos. Separar a vitrine institucional do diretório pessoal. |
| Políticas | /privacidade e /regras leem site_settings. Tentativa nesta execução de obter somente esses dois textos pela API pública expirou em oito segundos. | Recuperar a versão publicada e produzir quadro texto atual/lacuna/proposta/justificativa/validação. Nenhum texto foi substituído ou validado juridicamente. |

As restrições de acesso existentes foram mantidas para pessoas. Isso não representa aprovação definitiva da matriz de privacidade antiga. Os 36 inscritos reais e registros de demonstração não foram alterados ou removidos.

## Ordem de continuidade da própria IA

1. Recuperar acesso ao projeto correto e à política publicada; verificar schema, funções efetivas, permissões e dados agregados mínimos. Preservar textos e registrar versões antes de editar.
2. Homologar capacidade com concorrência real e a vitrine de empresas sem abertura de pessoas. Inspecionar o fluxo administrativo e suas mensagens.
3. Integrar a escolha de adesão e os caminhos de Visitante/Membro no cadastro/check-in, com proteção de pontos e histórico. Preparar transição com data e escopo verificáveis.
4. Integrar consentimentos e meios de cancelamento/atendimento coerentes com o que será anunciado; submeter apenas as decisões e minutas que realmente exigem revisão, sem transferir a curadoria à Patrícia.
5. Conferir inscrição → decisão → confirmação → check-in → pontos em homologação e sessão real/celular. Só então preparar a publicação do bloco compatível. Não publicar textos que antecipem comportamento ainda ausente.
6. Usar o piloto para medir comparecimento, dificuldades, retorno e demanda. Em seguida automatizar ciclos, funções, revalidação, espera/recursos e benefícios. Planos e cobrança ficam fora deste bloco.

## Continuação de 02/11, após indisponibilidade da outra IA

Fila de acesso: docs/FILA_IA_COM_ACESSO_03-11.md. Preparação de visitas/adesão/indicações em preparacao-v21; 24 testes novos. Ajuste de comunicação de crédito no check-in com 14 verificações; não muda o lançamento de pontos. O fluxo completo ainda requer integração no banco. 31 testes v20 foram reexecutados; TypeScript/build aprovados. Sem nova publicação.

## Verificações realizadas na primeira entrega

- TypeScript e build Vite aprovados. Aviso de tamanho do bundle já existente; nenhuma nova dependência de produção.
- 49 verificações React: empresas para Membro, bloqueio de pessoas, ausência da função com alternativa pública, erro/repetição, contrato inválido, vazio, busca, resposta atrasada, prévia sem consulta privilegiada, critérios e pontos preservados. Respostas e pessoas sintéticas.
- 30 verificações SQL em PostgreSQL isolado/PGlite: sessão, conta ativa, papéis, projeção de dados, acesso negado a tabelas pessoais, capacidade de confirmação, espera, cancelamento, repetição, capacidade zero/nula e transferência. PGlite não comprova concorrência entre duas conexões reais.
- Sem testes autenticados no site, sem banco remoto, sem envio de formulário/e-mail, sem novas cobranças e sem publicação. O bloco ainda NÃO está liberado para produção.

Testes em tests/v21. Para executá-los, usar ambiente de teste com react/react-test-renderer 18.3.1 e @electric-sql/pglite; esbuild vem do Vite. Os módulos de teste são externos às dependências de produção. Exemplos: NODE_PATH=/diretorio/de/teste/node_modules node tests/v21/interfaces.cjs ; PG_TEST_MODULE=/diretorio/de/teste/node_modules/@electric-sql/pglite node tests/v21/vitrine-e-capacidade.mjs .
