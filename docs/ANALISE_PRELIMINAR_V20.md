> Continuidade consolidada em HANDOFF.md. Este arquivo é referência complementar e pode descrever uma etapa anterior; o estado atual está no HANDOFF único.

# ComuniCALI — análise preliminar da v20

02/11/2026. Análise funcional para preparar uma fase posterior. Não constitui política publicada, minuta jurídica final ou autorização para implantação.

Foi analisada a cópia anexada de `CommuniCALI_Documento_Mestre_v20_Orientacoes_Juridicas.docx`, integralmente, com 440 parágrafos não vazios. SHA-256: `127a004d26a9e351540cea62bb76c0cd4a357aa90ef7443f9c525d6862c130f0`. A análise se refere a essa cópia; não verifica uma edição posterior no Drive. O documento original e sua cópia anexada não foram modificados.

Comparação com o código local da última publicação deste chat: `dpl_BKcpNVGD7dVea62MiFakvSN9dhGf`. Sem auditoria do schema ou dos dados reais do Supabase. O projeto ComuniCALI não estava disponível na conexão utilizada neste trabalho. A ausência de uma implementação no código fornecido não prova ausência no banco real.

## Encaminhamento

O documento muda fluxos e responsabilidades, além dos textos. A seção 33 consolida as decisões operacionais; a seção 34 é composta por minutas e orientações de integração jurídica. Não copiar o documento inteiro para o site nem ativar suas propostas como se fossem decisões definitivas.

Patrícia pediu concluir os refinamentos em andamento antes desta fase. Nesta leitura não houve implantação, migração, alteração de cadastro, nova autorização, recálculo de pontos ou publicação de política.

## Situação das decisões

| Tema | Como tratar nesta fase |
| --- | --- |
| Consolidação operacional da seção 33 | Base para especificar as mudanças futuras, respeitando instruções posteriores da Patrícia e a transição dos dados atuais. Não equivale a função já implantada. |
| Seções históricas incompatíveis | Manter como rastreabilidade do documento; não usar como regra executável. Há trechos que ainda chamam decisões posteriores de pendentes. |
| Termos, convivência, imagem e cancelamentos pagos da seção 34 | Minutas para comparação e revisão. Não publicar automaticamente. |
| Preços sugeridos de reposição | R$ 15, R$ 20 e R$ 8 são sugestões internas, não tabela aprovada para cobrança. |
| Assinatura, mensalidade e kit completo | Oferta futura, sem ativação de cobrança ou promessa de entrega. R$ 189 não é preço vigente. |
| Retenção de justificativas, recursos e registros | Exige decisão específica e revisão jurídica; não preencher com prazo presumido. |
| Nome da marca | O documento mantém a grafia histórica com dois Ms; Patrícia corrigiu explicitamente neste chat para ComuniCALI, com um M. Preservar essa instrução nos novos textos. Não renomear identificadores técnicos por consequência automática. |

## Mapa de impacto no aplicativo

| Área | O que o código fornecido já tem | O que precisa ser preparado para a v20 |
| --- | --- | --- |
| Cadastro, visitante e check-in | Membros, convidados, inscrições e presença; o fluxo de confirmação fala em confirmar presença e cadastro de membro juntos. | Separar visita, inscrição, presença e adesão voluntária. Contar apenas visitas presenciais elegíveis; impedir adesão automática ao programa por simples presença. Definir a vinculação segura de históricos. |
| Rede e contatos | `na_rede`, opção para sair no perfil e barreira por categoria no servidor; a ficha autorizada inclui vários contatos em conjunto. | Escolha voluntária e controle granular dos dados visíveis e dos canais compartilhados, com revogação efetiva nas respostas do servidor. Não inferir uma autorização nova a partir de um aceite antigo. |
| Comunicações e imagem | Perguntas distintas e campos de autorização já existem em fluxos de formulário/check-in. | Distinguir aviso operacional de marketing, esclarecer finalidades/canais e registrar escolhas e versões. Verificar todos os caminhos de entrada, atualização e retirada, incluindo responsáveis por crianças. Não recomeçar esses módulos sem aproveitar o que existe. |
| Programa e pontos | Extrato por eventos, selos e categorias; ainda há números e ações da regra anterior em telas e código. | Saldo de ciclo separado do histórico, data efetiva de adesão, avaliação e aceite de função, revalidação, pausa e saída. Não zerar movimentos históricos nem converter categorias automaticamente. |
| Reconhecimento inaugural | Categoria Fundadora de Patrícia/organização e selos das edições. | Membro Fundador deve ser reconhecimento histórico adicional, baseado em presença elegível, separado do papel Fundadora, da categoria e de assinatura. |
| Inscrição e vagas | Situações de análise, inscrito, espera e cancelado; confirmação administrativa existente. | Janelas de inscrição, capacidade transacional, oferta temporária de espera, aceite/recusa/expiração e notificações verificáveis. Não confirmar acima da capacidade nem presumir leitura de mensagem enviada. |
| Indicações | Indicação de visitante e atribuição por código; verificações de duplicidade e autoindicação no SQL fornecido. | Auditar também a cota por membro/edição em todos os caminhos, inclusive link de convite e indicação direta. Não assumir que uma proteção em uma função cobre todas as outras. |
| Ausência, justificativa e recurso | Não identificado o fluxo completo especificado pela v20 no código analisado. | Área restrita com protocolo, prazos no servidor, revisão humana e uma reconsideração; sem solicitar atestado ou diagnóstico por padrão. Decisões administrativas não são conteúdo público. |
| Papéis e moderação | Controle administrativo existente; categoria também condiciona alguns acessos à Rede. | Não transformar Conector em moderador nem Embaixador em administrador. Autorizações sensíveis precisam de escopo explícito e revogável. Matriz de medidas e sanções ainda deve ser submetida à Patrícia. |
| Benefícios e comentários preparados | Interfaces e SQLs de ativação ainda pendentes de aplicação no projeto correto. | Reavaliar os rascunhos antes da ativação: público elegível, visibilidade de contatos, nome do autor do feedback, retirada do diretório, moderação, auditoria e retenção. Exemplos fictícios não são ofertas reais. |

## Cuidados de transição que o texto não resolve sozinho

1. **Data de adesão:** não assumir que `created_at` é a data de adesão voluntária. Visitantes ou inscrições antigas podem ter sido registrados antes desse momento. Preparar regra de migração com origem verificável e exceções documentadas.
2. **Pontos existentes:** o código tem ações como recomendação validada e palestra com valores próprios. O documento consolida outra organização de contribuições. Mapear equivalências e vigência; não reclassificar nem reduzir lançamentos antigos silenciosamente.
3. **Contagem de presenças:** separar histórico total, presenças consideradas para entrada no papel e presenças para revalidação. Explicitar qual período se aplica a cada critério antes de programar.
4. **Três relógios distintos:** ciclo individual de pontos; janela móvel de 12 meses para reincidência; prazo de 12 meses como Conector. Não reutilizar um único contador para essas condições.
5. **Períodos e calendário:** 48 horas para prioridade e 6 horas para oferta são padrões configuráveis; cancelamento até 24 horas antes, justificativa em 7 dias corridos e resposta em 7 dias úteis têm marcos e efeitos diferentes. Considerar fuso, calendário versionado e confirmação de ciência para recurso.
6. **Falta e cancelamento tardio:** não classificar automaticamente todo cancelamento tardio como ausência sem aviso. O documento deixa sua eventual consequência específica sem aprovação. A restrição prevista afeta a prioridade de um encontro elegível, não a condição de Membro nem o saldo histórico.
7. **Autorizações antigas:** conhecer a evidência e o texto efetivamente apresentados na época. Um booleano atual não demonstra por si só finalidade, versão e alcance de uma nova autorização.
8. **Dados sensíveis espontâneos:** campo livre de justificativa pode receber informações que não foram pedidas. Limitar acesso, evitar reproduzir o texto em notificações e prever tratamento e retenção após revisão adequada.
9. **Responsabilidade editorial:** não escrever que uma função já existe porque foi aprovada no documento. A copy deve acompanhar o que foi implementado e testado.

## Política de privacidade: fonte identificada, comparação ainda pendente

A rota `/privacidade` usa `TextoPagina` em `src/pages/Cadastro.tsx`. O conteúdo vem de `site_settings.privacidade_texto`, consultado por `useSiteTexts()` em `src/pages/MemberFields.tsx`. Há textos históricos nas migrações e editor administrativo; eles não confirmam o conteúdo atualmente publicado.

A tentativa de leitura pública por ferramenta de consulta não recuperou o texto da página. Não houve leitura autenticada do banco real nesta análise. Portanto, a comparação cláusula a cláusula NÃO está concluída e não se pode afirmar que a política atual esteja ausente ou que determinado tema não seja coberto por ela.

Antes de redigir mudanças, guardar a versão publicada, data, controlador, contatos e textos efetivamente mostrados nos formulários. Montar o quadro:

| Texto atual verificável | Lacuna em relação à prática prevista | Alteração proposta | Justificativa | Validação necessária |
| --- | --- | --- | --- | --- |
| Pendente recuperar a fonte publicada | Não determinar por suposição | Não redigir substituição ainda | Preservar a política existente | Patrícia e revisão jurídica pertinente |

O levantamento deverá abranger cadastro, convites, inscrições, lista de espera, check-in, pontos, ciclos, aceites de função, avaliação, justificativas, diretório, contatos, imagem, crianças, fornecedores, direitos, exclusão e retenção. Diferenciar funções ativas, preparadas e futuras.

## Ordem recomendada para a próxima fase

1. Encerrar a revisão visual pendente e registrar as aprovações de Patrícia.
2. Congelar o mapa das decisões, recuperar a política publicada e conferir o schema real no projeto ComuniCALI, com acesso correto.
3. Desenhar os fluxos de dados e escolhas de cada pessoa, permissões, consentimentos, versões, notificações e regras de transição. Resolver ambiguidades antes de editar funções.
4. Preparar minutas separadas para os instrumentos necessários e comparar com o que já existe. Revisão da organização e jurídica antes da publicação dos textos pertinentes.
5. Implementar um fluxo por vez em ambiente de teste, com alterações aditivas e migração revisável. Não usar os inscritos reais como massa de teste.
6. Testar autorização e revogação, concorrência de vagas, prazos, repetição de requisições, preservação de histórico e coerência entre site, área do membro, painel e notificações.
7. Publicar de forma coordenada a função validada e os textos/aceites correspondentes, mantendo versão anterior, registro da mudança e plano de retorno. Não ativar cobrança ou sanção não aprovada.

## Voz da CALI aplicada à próxima fase

Lidos `CALI_RH_Guia_Voz_de_Marca.md` e a skill de conteúdo CALI. O guia é referência para voz; o conteúdo operacional confirmado e a revisão jurídica determinam o significado.

- Interface em linguagem neutra de produto, com verbos concretos. Primeira pessoa apenas onde a pessoa realmente assina ou compartilha algo, como seu convite.
- Cada texto tem uma função. Não repetir título, subtítulo, ajuda e aviso com sinônimos.
- Escolhas precisam explicar o efeito concreto, sem jargão de sistema e sem afirmar segurança absoluta ou benefício garantido.
- Mensagens delicadas informam o fato, a providência possível e o prazo confirmado. Sem alarmismo, bronca ou propaganda.
- Não alterar fatos aprovados só para tornar o texto mais elegante. Não prometer uma ação que o aplicativo ainda não oferece.
- Exemplos de direção editorial, ainda sem publicação: “Escolha quais contatos aparecem no seu perfil.”; “Sua justificativa foi enviada. Acompanhe a análise em Meus encontros.” O segundo só deve ser usado quando houver envio persistente e acompanhamento real.

## Registro desta análise

Patrícia aprovou o visual de empresas parceiras e do cupom. Essa aprovação visual não transforma descontos fictícios em ofertas e não aprova automaticamente novas regras de privacidade ou as minutas da seção 34.

O documento Word, o original associado no Drive, os dados reais, o banco, os textos publicados e o código executável permaneceram inalterados. A alteração local limita-se à documentação de análise e continuidade. Nenhum deploy nesta tarefa.
