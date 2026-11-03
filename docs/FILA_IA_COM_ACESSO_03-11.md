> Continuidade consolidada em HANDOFF.md. Este arquivo é referência complementar e pode descrever uma etapa anterior; o estado atual está no HANDOFF único.

# Retomada da IA com acesso — 03/11/2026, a partir das 16h

Horário de Brasília. Patrícia informou que a outra IA só estará disponível nesse momento e autorizou o ChatGPT a continuar a preparação e separar as tarefas dependentes dos acessos. Não há envio automático deste pacote, agendamento de execução ou conversa direta entre as IAs. O repasse é manual.

## Primeiro: preservar a base atual

Ler HANDOFF.md, ADEQUACAO_PILOTO_V21.md e este arquivo. Ler a versão atual do Documento Mestre no Drive e conferir se houve versão posterior à v21. Seções 33/35 guiam a implementação; minutas da seção 34 não são políticas aprovadas. Decisões explícitas mais recentes de Patrícia prevalecem. Usar ComuniCALI com um M nos novos textos, preservando logos e identificadores técnicos existentes.

Antes de aplicar o pacote, comparar com o código atual do Mac e a publicação atual da Vercel. A base funcional era dpl_BKcpNVGD7dVea62MiFakvSN9dhGf. Em 02/11, somente o tamanho/rolagem dos carimbos e o atributo draggable foram publicados sobre essa base: dpl_AZBqRustLkBAEGj72tYxsESLZbec. A v21 continua preparada, sem integração/publicação das suas regras. Não sobrescrever alterações posteriores do Claude. Integrar por diferenças e preservar cópia de retorno fora dos arquivos renderizados; nada de montar versões antigas atrás da tela.

Banco exclusivo: ComuniCALI, cyyrrtekbkltdiatixhp. Nunca Prospect, Mapa ou Portal. Não copiar chaves para o chat ou pacote. Não modificar em massa os 36 inscritos reais. Não remover demonstrações, testes ou contatos sem escopo específico autorizado.

## Nova proposta recebida em 02/11: ingresso por aprovação (v22)

Antes da integração A3, ler PROPOSTA_V22_INGRESSO_E_PARCERIAS.md. Existem componentes e prévia isolados; a Home não foi alterada. Consolidar a adoção e vigência da análise de ingresso, preservando os Membros atuais. Não confundir solicitação de Membro com inscrição/vaga e não condicionar as duas visitas permitidas à aprovação como Membro. Não publicar o CTA de solicitação sem o fluxo correspondente.

## Fila por ordem de dependência

| Ordem | Trabalho que depende do acesso | Material preparado | Critério para concluir |
| --- | --- | --- | --- |
| A1 | Confirmar schema, funções e políticas efetivas no banco correto. | docs/sql/v21_inspecao_somente_leitura.sql; diagnóstico em ADEQUACAO_PILOTO_V21.md. | Registrar diferenças em relação ao pacote e dependências; nenhuma escrita durante o diagnóstico. |
| A2 | Recuperar a política e as regras publicadas e os avisos realmente mostrados em cada formulário. | Rota /privacidade → site_settings; mapa de lacunas v20/v21. | Cópia privada datada + quadro texto atual/lacuna/proposta/motivo/validação. Minutas separadas; não substituir automaticamente. |
| A3 | Integrar adesão voluntária, Visitante e Membro no cadastro/check-in. | preparacao-v21/participacao.mjs, README e 24 testes; Checkin.tsx e checkinCredito.ts. | Recusar adesão não cria Membro; duas visitas efetivas abertas; terceira em outra edição pede adesão gratuita; presença não duplica; nenhum ponto retroativo de Visitante; versão/aceite efetivamente persistidos. |
| A4 | Homologar e ativar proteção de capacidade. | docs/sql/v21_capacidade_confirmacoes.sql. | Duas conexões aprovando a última vaga: somente uma confirma. Testar INSERT, PATCH atual, repetição e transferência; adaptar mensagem administrativa sem esconder falha. Preservar confirmações existentes. |
| A5 | Integrar cota de convidado e crédito por comparecimento em TODOS os caminhos. | avaliarNovaIndicacao/creditoIndicacao e testes; SQLs atuais de indicação direta/link/check-in. | Limite inicial 1 configurável por edição, trava contra corrida, sem autoindicação, sem duplicidade; +5 uma vez após presença; disputa entre indicadores resolvida com registro. Definir tratamento da cota em recusa/cancelamento sem presumir regra. |
| A6 | Implementar escolhas de diretório/canais e revogação no servidor, compatíveis com política revisada. | preparacao-v20/privacidade.mjs e INTEGRACAO.md. | Canal recusado não chega na resposta da API; escolhas separadas de marketing/imagem; evidência/versionamento; tratar legados sem presumir novas autorizações. Crianças exigem procedimento próprio. |
| A7 | Integrar vitrine institucional separada do diretório pessoal. | ParceirosMembros.tsx; docs/sql/v21_vitrine_parceiros_membros.sql. | Membro ativo consulta empresas sem receber pessoas/contatos pessoais. Prévia não usa privilégios da Fundadora. Confirmar público elegível; visitantes e resgate ainda dependem das decisões da seção 35. |
| A8 | Preparar atendimento/cancelamento, espera, justificativa e recurso compatíveis com o que for anunciado. | preparacao-v20/prazos.mjs; critérios no documento mestre. | Caminho funcional antes de anunciar prazos; titular autorizado, protocolo, relógio do servidor, calendário validado e decisão humana. Não penalizar automaticamente cancelamento tardio nem tirar direitos gerais. |
| A9 | Verificar regressões, integrar código e publicar somente o bloco compatível/autorizado. | Projeto completo no pacote, testes e manifesto SHA-256. | Fluxo completo em homologação, sessão real e celular; migração antes do cliente dependente, políticas pertinentes revisadas; plano de retorno que preserve dados; leitura após publicação e HANDOFF atualizado com identificador real da publicação. |

## Pendências anteriores que precisam continuar visíveis

| Pendência | Arquivos/estado | Cuidado na integração |
| --- | --- | --- |
| Perfis de empresas, logos originais e contatos | RedeExtras.tsx, AdminRedeExtras.tsx; etapa_6_parceiros_feedback.sql e ajuste_beneficios_parceiros.sql, rascunhos anteriores. | Não aplicar cegamente: os rascunhos mantêm a antiga barreira de Rede. Compatibilizar com v21 sem abrir pessoas. Não é possível recuperar cores de um logo que só existe em branco; pedir original somente quando necessário. |
| Comentários nos perfis | Interface preparada; ativação não comprovada. | Nome do autor, sem foto, aprovação CALI antes de exibir; verificar permissões, retirada da Rede, moderação/auditoria e política pertinente antes de ativar. Não afirmar que comentários já persistem. |
| Duas alterações do código de convite | docs/sql/etapa_7_limite_convite.sql, não aplicado. | Conferir unicidade e bloqueio de linha, idempotência e código atual; duas alterações a partir da ativação conforme repasse anterior. Não zerar códigos nem destruir indicações. Link antigo não tem alias preparado. |
| Benefícios e cupons reais | Visual aprovado; Casa Enlace e Entrelinhas são demonstrações. | Exigir acordo, autorização de marca/contatos, vantagem exata, condições, validade e modo de uso. Expiração desativa resgate. Sem percentual padrão, tracking de compras ou comissão presumida. |
| Programa anual e funções | preparacao-v20/regras.mjs; critérios no Programa; saldo/ciclo/avaliação/aceite persistentes não integrados. | Não usar created_at como adesão sem comprovar. Não zerar ledger, promover automaticamente ou mudar papel de Fundadora. Confirmar escopo das presenças, calendário e vigência. |
| Demonstrações e edição de teste | Histórico do HANDOFF: 12 perfis @demo e edição teste. | Identificar e apresentar escopo antes da limpeza autorizada; nunca apagar inscritos reais por semelhança de nome. |
| E-mails e compartilhamento | Fluxos existentes e pendências do HANDOFF. | Testar em destinatário de teste autorizado, não em inscritos reais por conveniência. Conferir QR/download/compartilhamento no aparelho. |

## O que o ChatGPT pode continuar sem esses acessos

Código local, componentes, textos da interface, validações de domínio, rascunhos SQL e testes com dados sintéticos; contratos de integração, cenários de aceite e manutenção do repasse. Isso não depende do retorno do Claude.

Vercel não é apresentada como um acesso exclusivo da outra IA: já foi usada pelo ChatGPT neste trabalho. A publicação deste bloco está aguardando integração e validação, principalmente no banco e nas políticas. Não descrever a espera como falta de autorização de Patrícia para toda e qualquer ação.

## Entrega de volta entre as IAs

Ao concluir, registrar no HANDOFF: arquivos integrados, migrações realmente aplicadas, versão de políticas/aceites, testes reais e sintéticos separados, publicação real se houver, limitações e próxima tarefa. Entregar pacote atualizado. Não comunicar conclusão antes da verificação correspondente. Não pedir à Patrícia que escreva a curadoria, preencha testes ou decida questões técnicas rotineiras.
