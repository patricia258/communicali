# Integração futura — preparação v20

Estado: desenho técnico para a cópia v20 analisada. Não aplicado. A curadoria e a preparação são responsabilidade da IA; este arquivo não é uma lista de tarefas entregue à Patrícia.

## O que já está implementado neste diretório

- `regras.mjs`: saldos de ciclo e histórico separados; valores antigos preservados; rejeição de duplicidade e movimento de outro membro; avaliação de requisitos para Conector/Embaixador; estados separados de avaliação e aceite; revalidação sem remover papel ou histórico automaticamente.
- `privacidade.mjs`: materialização de escolhas opcionais com evidência, ordem e versão do aviso; diretório, contatos por canal, marketing e imagem independentes; retirada e filtro de exibição. Não determina base legal para todo tratamento de dados.
- `prazos.mjs`: limite de cancelamento, validade de oferta de espera e janela de inscrição; nunca confirma ou reserva vaga nem aplica penalidade.
- `previa.mjs` e `gerar-previa.mjs`: demonstração interna sem API, dados reais ou persistência. Não coleta consentimento ou aceite real.
- Testes automatizados com dados fictícios. Não há novo pacote, endpoint, tarefa agendada ou configuração de implantação.

Os módulos não são importados por `src/` ou `api/`. Os testes não se conectam a banco ou enviam notificações. Nada é ativado pela simples presença desta pasta.

## Dependências que a curadoria precisa resolver antes da conexão ao app

1. Recuperar a política publicada em sua fonte oficial (`site_settings.privacidade_texto`, via rota `/privacidade`), preservar sua versão e elaborar comparação de lacunas. Conteúdo atual não verificado na fase anterior; textos das migrações não são substituto dessa leitura.
2. Conferir schema real e funções em ComuniCALI `cyyrrtekbkltdiatixhp`. Prospect, Mapa e Portal não são destinos alternativos. Os SQLs anteriores continuam rascunhos não aplicados.
3. Conferir data efetiva de adesão, histórico, duplicidades e regras de transição antes de calcular ciclos sobre dados existentes. Não inferir adesão a partir da criação de um registro de visitante.
4. Confirmar se as presenças de elegibilidade são contadas por ciclo ou por histórico; definir a taxonomia de contribuições validadas. O módulo não escolhe silenciosamente o período: a ausência de escopo impede o cálculo.
5. Definir o marco horário do aniversário, tratamento de adesão em 29/02, contagem de experiência como Conector e pausas. `saldos()` recebe limites explícitos de ciclo; não fabrica um calendário de aniversário.
6. Revisar avisos e instrumentos pertinentes com a organização e revisão jurídica. Preços, kits futuros, cobranças e sanções não aprovadas não são implementados.

## Propostas conservadoras, ainda sem regra definitiva

A saída da Rede limpa autorizações de canais no materializador; o retorno exige escolher canais novamente. Essa é uma proposta de comportamento para a transição, não regra publicada ou aprovação adicional presumida. Não converter o `na_rede` antigo em autorização de todos os canais. No protótipo, todas as escolhas começam desligadas.

A simulação usa um adulto fictício. Exigir um identificador de responsável no validador não verifica vínculo legal ou autoridade. O fluxo de crianças precisa de verificação, avisos, permissões e procedimentos próprios antes de uso real.

## Contratos para o servidor, sem rotas ativas

| Operação | Entrada da pessoa | O servidor deve obter/verificar | Efeito permitido após integração |
| --- | --- | --- | --- |
| Consultar meu programa | Sessão válida | Identidade, limites do ciclo, movimentos e contagens autorizadas | Resposta calculada; nenhuma promoção |
| Registrar escolha opcional | Finalidade, canais, autorizar/revogar, identificador de requisição | Titular pela sessão, aviso efetivamente apresentado, sequência, timestamp e autorização do responsável quando aplicável | Acrescentar evento de evidência; atualizar projeção na mesma transação |
| Consultar perfil da Rede | Identificador do perfil | Permissão atual do observador, participação do titular, canais escolhidos e preenchidos | Enviar apenas dados permitidos; não mandar contatos ocultos para filtrar apenas no navegador |
| Aceitar ou recusar função | Papel, versão do termo apresentado e escolha | Titular, termo ativo, oferta válida e vínculo com a avaliação | Aceite versionado. A categoria depende de decisão administrativa válida |
| Registrar avaliação administrativa | Resultado, motivo e referências mínimas | Permissão administrativa, membro, papel, versão e evidências atuais | Decisão auditada; nova conferência antes de transição de papel |
| Aceitar vaga ofertada | Identificador/token restrito e chave de repetição | Titular, prazo pelo relógio do servidor, elegibilidade, capacidade e oferta ativa | Uma confirmação transacional; não ultrapassar vagas nem consumir uma oferta duas vezes |
| Cancelar inscrição | Identificador e confirmação da pessoa | Titular, situação atual e horário de início | Registrar cancelamento e liberar vaga conforme regra; não aplicar sanção automática ao tardio |

Nenhuma dessas operações deve receber como verdade pontos, presenças, papel atual, `is_admin`, responsável ou identidade enviados pelo navegador. Os módulos são validadores de domínio; não são substitutos de autorização, políticas de acesso ou transações.

## Persistência a preparar após a inspeção real

Reutilizar `members`, `point_events`, `checkins`, `registrations` e `editions` quando adequado. Considerar entidades separadas para versões de regras/avisos, evidências de escolhas, ciclos, ofertas/aceites de função, revisões administrativas e ofertas de espera. Histórico de movimentos e de escolhas deve preservar autoria, origem e versão; não sobrescrever o passado para simular reinício de ciclo.

Definir retenção e acesso conforme a revisão jurídica. O materializador não significa que todos os eventos devam ser guardados indefinidamente. O conteúdo integral de justificativas não deve circular em notificações ou listas públicas.

## Segurança e validação antes da ativação

- Autorização e identidade verificadas no servidor em todas as operações; testar tentativa de acessar outro membro e tentativa de alterar permissões pela própria requisição.
- Dados expostos pela Rede filtrados na origem, com revogação efetiva. Testar saída, retorno, canais específicos e observadores sem acesso.
- Capacidade e oferta travadas na transação; conferir concorrência, repetição de aceite, vencimento exato e falha de notificação.
- Aceite vinculado ao titular, papel e versão correta, sem reuso para outra função. Decisão administrativa e aceite não são uma promoção por si sós.
- Conector não recebe moderação; Embaixador não recebe poder administrativo por mudança de título.
- Calendário de dias úteis com fonte e versão validadas. Não foi incluída lista presumida de feriados.
- Justificativas/reconsideração, pausa de até 90 dias e histórico Fundador ainda precisam dos seus fluxos persistentes. Não estão prontos para ativação.

## Execução local

Na raiz do projeto, com Node compatível:

`node --test preparacao-v20/tests/*.test.mjs`

Para gerar a prévia interna com as dependências já instaladas do projeto:

`node preparacao-v20/gerar-previa.mjs caminho-da-previa.html`

Integração em produção, migração SQL real, minutas jurídicas finais e publicação não fazem parte desta entrega. As próximas tarefas continuam sob responsabilidade da IA, respeitando as decisões de Patrícia.
