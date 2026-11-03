# Participação, adesão e retorno do check-in — preparação v21

02/11/2026. Módulo isolado, sem importação pelo aplicativo, sem banco, autenticação, reservas ou gravação. Consultas calculam propostas a partir de dados que o servidor futuro deve obter e autorizar. Nunca aceitar esses contextos como verdade enviados pelo navegador.

## Comportamentos preparados

- Presença como Visitante é distinta de adesão voluntária como Membro.
- Apenas check-ins validados como Visitante em encontros abertos consomem as duas visitas. Repetição da mesma edição não duplica; oficina/experiência não consome esse limite. Histórico incompleto impede decidir.
- A terceira visita em outra edição solicita adesão gratuita, sem criar Membro nem cobrança automaticamente. Atividades especiais remetem às condições próprias.
- Escolha de adesão exige versão dos termos e referência à apresentação. Isso não prova por si só o aceite real: a integração deve persistir a escolha do titular e sua evidência. Recusa de adesão não é aceite implícito.
- Crédito proposto de presença: +10 somente para presença elegível validada como Membro, com adesão comprovada anterior ou simultânea ao fato e origem ainda não creditada. Não converte visita anterior em pontos por adesão posterior.
- Indicação com presença correspondente propõe +5, sem gravação automática. Sem comparecimento, sem crédito. Origem por convidado/edição evita segunda atribuição a outro indicador. A identificação de pessoa é distinta da identificação de membro; comparar pessoas para impedir autoindicação.
- Cota padrão de um convidado por edição, configurável, sem reservar vaga. `ocupaCota` deve ser determinado no servidor segundo a regra aprovada. O efeito de cancelamento/recusa na liberação da cota NÃO foi presumido; entradas sem essa classificação são rejeitadas. A transação real ainda precisa serializar solicitações concorrentes.

O cálculo de créditos é candidato à gravação: a unicidade no banco e a validação da organização continuam obrigatórias. Nenhum lançamento antigo é recalculado, excluído ou migrado por estes módulos. Não usar a função para conceder pontos de oficina/experiência sem regra específica aprovada.

## Contrato para a integração da outra IA

1. Identidade obtida pela sessão e vínculo Pessoa/Membro verificado no banco. Não usar e-mail ou IDs do corpo da requisição como autorização.
2. Adesão com `pessoaId`, `membroId`, `evidenciaId`, `ativa` booleano e `aderiuEm` com fuso; `null` significa ausência comprovada de adesão, não falha de consulta. Não preencher com `members.created_at` sem evidência.
3. Presença com origem `checkinId`, `edicaoId`, `pessoaId`, `validada` booleano, `papelNaPresenca`, `tipoAtividade` e `ocorreuEm`. O papel é o do momento do fato, não a categoria atual.
4. Histórico completo autorizado do titular; separar por atividade. Conferir a classificação dos registros legados, sem presumir que todo `convidado` era Visitante ou que todo check-in atual teve adesão voluntária.
5. Gravação de presença, crédito e vínculo de indicação na mesma transação; trava de cota/capacidade e restrições únicas independentes do cliente. Repetição deve retornar o resultado persistido.
6. Contexto de indicador ativo vem do servidor e não é substituto de sessão/autorização. Resolver disputa entre indicadores administrativamente; não pontuar ambos.
7. Testar o fluxo antigo e clientes com páginas abertas antes da implantação. Preparação não garante compatibilidade com funções remotas ainda não lidas.

## Tela final já preparada

`src/pages/checkinCredito.ts` é usado por `Checkin.tsx`. Mantém compatibilidade com a resposta antiga: se não houver crédito explícito, apenas não anuncia pontos. Não altera as chamadas de cadastro/presença nem o QR existente.

Novo campo opcional de resposta, a ser produzido pelo servidor APÓS a gravação confirmada:

```json
{"credito":{"situacao":"registrado","pontos":10,"movimento_id":"identificador-real-do-lancamento"}}
```

Para Visitante, atividade sem crédito definido ou falha de crédito, não enviar esse comprovante. Não fabricar `movimento_id`. A tela também suprime a mensagem para papéis fora do programa e valida valor inteiro positivo. Check-in repetido mantém aviso de presença já registrada. Não promete crachá físico por apenas concluir o fluxo.

## Testes

`node --test preparacao-v21/tests/*.test.mjs`: 24 testes de domínio aprovados.

`node tests/v21/checkin-credito.cjs`: 14 verificações do adaptador da tela, com esbuild já instalado pelo projeto. Sem React extra, serviços ou dados reais.

Integração real, migração, escolhas efetivamente persistidas, fluxo completo de Visitante e publicação permanecem na fila de acesso em `docs/FILA_IA_COM_ACESSO_03-11.md`.
