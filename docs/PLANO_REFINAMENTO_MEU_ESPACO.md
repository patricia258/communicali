# Refinamento do Meu espaço — ordem de execução

Pedido de Patrícia: melhorar acabamento visual por etapas, preservando a experiência de celular também no navegador. Não reconstruir o aplicativo. Cartela: bordo #5A1E2D, vinho #7A1F3D, marfim #F7F0EA e mostarda #DDB160; Funnel Display e Inter.

## Limites aprovados

- Não alterar carimbos, pontuação, selos do Programa ou regras de promoção já aprovadas.
- Não ampliar acesso à Rede ou contatos. Manter autorização no servidor.
- Não alterar dados dos inscritos, demonstração ou inscrições nesta tarefa.
- Mensalidade e clube em 2027 são planejamento futuro; não implementar cobrança agora.
- Registrar mudanças no HANDOFF.md e entregar os arquivos completos alterados para continuidade com Claude.
- Versões anteriores ficam apenas no histórico da hospedagem, nunca como interface duplicada por trás da atual.

## 1. Início: identidade e ações

- [x] Saudação com nome completo, sem repetir o nome no cartão.
- [x] Cartão bordô da marca, foto, nível e código mantidos.
- [x] Editar perfil por lápis com nome acessível e área de toque de 44 px.
- [x] Compartilhar selo em botão; manter o compartilhamento existente.
- [x] Sininho à direita da saudação, ocupando o espaço com função real.
- [x] Manter carimbos e pontos sem alterações.
- [ ] Conferência visual pela Patrícia no passaporte autenticado e em celular real.

## 2. Alertas

- [x] Sininho abre e fecha alertas; contador de não lidos, estado vazio e carregamento.
- [x] Alertas com prévia e destaque do nome; destaque de “serviços da CALI” quando for o texto disponível.
- [x] “Ver no painel” mantém o destino administrativo e a condição atual de Fundadora; não é uma tela administrativa dentro do passaporte.
- [x] Manter “Ver perfil” para os convites que já permitem retorno.
- [x] Marcar como lido usa a função existente, mostra falha e não esconde erro.
- [ ] Serviço específico do match: a resposta atual só traz texto genérico, sem nome do serviço. Enriquecer no servidor em etapa própria antes de afirmar que o serviço está disponível na prévia. Não deduzir a partir de interesses nem inventar esse dado.
- [ ] Validar leitura de alerta e acesso ao painel com sessão real, sem disparar notificações de teste para membros.

## 3. Edições / agenda

- [x] Título acompanhado de ícone de calendário.
- [x] Etiqueta no canto superior direito: Encerrado (vermelho) em datas anteriores, Inscrições abertas quando o campo estiver ativo e o encontro for atual/futuro, Previsto nos demais atuais/futuros. Sem criar estado manual de reserva ou confirmação.
- [x] Próximos encontros em ordem crescente de data; anteriores em ordem decrescente, sem depender da ordem recebida do banco.
- [x] Agenda reúne edições públicas e encontros já autorizados no passaporte, sem duplicar o mesmo slug.
- [x] “Ver o encontro” expande o resumo no cartão, com parágrafos, links HTTP/HTTPS clicáveis e acesso às fotos quando disponíveis.
- [x] Campo e editor existentes conferidos no código: painel Edições, “Resumo do encontro” e “Link para baixar as fotos”. Nenhuma alteração no painel ou banco.
- [x] Resumos ausentes têm aviso explícito. Falha na leitura mantém os encontros já carregados e oferece nova tentativa.
- [x] Proposta de categorias registrada abaixo, sem aplicá-las como decisão aprovada.
- [ ] Patrícia definir a lista de categorias; cadastro/filtro por categoria não foi implementado nesta etapa.
- [ ] Conferir visual e abertura dos resumos com sessão real no celular. A consulta direta de teste ao banco público expirou no ambiente de revisão; consultas e estados foram testados com resposta simulada.

### Categorias propostas, ainda sem aprovação

| Campo | Proposta inicial | Uso |
| --- | --- | --- |
| Tipo de encontro | Networking; Conexões | Descrever a dinâmica do encontro |
| Público | Empresários; Profissionais de RH; Profissionais em recolocação | Indicar a quem a edição se dirige; pode haver mais de um |

Os dois campos evitam misturar formato e público numa única lista. Nenhuma categoria foi atribuída a encontros existentes. A lista e a regra de seleção continuam pendentes da definição de Patrícia.

### Como alimentar o resumo

No painel, abrir Edições, escolher o encontro e preencher “Resumo do encontro”. Separar os parágrafos com uma linha em branco. URLs completas com http:// ou https:// no texto ficam clicáveis; o link da pasta de fotos usa o campo já existente “Link para baixar as fotos”. Não é um editor de HTML. O aplicativo consulta somente edições marcadas para mostrar no site; encontros privados já autorizados pelo passaporte mantêm os dados que esse passaporte fornece, sem acesso adicional a conteúdo privado.

## 4. Missões

- [x] Ícone de alvo no título, introdução curta e explicação da liberação sob expansão.
- [x] Cartões neutros da mesma cor; status e bloqueio em etiquetas separadas no canto superior direito.
- [x] Bloqueios mostram os requisitos atuais de Conector (100 pontos, 3 encontros, 2 missões e confirmação da organização), com atalho ao Programa.
- [x] Dinâmica conferida: liberação por categoria e condições de envio mantidas. Pontos sozinhos não liberam missões nem promovem a pessoa.
- [x] Correção solicitada por Patrícia: selos continuam ilustrados, agora com apresentação circular e borda de selo. Usa as ilustrações originais dos PNGs existentes em uma composição SVG; nenhum ícone substitui a arte. Arquivos originais e selos do Programa não foram alterados.
- [x] Prévia aprovada por Patrícia. Fundadora pode escolher em Missões: Minhas missões, Prévia: Membro ou Prévia: Conector. A prévia mostra Disponível/Bloqueada/Por convite, mantém conquistas reais e desativa envios.
- [ ] Definir novos limites de pontos para liberação, caso Patrícia deseje mudar a regra existente. Não há quantidade nova aprovada para implementar.
- [ ] Conferir visual, toque e envio com sessão real no celular. Os testes de interação foram feitos com dados e RPC simulados, sem enviar missões de teste para a organização.

## 5. Rede / pessoas e perfis

- [x] Ícone de pessoas no título, inclusive na visualização bloqueada.
- [x] Celular aprovado por Patrícia: controles de pelo menos 44 px e fonte de entrada de 16 px, mantidos. No computador com mouse/hover e largura a partir de 761 px, campos de 36 px, texto de 14 px e espaçamento menor, conforme pedido de refinamento da web.
- [x] Etiqueta do segmento sobre a foto, no canto inferior esquerdo; sem repetição abaixo.
- [x] Função, o que faz, busca e interesses do perfil preservados.
- [x] WhatsApp, e-mail, Instagram e LinkedIn por ícones, somente se preenchidos e autorizados pelo fluxo existente. Links com nomes acessíveis e área de toque de 44 px.
- [x] Rede bloqueada e permissões mantidas; nenhuma nova consulta ou mudança no servidor.
- [ ] Conferir busca, filtros, posicionamento da etiqueta e ícones de contato com sessão real em celular. Testes de componente usam dados sintéticos e RPC simulada.

## 6. Parceiros, prestadores e comentários

Modelos solicitados em 02/11: dois perfis fictícios completos, locais e sem banco, disponíveis na visão Fundadora por botão próprio. Contatos e cópia desativados, ofertas ilustrativas explicitamente sinalizadas. HTML autônomo de prévia entregue junto ao repasse.


Complemento solicitado em 02/11: contatos por ícones; preparar benefício, desconto, detalhes/validade e cupom copiável abaixo do perfil da empresa. Editor e apresentação implementados, sem atribuir ofertas a empresas. Ativação depende de docs/sql/ajuste_beneficios_parceiros.sql após SQL da etapa 6; ambos continuam não aplicados.


- [x] Interface separa Empresas parceiras e Prestadores da comunidade, com contagem e descrição de cada grupo. Busca por nome/descrição da empresa; demais filtros aplicam-se aos prestadores.
- [x] Logos brancos existentes visíveis em fundo bordô; imagem com erro mostra inicial. Site existente aparece quando cadastrado.
- [x] Preparado cadastro separado do logo original, descrição e contatos no painel; versão branca do site preservada. Módulo só aparece após ativação das novas tabelas.
- [ ] Ativar banco CommuniCALI e enviar os logos originais. O upload antigo só guardava a versão branca; não há recuperação automática de cores. Depois de cadastrar a empresa, enviar o original em Perfis das empresas.
- [x] Decisão de Patrícia: comentário com 1 a 5 estrelas, nome do autor e sem foto; publicação somente após aprovação da CALI.
- [x] Preparados comentários, edição com nova aprovação, fila administrativa, motivo para não publicar, registro de decisões e proteção contra aprovação de texto alterado simultaneamente.
- [x] SQL revisado/testado em banco PostgreSQL isolado, com dados sintéticos. Não altera tabelas/funções antigas. Arquivo: docs/sql/etapa_6_parceiros_feedback.sql.
- [ ] Aplicar SQL somente no projeto cyyrrtekbkltdiatixhp após conferir schema e acesso. O projeto não está disponível na conexão atual. Comentários e novos campos NÃO estão ativos em produção.
- [ ] Validar cadastro, armazenamento, RPC, revisão e exibição com sessão real após ativação. Nesta etapa, testes de componentes e banco isolado não substituem essa validação.

## 7. Indicar

Correção solicitada em 02/11: convite em primeira pessoa, ComuniCALI com um M nos textos novos, bilhete e assinatura “Toda honra a Deus!” no rodapé. Não repetir nome em terceira pessoa. Lista Minhas indicações aprovada e preservada.


- [x] Visitantes, parceiros e lugares preservados; título com ícone e histórico de visitantes em ordem decrescente de data, sem alterar a lista recebida.
- [x] Código salvo destacado; copiar convite e WhatsApp preservam endereço /c/codigo e atribuição. Texto usa “convite”, sem prometer desconto.
- [x] Cartão PNG 1080×1350 com logo original, primeiro nome, código, QR e aviso de aprovação da inscrição; prévia, download e compartilhamento nativo quando suportado. Usa somente código salvo, mesmo durante uma edição não salva.
- [x] Imagem renderizada/inspecionada localmente; QR decodificado no PNG e destino confirmado. Falha de cópia mostra link; falha de imagem permite tentar novamente.
- [x] Unicidade já existente conferida no schema fornecido: índice UNIQUE em members.codigo. Rascunho de nova função trata colisão e serializa alterações do mesmo membro.
- [x] Preparado limite de duas alterações no servidor, com configuração de quantas restam e proteção também para a função usada por versões antigas. Salvar o mesmo código não consome nova alteração.
- [ ] Ativar docs/sql/etapa_7_limite_convite.sql somente no projeto cyyrrtekbkltdiatixhp após conferir schema. Sem acesso ao projeto, não foi aplicado. Personalização fica indisponível na interface até haver a regra no servidor; copiar, WhatsApp e cartão usam o código atual.
- [ ] Conferir ativação com sessão real. Contador começa em zero nessa ativação: histórico de trocas anterior não está disponível. Cada troca de código já atribuído consome uma alteração, inclusive primeira personalização a partir do código sugerido.
- [x] Aviso ao salvar: trocar código invalida links/cartões anteriores no fluxo existente; gerar novamente após alteração. Não foram criados aliases nem reserva de códigos antigos.
- [x] Pontuação por presença efetiva, avaliação da equipe, indicações/recomendações, e-mails e histórico preservados.
- [ ] Conferir fluxo autenticado, download, compartilhamento e leitura pela câmera em celular real. Os testes atuais usam componentes/RPC simulados e PostgreSQL isolado, sem gravar dados remotos.

## 8. Programa

- [x] Ícone no título; papel atual em destaque bordô; trilha vertical numerada diferente de Missões.
- [x] Próxima etapa destacada, sem cálculo de promoção ou promessa automática; Fundadora e papéis especiais fora dos quatro degraus.
- [x] Selos postais PNG aprovados preservados integralmente; pontuação, histórico e ações existentes intactos.
- [x] Leitura do documento mestre v19 identificou revisão dos requisitos/ciclo/aceite/revalidação ainda não implementada no app. Nova trilha informa requisitos em atualização; não divulga limiares anteriores nem ativa os novos só no texto.
- [ ] Implementar regras v19 de modo consistente em servidor, Início, Programa, aceites e revisão administrativa. Fora do escopo deste refinamento; exige acesso correto e validação de dados. Não recalcular nem promover silenciosamente.
- [ ] Conferir aparência e navegação com sessão autenticada/celular real. Testes atuais usam respostas e membros sintéticos.

## Verificação e continuidade

Concluir cada bloco com build, conferência das interações afetadas e registro do que foi e não foi validado. Não marcar como concluída uma integração que depende de SQL ainda não aplicado. Não misturar estas etapas com reformulação do painel administrativo ou outras empresas.

## Revisão de refinamento após a sequência

- [ ] Depois de atender os pedidos das oito etapas, fazer a revisão visual de conjunto solicitada por Patrícia: espaçamento, hierarquia, tipografia, densidade e consistência entre telas. Preservar decisões e elementos aprovados. Não substituir selos por ícones nem interpretar refinamento como reconstrução.

### Referência adicional para selos, 01/11/2026

Patrícia enviou modelos de selo redondo e, em 02/11/2026, aprovou os três tipos alternados. Aplicação: Convidou/Palestrou ondulados; Conectou/Aproximou serrilhados; Recomendou/Representou com faixa. Contornos em SVG na cartela CommuniCALI, mantendo as ilustrações dos PNGs originais. Estilo fixo por missão, preservado ao trocar entre prévia e conta real. Prévia de missões disponíveis aprovada e mantida.
