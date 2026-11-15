# Repasse CommuniCALI

Documento único de continuidade entre as IAs que trabalham com Patrícia Lima. Leia inteiro antes de mudar qualquer coisa. Atualizado em 02/11/2026.

## Regras de trabalho

1. Toda mudança precisa de pedido de Patrícia. Faça só o que foi pedido, sem refazer o que já está aprovado.
2. O que está na lista "Decisões aprovadas" não muda sem pedido explícito dela. Em dúvida, pergunte antes.
3. Antes de começar, leia este arquivo e o "Registro de mudanças". Ao terminar, acrescente uma entrada com data, autor, o que mudou, o que foi testado e o que ficou pendente.

### 2026-11-13 | Check-in como Visitante, e-mails do dia do encontro e correções (publicado)
- Check-in: a tela de presença mostra só Nome e "Status: Visitante" (sem categoria, sem milhas, sem lembrete de devolver o crachá: neste encontro todos ficam com o crachá). E-mail que não está na lista vê "Procure a organização na recepção" em vez do cadastro de 13 perguntas (`step 'recepcao'` em `Checkin.tsx`). Membro já cadastrado continua entrando por código no e-mail.
- Recepção no link do apoio: aba "Recepção" em `/apoio/:token` (`?aba=recepcao`) com os confirmados (nome, categoria, e-mail), busca sem acento, "Chegou" que marca no celular e contagem; atualiza a cada 5 s. Quem não aparece na busca vê "Não está na lista" e o QR do check-in. Migração `20261113100000_apoio_recepcao.sql` (`communicali_apoio_lista`, `communicali_apoio_chegada`; colunas `chegou_em` em `registrations` e `guests`). Chegada pela recepção grava `chegou_em` na origem; chegada pelo QR continua em `checkins`, e a lista mostra a mais antiga das duas.
- IDENTIDADE NOVA CANCELADA PARA O EVENTO (13/11): o agendamento das 14h de 14/11 foi removido (arquivos em `~/CALI/agendamento-cancelado/`). Tudo segue na identidade atual até a Patrícia falar depois do evento. Única exceção liberada: selos das categorias.
- Selos no fim do check-in: Visitante (participantes) e Convidado, com o selo novo (`public/selos/postal-convidado.png` e `postal-membro.png` trocados, 400x500). Lista da recepção: "Visitante / Membro" (cor bordô), Convidado (amarelo), Kids (verde). O check-in pelo QR é obrigatório para todos; "Chegou" é só da lista da recepção.
- Pesquisa em duas partes (migração `20261113130000_pesquisa_anonima_e_continuar.sql`): `pesquisa-1a-edicao` agora é anônima (sem nome, depoimento, citação e imagem) e a tela final tem um botão para `/f/continuar-com-a-comunidade` em nova aba (linha final `[texto](/f/slug)` no `success_text` vira botão em `PublicFormPage.tsx`). O formulário identificado tem perguntas condicionais (convidado x visitante/membro), interesse em saber os próximos passos, e-mail novo opcional, depoimento, citação com nome e autorização de imagem, com o texto explicando que a categoria do crachá mudou.
- Pesquisa e "Continue com a gente" (revisado 13/11): a tela final da pesquisa anônima tem destaques (negrito/itálico por `**`/`*` no `success_text`) e leva a `/continuar` (`src/pages/Continuar.tsx`): a pessoa informa o e-mail da inscrição, `communicali_continuar_dados` reconhece nome, tipo (Convidado ou Visitante / Membro) e quem convidou, mostra o que a comunidade oferece (com asterisco de encontros exclusivos e taxa) e envia o pedido para o formulário `continuar-com-a-comunidade` (nome, e-mail, tipo, quem convidou, e-mail novo opcional). Quando a identidade nova entrar: trocar a folhinha (carvalho) da tela final dos formulários por um selo.
- Pesquisa de satisfação ÚNICA para todas as edições (migração `20261113150000_pesquisa_unica_todas_edicoes.sql`): slug `pesquisa-de-satisfacao` (antes `pesquisa-1a-edicao`), primeira pergunta "De qual encontro você participou?" (acrescentar a opção de cada edição nova no painel de Formulários), dinâmica, conteúdo e debate em perguntas separadas, sem a pergunta de formatos. Abertura curta com destaques. `editions.form_pesquisa` aponta para ela.
- REGRA PARA TODOS OS FORMULÁRIOS (Patrícia, 13/11): texto em frases curtas, palavras-chave em **negrito**, *itálico* ou ==destaque== (novo, `mark.cf-hl`), cartão de destaque (`aviso`), sem parágrafos corridos. `/continuar` agora usa o mesmo formato dos formulários (passo a passo por `PublicFormPage` em modo preset, com `aviso` e descrição). A tela final dos formulários também aceita esses destaques e um botão `[texto](/caminho)`.
- `/continuar` mais atrativo (13/11): três telas de benefícios com foto (`imagem` na pergunta, `/fotos/home/*`), destaques em mostarda e um cartão "Saiba mais pelo nosso site" (`attachment` com `cta`) que abre comuni.calirh.com. O contador "N de M" não aparece mais nos formulários passo a passo (preset).
- Telão de votação (`/telao/resultado`) refeito (13/11): título "Sua opinião conta", um gráfico só com as duas séries juntas (Na opinião em mostarda, Na prática em marfim, por nota de 0 a 10), médias ao vivo na legenda e "Votaram N de M na sala" (`communicali_sala_numeros`: chegaram pelo QR ou pela recepção). Sem a distância e sem os textos das perguntas.
- Telão de votação, ajuste: é a ÚNICA tela da votação (não há tela de resultado separada), então a legenda mostra as duas perguntas abreviadas (`curta()` em `Telao.tsx`, tira "De 0 a 10, quanto você acredita/percebe que") com a média de cada série; título "Votação ao vivo" com ponto pulsante.
- Telão da dinâmica (`/telao/dinamica`): saiu a frase "Cuidar de pessoas ainda é relevante?"; o cabeçalho é só "Dinâmica ao vivo" com ponto pulsante (`TEMA` em `Mural.ts`, vale também para a imagem exportada do mural).
- Telão da dinâmica: cada quadro mostra o total de palavras (`.dn-total`); quem tem mais pisca (`.dn-lidera`): Barreiras em vermelho (alerta), Caminhos em verde. Empate não pisca. Conta todas as respostas (repetidas contam), sem as removidas pela moderação.
- PASSAPORTE TRANCADO (decisão da Patrícia, 13/11): ninguém entra no passaporte até a liberação, prevista para quinta-feira 19/11. Só fundadora e organizador (categorias) veem. Chave: `site_settings.passaporte_aberto` (padrão false; migração `20261113110000_passaporte_trancado.sql`, `communicali_meu_espaco` devolve `em_breve`). Para liberar: `update public.site_settings set passaporte_aberto = true;`. Isso também fecha o passaporte dos 12 membros antigos (membro, conector, embaixador). Mensagem na tela: "O passaporte ainda não está disponível".
- Painel Início: o cartão "Membros" passou a se chamar "Visitantes" (mesma contagem de `members`). Recepção do apoio: lista colorida (Kids verde, Participante / Membro bordô, Convidado amarelo).
- PENDENTE depois do evento: e-mail pós-encontro perguntando se a pessoa quer fazer parte oficialmente da comunidade (explicar a fase Visitante e a adesão gratuita como Membro; texto e regras ainda a definir com a Patrícia). Quem usa Outlook/Hotmail ficou com e-mails atrasados no dia 13/11 (instabilidade da Microsoft): conferir entregas e reenviar.
- Pendente de decisão: o check-in ainda cria uma linha em `members` (`communicali_novo_membro`, categoria padrão `membro`). Mudar para uma categoria Visitante mexe em 19 funções e 14 telas; deixado como está até depois do evento.
- E-mails: modelo `consumo` (lembrete de consumação mínima, enviado 12/11 às 19h53 manualmente aos 29 confirmados, tipo liberado em `email_log`), reenvio de um e-mail por pessoa no painel (`reenviar_um`), e-mail automático ao entrar na lista de espera (`api/email-confirmacao.js` com `form`). Cron `email-lembretes` ganhou o bloco da consumação (data 12/11). Limite do plano Hobby: 12 funções, não criar arquivos novos em `api/`.
- comuni@calirh.com virou caixa real (alias criado pela Patrícia), para as respostas aos e-mails não voltarem.
- Pendente: identidade nova entra no ar sábado 14/11 às 14h por agendamento do Mac (`~/CALI/publicar-identidade-nova.sh`, `vercel promote` do deployment staged da branch logo-nova). Toda mudança na main precisa ser mesclada na logo-nova e re-staged.

### 2026-11-10 | Sala do convidado, equipe de apoio e telão único (publicado)
- Pedido da Patrícia: check-in cai direto na sala (`/sala`), com votação, palavras e pesquisa trancadas; a pessoa do apoio libera uma etapa por vez em `/apoio/:token` (link no painel, bloco "Sala do convidado e equipe de apoio"); o telão `/telao` acompanha sozinho a etapa liberada. Escolha de ser membro fora do check-in (fica para e-mail pós-evento).
- Migração `20261110110000_sala_apoio` (`dinamicas.etapa_sala`, `token_apoio`, RPCs `communicali_sala_estado`, `_apoio_estado`, `_apoio_definir`). Liberar votação abre a poll; palavras abre as duas perguntas e fecha a poll; pesquisa encerra as palavras. A poll `fundadora` ficou em rascunho até o apoio liberar.
- Check-in guarda a presença no aparelho e, sem kids/acompanhantes a confirmar, segue sozinho para a sala em 4,5 s; `/checkin` redireciona quem já fez (`?novo=1` registra outra pessoa).
- Testado: tsc e build. NÃO testado no navegador: fluxo da sala, do apoio e do telão único. Pendente: o fluxo de membro existente ainda pede código por e-mail no check-in (`communicali_situacao_email`); decidir se sai.

### 2026-11-10 | Dia do encontro: dinâmica ao vivo, telas no novo visual e pesquisa automática (publicado)
- Pedido da Patrícia: as duas perguntas abertas ao mesmo tempo, até 4 palavras por pessoa em cada uma, telas de votação, boas-vindas e check-in no mesmo visual, tudo fácil no painel da edição e pesquisa de satisfação enviada sozinha às 14h aos que fizeram check-in.
- Banco (migrações `20261110090000_dinamica_ao_vivo` e `20261110100000_pesquisa_satisfacao`, já aplicadas): tabelas `dinamicas` e `dinamica_respostas` (RLS só admin), RPCs públicas `communicali_dinamica_telao`, `_estado`, `_enviar` (limite de 4, agrupa por `communicali_dinamica_chave`), `email_log.tipo` aceita 'pesquisa', `editions.form_pesquisa` e `pesquisa_auto`, formulário `pesquisa-1a-edicao` (11 perguntas, tema claro) ligado à edição fundadora.
- Telas: `/telao/dinamica` (sonda a cada 2 s, tecla F = tela cheia), `/dinamica` (celular, QR), `/telao/checkin`, `/telao/resultado`, `/votar` e o cartão de embarque do `/checkin` refeitos em `src/dinamica/` + `dinamica.css`. Formulários com `tema: 'claro'` ou categoria 'Pesquisa' usam o visual claro.
- Painel: seção "Dia do encontro" no topo de `/admin/edicoes` (`DiaDoEncontro.tsx`, isolada por error boundary): telão de boas-vindas, votação, pesquisa (liga/desliga 14h, teste para mim, enviar agora, contagens) e `PainelDinamica` (abrir/encerrar cada pergunta, abrir as duas, modo, QR, congelar, moderar, planilha, imagem do mural, zerar).
- Pesquisa: `api/email-pesquisa.js` roda no cron `0 17 * * *` UTC (14h BRT), só para quem tem check-in na edição com `data_evento` de hoje e `pesquisa_auto`; `email-admin` ganhou `acao: 'pesquisa'` (teste/agora, uma vez por pessoa).
- Testado: tsc e build; telões e celular com banco real; painel por harness com banco falso. NÃO testado com sessão de admin real (criar usuário de teste foi bloqueado) nem o e-mail da pesquisa em produção. Dados de teste removidos; as duas perguntas ficam "aguardando".
- Pendente: Patrícia conferir "Dia do encontro" em /admin/edicoes; testar a pesquisa com "Enviar teste para mim"; logo nova entra no domingo 15/11 (branch `logo-nova`, pode conflitar com Telao/Votar/Checkin).

### 2026-11-10 | Prévia da dinâmica ao vivo (branch `dinamica`, não publicado)
- Pedido da Patrícia: dinâmica "Cuidar de pessoas ainda é relevante?" para o encontro de 14/11, com dois murais em tempo real (Barreiras em bordô, Caminhos em marfim), QR no canto do telão, celular sem login e painel da apresentadora. Antes de implementar, ela pediu uma demonstração funcional.
- Demonstração em `public/previa-dinamica/index.html` (HTML único, estado no navegador via localStorage; sincroniza entre janelas). Quatro vistas pelo hash: `#tudo`, `#participante`, `#telao`, `#painel`. Telão em unidades `cqw` (escala igual de prévia a tela cheia), palavras que entram uma por uma (aparecem grandes no centro, grudam no lugar, FLIP nas demais), tamanho proporcional à frequência, ajuste automático para caber, modo rápido quando chegam muitas de uma vez.
- Regra de agrupamento: só respostas iguais após tirar maiúsculas, acentos, pontuação e espaços repetidos. Sem agrupamento por sentido.
- Painel: abrir/encerrar cada etapa (abrir uma fecha a outra), mostrar os dois murais ou um só, QR visível/oculto, congelar para o debate (novas respostas esperam), tela cheia, janela própria, moderação com restaurar, exportar CSV e PNG 1920x1080 desenhado em canvas. Caixa "Só nesta demonstração" simula respostas; no evento os murais começam vazios.
- Participante: 30 caracteres, 3 respostas por etapa, intervalo de 3 s, bloqueio de links e contatos, campo escondido contra robô, sem pedir nome.
- Prévia protegida: https://communicali-5e6194ecv-cali11.vercel.app/previa-dinamica/ (QR de exemplo aponta para comuni.calirh.com/dinamica, rota que ainda não existe).
- Para implementar de verdade: tabelas de etapas e respostas no Supabase, inserção pública só pela função com limite por aparelho, leitura do telão por consulta a cada 2 s (como o telão da votação), painel dentro do admin existente.

### 2026-11-07 | Prévia: topo com a CALI RH, Primeira vez e formatos (branch logo-nova)
- Topo: logo da CALI RH (cali-rh-bordo.png, link para calirh.com), barra fina e a comunicali, como a marca-mãe e a extensão (referência: walljobs.ai/wally).
- "Primeira vez?" refeita em três passos numerados (cadastre seu interesse, entre no grupo com QR, faça o check-in), cartões da mesma altura e ações alinhadas embaixo; no celular, um embaixo do outro.
- "Sua próxima escala" (`Escalas` em Home.tsx): foto fixa à esquerda que troca conforme a lista de formatos passa à direita, com etiqueta; no celular, foto em cada item. Tirado o "café" do texto de encontros presenciais.
- Prévia: https://communicali-lp21rg5hn-cali11.vercel.app (não publicado em produção).

### 2026-11-06 | Lista de espera no mesmo link
- Edição ganhou `inscricao_modo` (aberta, espera, fechada) e a chave "Inscrição pelo link" no topo de Pessoas (`communicali_modo_inscricao`). Espera: o formulário continua aberto, mostra `forms.aviso` antes da descrição (lido por `cali_form_public`) e a mensagem final de lista de espera; fechada: `forms.status = closed`.
- Situação nova "Lista de espera" (`espera`) em formulário, site, convites e manual. Gatilho `form_responses_etapa_inscricao`: resposta nova entra como Lista de espera no modo espera, ou Inscrito. Mudar para Confirmado dispara boas-vindas e card como antes. Migrações `20261106090000_lista_de_espera.sql` e `20261106091000_form_publico_aviso.sql`.
- Testado em transações desfeitas: gatilho, as três posições da chave e o formulário público. Lista de espera ligada em 06/11 a pedido da Patrícia: o link /f/coffee-rh-cwb mostra o aviso e as novas inscrições entram como Lista de espera.

### 2026-11-05 (21) | E-mail que voltou: aviso e reenvio
- Pessoas da edição: ao abrir, lê na Resend os envios sem retorno (`entregas`) e marca "Voltou" no e-mail de quem teve envio devolvido ou bloqueado, com um aviso acima da tabela listando os nomes.
- Corrigir o e-mail pelo lápis (formulário ou pessoa manual) de alguém Confirmado chama `email-admin` `limpar_falhas` (apaga do registro os envios que voltaram no endereço antigo) e `confirmados` (boas-vindas e card ao endereço novo). Botão de envelope em cada linha confirmada reenvia só o que ainda não chegou. `RespostaGaveta.mudou` agora recebe a resposta salva.
- Voltar uma pessoa para Confirmado (por exemplo, de "Não vai") já dispara boas-vindas e card se ela ainda não recebeu.
- Feito: Paula Gaio corrigida para contato@pgrecursoshumanos.com.br, reenviado e entregue; registros antigos da Lilian e da Paula limpos. Só a Cleia (email@email.com) segue marcada.

### 2026-11-05 (20) | Prévia: página inicial com faixas de cor
- Branch `logo-nova` (não publicado): topo em marfim com a logo bordô (`public/brand/comunicali-bordo-horizontal.png`); "Primeira vez?" em degradê mostarda; Formatos continua bordô; Próximo encontro e Perguntas frequentes em fundo claro; rodapé mostarda com logo bordô. Faixas por `.faixa--mostarda` e `.faixa--clara` (variáveis de cor locais, fundo em toda a largura). Texto legal do rodapé encurtado para duas linhas. Ajustes seguintes: respiro embaixo dos tickets (#programa), card do próximo encontro com fundo mostarda deslocado e entrada da direita para a esquerda, sem a faixa vazia antes dos parceiros. "Como foram os encontros" só aparece quando já houve encontro; rodapé da página inicial bordô com legal e "Toda honra a Deus!" centralizados em marfim e mostarda. Prévia atual: https://communicali-14c0gg1r1-cali11.vercel.app
- Post e story do primeiro encontro (logo antiga, fachada) em `~/CALI/communicali-materiais/primeiro-encontro-post-story/`.

### 2026-11-05 (19) | Passaporte da organização e prévia da logo nova
- `communicali_meu_espaco`: fundadora e organizadores veem o passaporte mesmo sem check-in (migração `20261105220000_passaporte_organizacao.sql`). O check-in de teste da Patrícia saiu quando a edição de teste foi excluída.
- Prévia da logo nova no branch `logo-nova` (worktree `~/CALI/communicali-logo-nova`, commit separado, não publicado em produção): `public/brand/communicali-branco.png` (fundo escuro), `communicali-horizontal.png` (fundo claro) e `communicali-bordo.png` (empilhado) trocados pelas artes de `~/CALI/ComuniCALI-Logo`; títulos h1 a h3 em Inter 700 para não competir com a logo (Funnel Display fica na logo, números e carimbos). Prévia protegida: https://communicali-1mbwsv3vs-cali11.vercel.app
- Plano: subir no domingo 15/11, depois do encontro. Falta ainda: topo dos e-mails (`public/email/topo.png`), ícones do app (`public/app/icone-*`), favicon e cards gerados no canvas.

### 2026-11-05 (18) | Conferência geral de entregas
- `email-admin` `acao: nao_entregues`: lista os 100 e-mails mais recentes direto na Resend (staff, avisos e edição) e devolve os que não chegaram. Resultado em 05/11: 97 de 100 entregues; problemas só em Lilian (bloqueio na Resend), Cleia (email@email.com) e Paula Gaio (domínio digitado errado, pgrecuroshumanos).
- Todos os confirmados com endereço válido receberam boas-vindas e card. DNS de calirh.com está na Hostinger (dns-parking.com); DMARC com relatório fica como melhoria opcional.

### 2026-11-05 (17) | E-mails: spam e entrega
- Diagnóstico (Lilian Oliveira, Sursuma, disse que não recebeu): boas-vindas (03/11) e card (05/11) aceitos pela Resend. DNS de calirh.com está certo: SPF do send.calirh.com (amazonses), DKIM resend._domainkey, DMARC p=none sem relatório.
- `api/_email.js`: todo e-mail sai também em texto simples (`textoSimples`, links rastreados voltam ao endereço final). Boas-vindas, card e agradecimento (`lote`) levam List-Unsubscribe (link assinado e mailto) com one-click e respeitam quem pediu para sair.
- `email-admin` `acao: entregas`: lê na Resend o `last_event` de cada envio e grava em `email_log.entrega` (migração `20261105210000_email_entrega.sql`). Painel: botão "Conferir entregas", cartão Entregues (voltaram, spam, erro), coluna e filtro Entrega.
- Pendente com a Patrícia: DMARC com endereço de relatório (rua) no DNS; pedir aos inscritos que marquem "não é spam" e salvem comuni@calirh.com nos contatos.

### 2026-11-05 (16) | Votação organizada e check-in junto confirmado pelo responsável
- `PollEditor` em seções: cabeçalho com status e ações; números (respostas, médias, distância) com Exportar CSV e **Zerar respostas** (apaga `poll_votes`, mantém as perguntas); "No dia do encontro" explicando Telão da sala e Página de votar, cada um com abrir e copiar link; Perguntas; exclusão no fim. Na edição, a votação não fica mais dentro de outro cartão. Avisos somem sozinhos.
- Check-in junto: `communicali_registrar_presenca` não marca mais sozinho; devolve `junto` com id, tipo e nome. A tela de sucesso pergunta "Quem está com você agora?" e só marca quem a pessoa escolher (`communicali_confirmar_junto`, pelo código do check-in). Migração `20261105200000_checkin_confirma_junto.sql`; testado numa transação desfeita.

### 2026-11-05 (15) | Confirmado envia e-mail, convidado de quem, check-in junto e boas-vindas
- Marcar Confirmado (formulário, convite ou pessoa manual com e-mail) chama `email-admin` `acao: confirmados`: boas-vindas e card Eu vou!, uma vez só (`enviarUmaVez`); o servidor confere que a pessoa está confirmada. Página do site continua com o e-mail de confirmação de antes. Kids não recebem.
- Colunas "Convidado de" (texto, `communicali_definir_convidado_de`) e "Junto com" (`communicali_definir_junto`: `form_responses.junto_com_email`, `edition_kids.responsavel_email`). Migração `20261105190000_convidado_de_e_checkin_junto.sql`, com os dados pedidos: Cíntia, João Ricardo e Inaiê convidados de Patrícia Lima; Cleia convidada do Marcio, com check-in junto; kids ligados aos responsáveis.
- `communicali_registrar_presenca`: ao fazer check-in, marca `chegou_em` de quem chega junto e devolve `junto` (nomes) para a tela de sucesso. Testado numa transação desfeita: o check-in da Patrícia registrou Akemi e Ayumi.
- Lista impressa: embaixo do nome, "Convidado de ..." e "Check-in com ...".
- Check-in: telão e celular com "Bem-vindas e bem-vindos!", "Sinta-se à vontade, escolha uma mesa e faça seu check-in"; logo na tela fechada; sucesso diz "Agora é só levantar a mão. Você recebe o seu crachá na mesa." e quem entrou junto.
- Pendente: as boas-vindas da Cíntia não saíram (o envio direto foi bloqueado aqui); ela recebe pelo botão "Enviar boas-vindas" em E-mails.

### 2026-11-05 (14) | Uma lista só em Pessoas da edição
- A planilha separada de respostas saiu da edição: a tabela de Pessoas é a única lista. Ela recarrega ao abrir, a cada 30 segundos, ao voltar para a aba e no botão Atualizar, então quem se inscreve aparece sozinho.
- Coluna "Nota interna" editável na linha (`communicali_definir_nota`; `admin_note` no formulário e coluna nova `nota` em `registrations`, `guests`, `edition_kids`) e coluna "Check-in" com a hora de chegada. Migração `20261105180000_pessoas_nota_checkin.sql`.
- O nome já vem com o sobrenome do formulário. O Excel leva a lista, a nota, o check-in e todas as respostas do formulário (uma pergunta por coluna), sem perder nada.
- Check-in: `communicali_inscricao` também reconhece quem foi adicionado à mão com e-mail. Quem se inscreveu pelo formulário é achado pelo e-mail em qualquer situação; quem não for encontrado faz o cadastro completo na hora.

### 2026-11-05 (13) | Cleia como convidada e kids cadastrados
- Dados da fundadora (pedido da Patrícia, conforme o PDF dela): Cleia Parcio Gomes passou a Convidado, com a nota "Acompanhante de Marcio J Silva"; Akemi e Ayumi Azumi Lima (responsável Patrícia Lima) e Bernardo (responsável Marcio J Silva) entraram como Kids confirmados.
- Lista de Recepção: convidado vindo do formulário mostra "Acompanhante de ..." da nota interna no lugar da empresa. Total conferido: 29 pessoas, 26 adultos e 3 crianças.

### 2026-11-05 (12) | Listas impressas no modelo de ticket
- `src/pages/listaImpressa.ts` (`imprimirFolhas`): modelo único para listas impressas, a partir do PDF de referência da Patrícia (logo, ticket com título, instrução de marca-texto, resumo, blocos por categoria com etiqueta e contagem, caixa, número, nome em negrito, rodapé). Usar em toda lista impressa nova.
- Lista de Recepção: confirmados por categoria (Membros, Participantes, Convidados, Kids, Organização) com Cargo, Empresa (Open to Work vira etiqueta) e E-mail de cadastro; nome completo com o sobrenome do formulário. Staff e fornecedores numa folha à parte.
- Lista dos Mimos no mesmo modelo, separando post aprovado e ainda sem conferir.

### 2026-11-05 (11) | Pessoas sem pisca e lista da recepção por categoria
- Mudar situação ou categoria atualiza a linha na hora e grava em seguida; a tabela não some mais ("Carregando" só na primeira carga). Avisos viram toast.
- Lista da recepção: só confirmados, um bloco por categoria (Membros separados dos Participantes pelo nível no passaporte, via `nivel` em `communicali_pessoas_edicao`, migração `20261105170000`), ordem alfabética, colunas Nome, Primeira vez?, E-mail (ou função para equipe e kids), WhatsApp e Chegou.
- Card e mimos: botão renomeado para "Imprimir lista dos mimos".

### 2026-11-05 (10) | Pessoas da edição: categoria, pessoa manual, assistente e respostas juntas
- Os 24 que estavam "Contatado" (já conferidos antes da mudança) viraram "Confirmado": 25 participantes confirmados.
- Categoria editável na linha e em lote (`communicali_definir_categoria`; coluna `categoria` em `form_responses`, `registrations`, `guests`).
- `edition_kids` virou o cadastro manual de qualquer pessoa (categoria, função, idade, responsável, e-mail, WhatsApp); botão "Adicionar pessoa". Manual com e-mail e confirmado entra em `communicali_destinatarios`.
- O assistente informado no cadastro do staff aparece como Staff (fonte `assistente`).
- Ações por linha em ícones: olho (respostas do formulário em gaveta, `RespostaGaveta`), lápis (editar), lixeira (tirar da edição). Caixa "selecionar todos" no cabeçalho da tabela (`Coluna.cabecalho`).
- Barra de lote explica o que faz: "Mudar a situação para" e "Mudar a categoria para", com Aplicar.
- A seção separada "Respostas" saiu; a planilha completa do formulário fica recolhida no fim de Pessoas (`PlanilhaDaEdicao`).
- Testado com admin de teste (removido): adicionar, mudar categoria em lote, olho e tirar.

### 2026-11-05 (9) | Pessoas da edição num lugar só
- Nova seção "Pessoas da edição" (`src/pages/AdminPessoasEdicao.tsx`, RPC `communicali_pessoas_edicao`): participantes (formulário da edição e página do site), convidados (link de convite, `registrations.indicado_por`, e `guests`), kids (tabela nova `edition_kids`, cadastro manual), staff e fornecedores ligados pelo rótulo do encontro em `eventos`, e organização. Contagem de quem vai estar lá, recorrência pelo histórico de check-ins, seleção em lote, lista impressa da recepção e Excel.
- Situação única: inscrito, contatado, confirmado, sem_resposta, nao_vai (`communicali_definir_situacao`). No formulário fica em `form_responses.stage` (etapas do formulário); em `registrations` e `guests`, na coluna nova `situacao`. Migração `20261105150000_pessoas_da_edicao.sql`: quem tinha contato virou "Contatado", os outros "Inscrito".
- `communicali_destinatarios`: `acionado` agora significa Confirmado; "Não vai" sai. Lembrete (`api/email-lembretes.js`) só vai para confirmados. Card Eu vou! também só para confirmados.
- Um link por edição: o botão do site leva ao formulário da edição (`signupHref`). O menu Formulários não lista mais formulários de edição. A seção "Inscrições pelo site" saiu; as respostas completas continuam em "Respostas".
- Fornecedores ganharam `eventos`; o staff e o fornecedor são ligados à edição pelo botão "Adicionar staff ou fornecedor".
- Pendente: ninguém está Confirmado ainda; os 25 contatados precisam ser marcados para receber lembrete e card.

### 2026-11-05 (8) | Ver respostas sem editar e barras de ferramentas numa linha só
- Respostas de formulário, Staff e Fornecedores: botão de olho em cada linha abre a resposta completa só para leitura (`ViewResponse` em AdminFormsPage, `VerRegistro` em RegistrosPainel), com "Editar" no rodapé.
- Página da edição ganhou a seção "Formulário de inscrição" (`FormularioDaEdicao`, pelo `editions.form_inscricao`) com a mesma tabela de respostas; item "Formulário" no índice.
- `Tabela` (AdminTabela) aceita `acoes`: imprimir e exportar ficam na mesma linha da busca e dos filtros, à direita. Regra para toda tabela nova.
- Inscrições: o campo solto com o link virou "Copiar link para divulgar" e "Ver a página" no cabeçalho, com uma frase explicando a seção. Presenças virou tabela com filtro de uso de imagem.
- "Ver os e-mails enviados" é uma faixa vinho com "Clique para abrir".
- Testado em produção com admin de teste (removido): mesma linha nas quatro tabelas, leitura sem campos editáveis.

### 2026-11-05 (7) | Página da edição organizada e Card e mimos
- Página da edição: índice fixo no topo (Dados, Imagens, Inscrições, E-mails, Card e mimos, Votação, Presenças) e cada seção com cabeçalho vinho destacado (`.adm-edicao` em admin.css). Seção de dados ganhou cabeçalho.
- Nova seção CARD EU VOU! E MIMOS (`CardEMimos` em AdminEmails.tsx), separada dos e-mails: números (receberam, geraram, postaram, aprovados), tabela com busca e filtros (quem gerou, quando, formatos feed/story, quando postou, onde, aprovação do post), "Imprimir lista da recepção" (só quem postou, com coluna Entregue para marcar no papel), Exportar Excel, copiar link do grupo, teste do e-mail e envio para quem falta.
- Controle de retirada saiu da tela. `compartilhamentos` ganhou gerado_em, formatos, compartilhado_em, conferido_em (migração `20261105130000_card_participacoes.sql`); `/eu-vou` registra cada geração e formato (acao gerou).

### 2026-11-05 (6) | Card Eu vou! enviado
- Primeira tentativa não enviou nada: a regra de `email_log.tipo` não aceitava "card", a reserva falhava e o envio contava como feito. Corrigido (migração `20261105120000_email_log_card.sql`) e o lote agora conta só o que saiu de verdade.
- Com o ok da Patrícia, o e-mail do card foi enviado aos 25 confirmados da 1ª Edição (25 registros "enviado" com id do Resend, 0 erros). Quem já recebeu não recebe de novo. Acompanhar aberturas, cliques e a lista de Mimos no painel da edição.
- Ao criar um tipo de e-mail novo, incluir o tipo na regra de `email_log`.

### 2026-11-05 (5) | Card também em story
- `/eu-vou`: escolha "Feed e LinkedIn" (1080x1350) ou "Story do Instagram" (1080x1920). O story usa a mesma arte, centralizada, deixando livres o topo e a base que o Instagram cobre. A foto escolhida no aparelho vale para os dois formatos.
- PENDENTE combinado com a Patrícia: voltar à apresentação do Canva (fluxo dos slides e o slide da votação) depois do trabalho do card.

### 2026-11-05 (4) | Mimo em destaque e retirada pela lista
- E-mail do card: o mimo vai num cartão destacado (`destaque` no `layout`), antes do botão "Criar meu card", com o passo "toque em Já compartilhei".
- Retirada pela lista: ninguém precisa mostrar o post; o "Já compartilhei" coloca o nome na lista do painel (Mimos), onde a recepção marca a entrega. Textos da página e do painel ajustados. Teste reenviado para pclazumi@gmail.com; lote não enviado.

### 2026-11-05 (3) | Mimo para quem compartilha e topo dos e-mails no modo escuro
- Sem sorteio (Lei 5.768/1971): mimo para todos que postarem o card marcando a CALI RH (@calirh_) e mostrarem na recepção. `/eu-vou` mostra as regras, a pessoa marca Instagram/LinkedIn e toca em "Já compartilhei"; `api/eu-vou.js` (acao compartilhei) grava em `compartilhamentos` (migração `20261105110000_compartilhamentos.sql`), só para quem está confirmado.
- Painel, E-mails da edição: "Mimos: N pessoas compartilharam · M retirados", com caixinha para marcar a entrega na recepção.
- E-mail do card: sem capa do local e sem Quando/Onde; fala só do card e do mimo. Teste reenviado para pclazumi@gmail.com; lote não enviado.
- Todos os e-mails: o topo virou a imagem `public/email/topo.png` (fundo vinho, logo branco, faixa de cores), que não é invertida no modo escuro do Gmail; antes o logo vinho sumia no fundo escuro. `color-scheme: light only` para os aplicativos que respeitam.

### 2026-11-05 (2) | Carimbo do card com falhas
- Card Eu vou!: saiu a linha picotada e os recortes do meio do ticket; carimbo "PRESENÇA CONFIRMADA" afastado da borda (centro em x=855), girado, com anel irregular e falhas de tinta (`carimboGasto`, padrão fixo pelo nome, então o card sai igual se gerar de novo).
- Sorteio para quem compartilhar: proposto, aguardando decisão da Patrícia (ponto legal da Lei 5.768/1971).

### 2026-11-05 | Tudo da edição dentro da edição, card Eu vou! por e-mail
- Página da edição (painel): seção VOTAÇÃO (`VotacoesDaEdicao` em AdminPrograma.tsx) com lista, nova votação (a primeira usa o slug da edição) e o editor; aba Votações saiu do menu. Editor sem "Revelar no telão" e sem telão antigo; botões Ativar/Encerrar, "Abrir tela ao vivo", "Excluir esta votação"; mostra médias de opinião e prática.
- E-mails enviados ficam numa lista suspensa. Botão "Excluir edição" (confirma digitando o nome) chama `communicali_excluir_edicao` (migração `20261105100000_excluir_edicao.sql`), que apaga votações, votos, presenças, milhas da edição, convidados, inscrições e fotos.
- Card Eu vou!: canhoto agora tem carimbo "PRESENÇA CONFIRMADA" (no lugar de Café & Pessoas / Embarque confirmado); frase "Vou estar no primeiro encontro" quando a edição é a nº 1.
- `/eu-vou` (`EuVou.tsx`, `api/eu-vou.js`): a pessoa confirmada (inscrita aprovada, convidado confirmado, contatada no formulário da edição ou organização) informa o e-mail, ou chega com `?c=<assinatura>` do e-mail, e o card sai com a foto do formulário (link temporário do bucket cali-forms) ou do passaporte. "Usar outra foto" troca só no aparelho.
- E-mail "card" (`montar('card')`): botão "Criar meu card" com link pessoal. No painel (E-mails da edição): "Testar card (pclazumi@gmail.com)", "Enviar card para os confirmados (N)" e o link do grupo. Teste enviado em 05/11; lote NÃO enviado (aguarda o ok da Patrícia). A conta de membro da Patrícia é contato@calirh.com.

### 2026-11-05 | Tela ao vivo com QR Code
- `/telao/resultado` virou a tela única da dinâmica: "Antes de debater, vamos votar!", QR Code para comuni.calirh.com/votar à esquerda; total, médias "Na opinião" e "Na prática", distância e barras à direita, atualizando a cada 2,5 s. O slide separado do QR pode sair da apresentação; o link "Abrir tela ao vivo" fica no slide do tema central.
- Ao abrir a tela logada como administradora, a votação em rascunho abre sozinha (o público não consegue). Se não estiver aberta, a tela avisa. `communicali_resultado` devolve `situacao` (migração `20261105090000_resultado_situacao.sql`).

### 2026-11-04 (noite, 11) | Votação uma pergunta por vez e rodapé curto
- `/votar`: com segunda pergunta, mostra "Pergunta 1 de 2", botão Continuar e só então a segunda ("Pergunta 2 de 2", Enviar, Voltar para a primeira).
- `/votar` e `/checkin` usam `PageEvento` (main.tsx): rodapé de uma linha só com Regras e Privacidade (abrem em nova aba).

### 2026-11-04 (noite, 10) | Votação com duas perguntas e tela de resultado; modo apresentação removido
- Modo apresentação saiu inteiro (a apresentação fica no Canva): páginas, rota, menu, pdfjs-dist, tabela `apresentacoes`, funções `communicali_ao_vivo*` (migração `20261104220000_remove_apresentacoes.sql`) e os 39 slides do bucket.
- Votação: `polls.pergunta_2` e `poll_votes.nota_2` (migração `20261104230000_votacao_duas_perguntas.sql`). O celular mostra as duas escalas na mesma tela e exige as duas. Editor de Votações ganhou "Segunda pergunta" e o botão "Abrir tela de resultado".
- `/telao/resultado?edicao=<slug>` (`TelaoResultado` em `Telao.tsx`, função `communicali_resultado`): no tom dos slides, "Vamos ao resultado", total de votos, médias "Na opinião" e "Na prática", a distância entre elas e barras de 0 a 10 nas duas cores; atualiza a cada 3 s. Sem QR Code.
- Votações antigas apagadas a pedido. Nova votação "Cuidar de pessoas ainda é relevante?" (slug fundadora, em rascunho): opinião e prática, de 0 a 10. Ativar no painel na hora da dinâmica. QR do slide continua comuni.calirh.com/votar.

### 2026-11-04 (noite, 9) | Modo apresentação com enquete ao vivo
- Painel, Edições, Apresentação (`AdminApresentacao.tsx`): sobe o PDF do Canva (convertido no navegador em JPEG 1920 px com pdfjs-dist 4.10.38, `intent: 'print'` para não travar em aba oculta) ou as imagens; guarda em `site/apresentacoes/<id>/`. Entre os slides, "Enquete aqui" escolhe uma votação (criadas em Votações). Trocar os slides mantém as enquetes nos mesmos pontos.
- `/apresentacao?id=` (`Apresentacao.tsx`, só admin): tela cheia (F), avança com passador, setas, espaço ou clique; volta com seta ou clique no canto esquerdo; guarda a posição se recarregar. Ao chegar numa enquete, abre a votação (`polls.status = ativa`, `apresentacoes.poll_atual`) e mostra QR Code e gráfico ao vivo (lê `poll_votes` a cada 2 s, sem esperar revelar); ao seguir, encerra.
- Celular: `/votar?ao-vivo=<id>` (no QR) ou só `/votar` (função `communicali_ao_vivo_atual`) acompanha a enquete aberta; entre perguntas mostra "Fique por aqui". Migrações `20261104200000_apresentacoes.sql` e `20261104210000_ao_vivo_atual.sql`.
- A apresentação da 1ª Edição já tem os 39 slides do PDF de 04/11; nenhuma enquete marcada ainda. Testado com enquete temporária e dois votos simulados; tudo apagado.

### 2026-11-04 (noite, 8) | Painel em largura total e cadastros no modelo de formulário
- Painel do admin sem limite de largura (`admin.css`). Tabela de respostas com colunas mais largas; gaveta lateral com até 960px e campos em duas colunas (texto longo, várias opções e arquivo ocupam a linha toda).
- Excluir uma resposta: lixeira em cada linha e "Excluir resposta" na gaveta, com a mesma confirmação da exclusão em lote.
- STAFF e Fornecedores usam `src/pages/RegistrosPainel.tsx`: mesmo visual das respostas (busca, filtro por função/categoria, Atualizar, Exportar Excel, seleção em lote, editar na gaveta, excluir). Campos de conferência aparecem só para leitura na gaveta; "Conferir" sinaliza na data.
- Fornecedor que volta sem mudanças agora copia endereço e Pix do cadastro anterior (migração `20261104190000_fornecedor_copia_anterior.sql`).

### 2026-11-04 (noite, 7) | STAFF recupera cadastro e marca encontros
- STAFF começa por "É a primeira vez?". Quem já foi informa CPF e e-mail; `onAdvance` (novo gancho de `FormPreset`) chama `communicali_staff_reencontrar` (só responde se CPF e e-mail batem; devolve nome, WhatsApp, banco e o final da chave Pix). Encontrou: "Que bom ter você de volta, {nome}!" e "Algum dado mudou?". Não encontrou: avisa e segue o cadastro completo. Respostas internas com `_` vão no envio e não são descartadas.
- Encontros: `StaffForm` busca as edições públicas futuras. Com mais de uma, pergunta "Em quais encontros você vai trabalhar?" (várias); com uma, liga direto; sem nenhuma, pula. Coluna `staff.eventos` (migração `20261104180000_staff_eventos_reencontro.sql`), no painel, Excel e e-mails.
- Aviso de formulário preenchido para a organização: só nome, formulário e botão do painel, sem as respostas.
- `{a|b}` no título usa a primeira resposta preenchida.

### 2026-11-04 (noite, 6) | Pix por documento, e-mails sem emoji na frente
- Motor: `showIf` aceita `{ any: [...] }` (basta uma condição); `{id}` no título/ajuda mostra a resposta já dada (`comRespostas`).
- STAFF: Fotografia e vídeo e Facilitação emitem sempre nota fiscal; Palestrante e Outro escolhem; Apoio e Auxiliar emitem recibo. Pix por documento (`perguntasPix`/`chavePix` em `Staff.tsx`, usados também no fornecedor): quem tem CNPJ vê CNPJ, e-mail, telefone ou aleatória; pessoa física vê CPF, e-mail, telefone ou aleatória. CNPJ e CPF são confirmados ("A chave Pix é o CNPJ ...?"), e-mail e telefone também; só digita se for outro.
- E-mails: nenhum assunto ou pílula começa com emoji (38 trocas em api/). Emojis só dentro do texto, com moderação. E-mails de STAFF reescritos com mais vida; no aviso da organização, nome e participação ficam dentro do cartão. Aviso de fornecedor no mesmo formato (`emailFornecedorOrganizacao`). Teste reenviado em 04/11 para pclazumi@gmail.com e admins; registro apagado.

### 2026-11-04 (noite, 5) | STAFF que volta, e-mails de STAFF, Quero conhecer
- "Quero conhecer a ComuniCALI" (forms.slug quero-ser-membro): texto de abertura novo, com visitante ou convidado, online/presencial e Curitiba e região em negrito e "gratuito" em destaque. Os formatos de e-mail e telefone já valem para ele.
- Regras e Privacidade no rodapé dos formulários abrem em nova aba (antes a pessoa saía e perdia o preenchimento).
- Motor: `showIf` aceita lista de condições (todas precisam bater); ao trocar uma resposta, as respostas de perguntas que deixaram de valer são descartadas.
- STAFF que volta (migração `20261104170000_staff_retorno_historico.sql`): sai a trava de CPF único; cada participação é um registro novo ligado ao anterior (`anterior_id`), com `primeira_vez` e `atualizou_dados`. "Algum dado mudou?" Não: pula empresa, endereço e Pix, que são copiados do cadastro anterior. `conferir` sinaliza Pix diferente do anterior, cadastro anterior inexistente ou CNPJ faltando; aparece no painel e no e-mail da organização. Painel mostra data e "Nª participação".
- E-mails (`api/_email.js`: `layoutCartao`, `emailStaff`, `emailStaffOrganizacao`; enviados por `api/avisos.js`): boas-vindas ao STAFF para a pessoa (função, valor, pagamento, comprovante e o aviso de que o STAFF é formado a cada evento) e aviso para a organização. Teste enviado em 04/11 para pclazumi@gmail.com e para os admins; registro de teste apagado.

### 2026-11-04 (noite, 4) | Campos com formato, STAFF revisado e cadastro de fornecedor
- Motor de formulários (vale para todos, inclusive os do painel): `mask` em `FormQuestion` (cpf, cnpj, cep, money, pix_aleatoria), também detectado pelo título em texto curto (CPF, CNPJ, CEP). Só números, tamanho certo e dígitos verificadores de CPF/CNPJ. E-mail exige formato nome@provedor.com, sem espaço nem acento. Telefone com DDD separado (2 dígitos, sem zero) e número de 8 ou 9 (celular com 9); colar o número inteiro no DDD distribui. CEP busca o endereço no ViaCEP e preenche rua/bairro e cidade seguintes ainda vazios, para a pessoa conferir. Contagem de perguntas e "N de M" usam o caminho real (sem as condicionais). Texto digitado legível no fundo escuro.
- STAFF (`/staff`): título "Cadastro de STAFF" e boas-vindas. Funções: Fotografia e vídeo, Apoio, Auxiliar de organização, Palestrante, Facilitação de oficina ou experiência, Outro. Apoio e auxiliar: recibo, pagamento integral no primeiro dia útil. Fotografia e vídeo: nota fiscal, 50/50 padrão e combinado descrito. Palestrante, facilitação e Outro: escolhem nota ou recibo e descrevem o combinado. Endereço em rua/bairro, número e complemento. Pix por tipo (CPF, CNPJ, e-mail, telefone, aleatória) com formato próprio, banco e aviso de conferência; servidor exige mesma titularidade para chave CPF/CNPJ. Valor em reais sem exemplo. "Deseja ser acionado para os próximos eventos?" e observações. Migração `20261104150000_staff_pix_acionado.sql`.
- Fornecedor (`/fornecedor`, `Fornecedor.tsx`, painel `/admin/fornecedores`, migração `20261104160000_fornecedores.sql`): empresa ou pessoa física, contato, categoria e o que fornece. Quem já forneceu e diz que nada mudou pula endereço e Pix; o registro aponta para o cadastro anterior com o mesmo documento (nada é mostrado de volta no formulário). E-mail aos admins a cada cadastro.
- CPF repetido no STAFF continua bloqueado (mensagem pede para falar com a organização): evita troca de Pix por terceiros.

### 2026-11-04 (noite, 3) | Staff: Apoio e comprovante por função
- Funções: Fotografia, Vídeo, Fotografia e vídeo, Apoio (cobre recepção e produção), Outro.
- Fotografia e vídeo emitem nota fiscal (pedem empresa e CNPJ, Pix no CNPJ). Apoio emite recibo de pessoa física, Pix no próprio CPF, com o aviso "Caso você não saiba como emitir o recibo, não se preocupe: nós ajudamos você", e não é perguntado sobre assistente. Só "Outro" escolhe entre nota e recibo.

### 2026-11-04 (noite, 2) | Staff: pagamento por função
- Motor de formulários: `showIf: { id, in }` em `FormQuestion` faz a pergunta aparecer só quando outra resposta bate; `nextQuestionIndex` recebe todas as respostas.
- Staff: fotografia e vídeo descrevem o que foi combinado (padrão 50% na reserva e 50% após a entrega dos materiais) e aceitam as condições; recepção e apoio aceitam pagamento integral por Pix no primeiro dia útil após o evento; "Outro" descreve o combinado. Pix precisa ser da mesma titularidade (CPF do cadastro ou, com nota fiscal, CNPJ da empresa).
- Coluna `staff.pagamento_combinado` (migração `20261104130000_staff_pagamento_combinado.sql`), no painel, no Excel e no e-mail à organização. Caminhos conferidos por simulação: fotografia com assistente e recibo, recepção com nota fiscal, Outro.

### 2026-11-04 (noite) | Staff completo e telas sem piscar
- Staff (`/staff`, `Staff.tsx`, migração `20261104120000_staff_assistente_pagamento.sql`): função em lista (Fotografia, Vídeo, Fotografia e vídeo, Recepção, Apoio de produção, Outro); "Outro" pede a função por escrito. Pergunta se leva assistente; se sim, nome, CPF, WhatsApp e o que vai fazer. Comprovante: nota fiscal (pede empresa e CNPJ de 14 dígitos) ou recibo de pessoa física. Valor combinado e aceite das condições: 50% na entrada e 50% na entrega do trabalho (fotografia e vídeo: na entrega das fotos e vídeos), mediante nota fiscal ou recibo. Chave Pix agora obrigatória. Servidor valida tudo de novo.
- Painel Staff mostra e exporta valor, comprovante e dados do assistente. `api/avisos.js` envia e-mail para os admins a cada cadastro de staff (sem CPF nem endereço no e-mail).
- Telas do passaporte: `src/pages/lembrar.ts` guarda em memória cartão do perfil, inscrições, agenda, Rede, parceiros, perfis de parceiros e configuração do código de convite. Tudo é buscado ao abrir o passaporte (o Início espera o cartão junto, para o cargo não entrar depois); ao trocar de aba a tela aparece pronta e se atualiza por trás. Fotos da Rede e logos são baixados antes. A memória é limpa ao trocar de sessão.
- O plano gratuito do Supabase não redimensiona imagens (render/image devolve 403); as fotos atuais têm cerca de 34 KB.

### 2026-11-04 (tarde) | Perfil e modo aplicativo
- Perfis (o próprio e o da Rede): saiu a etiqueta de categoria (FUNDADORA, CONECTOR...); o selo representa a pessoa e ganhou texto alternativo. Pílulas de temas/segmento numa linha só, embaixo da foto, de ponta a ponta do cartão; até 3, e a que não cabe inteira fica escondida (linha de altura fixa).
- Telas da área do membro entram com um fade único de 0,22s, sem blocos caindo um a um.
- Modo aplicativo (display-mode standalone): faixa sólida #1F0E14 atrás da barra de status (antes o topo ficava borrado) e menu inferior mais perto da borda.

### 2026-11-04 | Aplicativo na tela inicial (PWA) e pílulas
- `public/manifest.webmanifest` (display standalone, início em /meu-passaporte, cores #1F0E14) e ícones em `public/app/` feitos a partir de `communicali-materiais/whatsapp/communicali-perfil-whatsapp.png`. `index.html`: manifest, apple-touch-icon, apple-mobile-web-app-capable, título ComuniCALI, barra de status preta, viewport-fit=cover. Menu inferior respeita a barra de gestos no modo aplicativo.
- Quem já salvou o atalho antes precisa apagar e adicionar de novo para abrir em tela cheia.
- Janela "Como foi conhecer..." e o selo ampliado do Programa abrem via portal no body (antes a janela ficava presa dentro do cartão, com fundo cinza parcial).
- Pílulas (O que faz, Está buscando, segmento do perfil) não quebram mais em duas linhas.

### 2026-11-04 | Programa: selos que giram e abrem os detalhes
- `TrilhaPrograma.tsx`: saiu o bloco "Conheça a trilha / Da primeira visita...". Cada etapa virou botão; ao tocar, o selo amplia, gira (frente até 90°, verso de -90° a 0, sem 3D real, porque o 3D achatava e espelhava o texto) e mostra no verso os requisitos (Doc Mestre v22, critérios v21), avaliação e aceite, revalidação anual e "Milhas sozinhas não mudam o nível". Fecha com X, Esc ou toque fora. Respeita movimento reduzido.
- Cores: cartão do papel atual em vinho com borda dourada; números e linha da trilha em dourado; etapa atual com faixa dourada. Mais respiro entre ícones e textos (título, check dos requisitos, selo e texto).
- Minhas milhas: aviso de validade (ciclo de 12 meses a partir do cadastro, recomeça no aniversário de adesão, histórico guardado, sem valor em dinheiro). ATENÇÃO: o banco ainda soma o total; o contador por ciclo não existe. Pendente implementar no servidor.

### 2026-11-04 | Rodapé com direitos e topo do celular
- Rodapé (`SiteFooter.tsx`): © ano atual, "uma iniciativa da CALI RH", todos os direitos reservados, proteção pela Lei 9.610/1998 e crédito de conteúdo, design e desenvolvimento. Fotos ficaram fora da frase de titularidade porque as atuais são do Unsplash. Sem CNPJ (não consta no projeto).
- Celular: o topo mostra só "Já sou membro"; "Registrar interesse" continua no hero.

### 2026-11-03 (noite) | Tickets mais sutis, endereço Meu passaporte, ticket serrilhado
- Tickets do topo (+300, 1ª edição, Brasil): agora escuros, compactos, com moldura tracejada dourada. No celular ficam lado a lado, só número e rótulo.
- Carimbos, Selos e Milhas: ticket vazado com canhoto do ícone à esquerda, diferente do topo.
- Novo endereço `/meu-passaporte` (o antigo `/meu-espaco` continua funcionando). Menu, rodapé, login do admin e e-mails de aviso apontam para o novo.
- Formulários: a etiqueta "ComuniCALI | Café & Pessoas" saiu do topo; o desenho de fundo virou ticket serrilhado (`public/brand/bilhete-communicali.svg`). Grafia corrigida para ComuniCALI nas telas de formulário fechado ou não encontrado.
- Barra do topo cabe em celular de 375px.
- Pendente: novo slogan no lugar de "Café & Pessoas" (aguarda a Patrícia).
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

### 15/11/2026, Claude Code — nova home e identidade (direção v1), no ar às 01h de 16/11
- Pedido da Patrícia: a nova home e o logo B entram no ar às 01h de 16/11/2026, por agendamento (`~/CALI/publicar-home-nova.sh`, `vercel promote` do deployment já preparado). Base: `main` (b16dd34) + branch `home-nova`. A branch `logo-nova` (versões anteriores de 14/11) NÃO entra: é outra direção visual, superada pela home v1.
- Home nova em `src/pages/Home.tsx` + `src/home-nova.css` (escopo `.hn`), sem mostarda: abertura, formatos, faixa Passaporte | Encontros | Grupo (+300), manifesto da fundadora, selos do kit novo, agenda com detalhe que abre (um por vez, "+" bloqueado quando não há data), como entrar, encontros anteriores, parceiros com faixa de logos, FAQ, convite e rodapé (CALI RH, CNPJ, e-mail). Embaixadores: carrossel pronto, oculto até haver embaixador com foto.
- Página da edição `/e/:slug` refeita (`Edicao.tsx`): resumo, fotos, comentários e bloco de NPS (`Nps`, ainda sem dados reais). `/e/:slug` só passa pela função `api/edicao.js` para robôs de pré-visualização (`vercel.json`). Tela de entrada do passaporte no visual novo (`entrada-nova.css`); o resto do app, os e-mails e o painel seguem na identidade antiga (briefing próprio, depois).
- Comentários nas edições encerradas: migração `20261115100000_comentarios_edicao.sql` JÁ aplicada no banco (tabela `edition_comments`, RPCs `communicali_comentar` e `communicali_comentarios`); qualquer pessoa comenta (nome ou anônimo) e nada aparece sem aprovação em Admin > Edições > Comentários.
- Abertura animada (`src/components/Abertura.tsx`): logo antiga vira a nova nas 72 h depois de `LANCAMENTO` (16/11 01h), uma vez por pessoa (`cali_abertura_v1`, entra na política de cookies como essencial). Só na home.
- PENDENTE: favicon, ícones do app (`public/app/icone-*`), topo dos e-mails e cartões de convite ainda no logo antigo; textos legais novos (cookies, termos, acessibilidade) e título da 1ª edição ("Coffee RH") a decidir; foto/logos reais; NPS real exige função agregada no banco; a migração dos comentários já está no banco.
- Testado: tsc e build; home e página da edição no navegador (computador) e prévias na Vercel; comentários de ponta a ponta no banco real (teste apagado). NÃO testado: celular real, cliques na produção.

### 03/11/2026, Claude Code — fotos, acesso de membro e animações
- Fotos livres do Unsplash (licença gratuita) em `public/fotos/home/`: reuniao, virtual, palestra, jantar e experiencia no mosaico do topo; presencial, virtual, experiencia e jantar nas capas de "Sua próxima escala". IDs: 1542744173, 1588196749597, 1540575467063, 1581954548122, 1544928147, 1517048676732.
- "Já sou membro" no topo do site, ao lado de "Registrar interesse"; saiu o link do fim da seção do passaporte. A trilha mostra só os selos (o texto embaixo repetia o selo).
- Animações: entrada do topo, seções e cartões aparecem em sequência ao rolar (IntersectionObserver, classes `revelar`/`visivel`), tickets e capas reagem ao mouse, rolagem suave; tudo desligado com "reduzir movimento".

### 03/11/2026, Claude Code — home em nova ordem e ticket convencional
- **Modelo de ticket de Patrícia:** quando ela diz "ticket" é o ingresso convencional, com bordas recortadas em meia-lua, moldura interna, estrelas e numeração lateral, em cor invertida (mostarda com texto vinho). Classe `.ticket` em `src/home.css`. Usado nos números do topo e em Carimbos, Selos e Milhas (com ícones Stamp, Award e Route).
- Nova ordem da home: Hero → números → A comunidade → Comece a sua jornada → Sua próxima escala (formatos com capa) → Seu passaporte → Agenda "Próximo check-in" → Apoie este encontro → logos de quem apoia → Dúvidas.
- Texto da comunidade com palavras-chave destacadas em mostarda.

### 03/11/2026, Claude Code — home: tickets, comunidade e formatos de encontro
- Números do topo (+300, 1ª edição, Brasil) em formato de ticket (recortes laterais e linha picotada). Cartão da fundadora com carimbo "ComuniCALI · Idealizadora" sobre a foto, no lugar das pílulas.
- "A comunidade": título "Caminhos que se cruzam e seguem juntos." e texto novo na linha do v23 (bagagem, caminhos, escuta), com a fé dita assim: "Acreditamos que nenhum encontro acontece por acaso. Servimos às pessoas com fé e integridade, e damos toda honra a Deus por cada caminho que se cruza aqui."
- "Primeira vez?" virou "Comece a sua jornada." Agenda "Sua próxima escala." com quatro formatos: Encontros presenciais, Encontros virtuais, Experiências, Almoços e jantares (formatos da comunidade; nenhum evento novo foi anunciado).
- Painel: datas com horário passam a aparecer no fuso de São Paulo (`dataBr`); antes o e-mail aberto às 21h aparecia com o dia seguinte.
- Pendente: fotos do topo (hoje imagens neutras do Unsplash); trocar pelas fotos reais depois do dia 14.

### 03/11/2026, Claude Code — site na linha do v23, bilhete nos formulários, card Eu vou! refeito
- Regra de Patrícia sobre texto: a estrutura em linhas curtas vale para e-mail; em telas largas use a lógica do espaço (texto corrido, blocos lado a lado, alinhamento conforme o lugar), sem quebras forçadas.
- Home: seção do passaporte com o conceito "Cada pessoa, uma jornada. Cada encontro, novos horizontes.", trilha com descrições do v23 ligada por linha pontilhada e três blocos lado a lado (Carimbos, Selos, Milhas). Agenda: "Sua próxima escala."
- Formulários da ComuniCALI: a folha decorativa virou um **bilhete** (`public/brand/bilhete-communicali.svg`, usado como máscara em `.cf-leaf`).
- Card "Eu vou!" refeito com respiro: logo, "Eu vou!", foto de passaporte no centro e cartão de embarque claro com picote (encontro, data, local, "Embarque confirmado"). Conferido no celular.

### 03/11/2026, Claude Code — card "Eu vou!" e cores do site no passaporte
- Quem tem inscrição aprovada vê "Criar meu card Eu vou!" no próximo encontro (aba Edições). Imagem 1080x1350 nas cores do site: foto de passaporte, "Eu vou!", cartão de embarque com encontro, data e local, frase da comunidade e conceito do v23. Baixar ou compartilhar. `gerarCartaoEuVou` em `ConviteMembro.tsx`; a janela de compartilhar virou genérica (`CartaoConvite` com `gerar`, `titulo`, `texto`, `arquivoNome`). Conferido no celular.
- Cores do Meu passaporte alinhadas ao site: fundos vinho #361C24 → #1F0E14 com brilho #5A1E2D, mostarda #C9973B nos destaques e botões (antes havia rosa/vinho claro).

### 03/11/2026, Claude Code — milhas e linguagem de jornada (v22 + complemento v23)
- Fontes: Documento Mestre v22 "Narrativa Passaporte" no Drive (id 10ifqSQL0N6uBtC2hgJ0O9g7RV8r0fZC3) e o complemento "Universo Narrativo e Visual da Jornada" (v23, Downloads). Patrícia aprovou "aplicar tudo".
- **Pontos viraram milhas** em todo texto visível (site, Meu passaporte, painel, e-mails, check-in, privacidade e regras; migração `20261103300000`). Nomes técnicos e cálculos não mudaram. Conector 60 milhas, Embaixador 180. Milhas não têm resgate nem valor em dinheiro.
- Microtextos: aba Programa virou "Minha jornada"; "Carimbos dos encontros"; "Sua próxima escala"; missões contam "selos de contribuição"; "Convide para essa experiência" no cartão de convite; selo dourado "Cartão de embarque · Inscrição confirmada" nos próximos encontros em que a pessoa está aprovada (RPC `communicali_minhas_inscricoes`, migração `20261103290000`). Roteiro do dia: "Guichê | Apresente-se" no pitch.
- Site: abertura da home com "Cada pessoa chega com sua própria bagagem. Quando histórias diferentes se encontram, novos caminhos aparecem." e texto do passaporte abaixo da trilha.
- Mantidos: nomes Visitante, Membro, Conector e Embaixador; selos oficiais (os selos de paisagem da outra IA não foram usados, porque o v23 pede não redesenhar selos e eles saem da paleta).

### 03/11/2026, Claude Code — Edições como páginas do passaporte
- Aba Edições do Meu passaporte: frase "Cada encontro é uma página do seu passaporte" com a contagem de carimbos; próximos encontros em bilhete vinho com picote, data em bloco (dia e mês) e botão dourado; encontros anteriores numa rota (linha pontilhada), com foto esmaecida quando a pessoa não foi e carimbo "CARIMBADO" quando esteve. Conferido no celular.

### 03/11/2026, Claude Code — elementos de passaporte (correção de Patrícia)
- Regras dela: o selo de nível é **quadrado** (postal), nunca recortado em círculo; nada de foto redonda/oval nem selo em arco "tipo LinkedIn"; nada de enfeite solto (o círculo pontilhado saiu); cartões com cantos suaves; o destaque do cartão é o selo e a pontuação, o botão de compartilhar é pequeno.
- Foto agora é de passaporte (reta, moldura branca, levemente inclinada) com **carimbo** "ComuniCALI · DISPONÍVEL" (oliva) ou "RECRUTANDO" (vinho) no canto. Vale para Início, cartões da Rede e perfil.
- Cartão do Início: nível, nome, função · empresa, temas, selo postal do nível no canto, e dentro do cartão o bloco de pontos (número, barra colorida, encontros e missões, linha MRZ). Perfil do colega usa o mesmo cartão vinho. Carimbos ficam numa "página" do passaporte. Cantos de 16px em todos os cartões.
- Currículo: o campo de PDF já aparece no perfil quando a pessoa marca "Disponível".

### 03/11/2026, Claude Code — Início com impacto e selos na foto
- Início do Meu passaporte: "Olá, Nome!", cartão de identidade em vinho com foto redonda, nível com selo, nome, função e empresa, temas, números (pontos, carimbos, selos) e compartilhar; o código saiu do cartão (fica em Indicar). Logo abaixo, "Para você" com os 3 alertas mais recentes (X para dispensar) e o resumo das reações recebidas. "Sugestões de conexão" sem repetir a mesma pessoa (motivos juntos) e com X para ocultar (guardado no navegador). RPC `communicali_meu_cartao` (migração `20261103280000`).
- Selo na foto em arco, como no LinkedIn: **#DISPONÍVEL** (oliva) para aberto ao mercado e **#RECRUTANDO** (vinho) para recrutador, nos cartões da Rede, no perfil e no Início. Saiu a pílula "Disponível no mercado".
- Código do convite em Indicar sem pulo: mesmo tamanho com ou sem edição e sem animação.
- Conferido no celular com Conector de teste (removido).

### 03/11/2026, Claude Code — nome "Meu passaporte"
- Decisão de Patrícia: a área do membro se chama **Meu passaporte** em todo texto visível (rodapé, home, e-mails, página de descadastro, privacidade e regras; migração `20261103270000`). O endereço continua `/meu-espaco` e o código mantém o nome técnico `MeuEspaco`.

### 03/11/2026, Claude Code — refinamento do Meu espaço
- Reações: nome e data em linhas separadas, botão discreto "Deixar uma reação ❤️ 🚀 👏". 18 reações de exemplo entre perfis @demo e no perfil contato@ (Patrícia); `scripts/demo.py limpar` agora apaga reações e auditoria antes dos membros demo.
- Meu histórico e Minhas indicações viraram listas suspensas em formato de rota (linha pontilhada com pontos). Requisitos de Conector e Embaixador em itens separados com destaque.
- Movimento: telas e cartões entram em sequência, botões respondem ao toque, listas abrem com animação, clique sonoro suave (WebAudio) em botões e listas; tudo desligado com "reduzir movimento" do aparelho. Conferido no celular com Conector de teste (removido).

### 03/11/2026, Claude Code — selos nos e-mails
- Selos redondos das missões gerados em imagem (`public/selos/missao-<slug>.png`, a partir do mesmo desenho do Meu espaço). E-mail de missão concluída mostra o selo da missão; e-mail de novo nível mostra o selo postal do nível.
- Novo e-mail "Novo carimbo": gatilho em `checkins` cria alerta `carimbo` (exceto edições teste e demo) e `api/avisos.js` envia com a imagem de `editions.carimbo_url`. Migração `20261103260000`. Publicado `dpl_B2g1ucdpCNCsYgopRYcvy5AtKijg`; tela de acesso do painel conferida; 3 testes enviados a Patrícia.

### 03/11/2026, Claude Code — acesso do painel e e-mail de nível (parcial, limite de uso)
- Publicado `dpl_8EYQNCftG6C9hnfu2nZ3riqUyDch`: nova tela de acesso do painel (lado vinho com a marca e cartão claro); e-mail de novo nível com o selo postal do nível (`layoutSimples` aceita `imagem`). Não conferido na tela.
- Concluído na entrada seguinte. O PPT ela ajusta na conversa onde foi criado, com base no Google Doc de falas.

### 03/11/2026, Claude Code — avisos por e-mail e roteiro da apresentação
- `api/avisos.js` (migração `20261103250000`): e-mail ao membro quando muda de nível, conclui missão (novo gatilho em `member_missions` cria alerta `missao`) ou recebe um perfil indicado; e-mail simples aos admins (`public.admins`) a cada formulário preenchido e a cada inscrição em encontro, com as respostas. Cada aviso vai uma vez (`email_em`, `admin_avisado_em`); o que existia antes foi marcado como avisado. Disparado após envio de formulário, após indicar perfil, ao navegar no painel e no cron diário. 5 testes enviados a Patrícia.
- Apresentação: textos de cada slide e falas dela em Google Doc "ComuniCALI 1ª Edição: textos para a apresentação e falas da Patrícia" (https://docs.google.com/document/d/1zz-hcAYCSBdYz4AisgsODXUWFPGyVIWqdXZS70mRf7o/edit). Selos para o slide em `~/Downloads/ComuniCALI_selos_para_apresentacao`. O arquivo da apresentação é editado por ela fora do Mac.
- Decisão provisória: na 1ª edição todo check-in vira Membro com crachá de Membro; escolha Membro ou Visitante fica para a 2ª edição.

### 03/11/2026, Claude Code — e-mails em linhas e roteiro do dia
- Regra de Patrícia para todo e-mail: frases curtas, uma ideia por linha, nomes e pontos principais em negrito (modelo dela: "Achamos que vale você conhecer o(a) Eduardo! / O ponto em comum é: / **Treinamento de atendimento** / Abra seu passaporte para ver o perfil e trocar figurinhas!"). `layoutSimples` aceita `linhas`; textos de inscrição, confirmação, espera, lembrete, conexão, sugestão e indicações reescritos assim. 8 testes enviados a ela.
- Início do painel: roteiro do dia em 6 passos (chegada, check-in pelo QR do porta-mesa e do telão, crachás na mesa, pitches de até 1 minuto, votação, resultado). Botão "Registrar presença manualmente" em Edições. Link discreto "Área administrativa" na tela de acesso do Meu espaço.
- Em aberto: hoje todo check-in vira Membro; a escolha Membro ou Visitante (crachá x etiqueta) da v21 não está construída. O PPT da 1ª edição (`~/CALI/communicali-materiais/apresentacao-1a-edicao`) não foi alterado para o pitch de 1 minuto.

### 03/11/2026, Claude Code — reações e painel reorganizado
- Perfil da Rede: comentários com estrela viraram **reações** (❤️ 😄 🚀 👏 🤝 💡 🙌 😢) com mensagem opcional, numa janela com confirmação "Tem certeza...". Publicadas na hora, **sem moderação da CALI** (decisão de Patrícia); quem recebe ou quem escreveu pode remover. RPCs `communicali_reagir` e `communicali_remover_reacao`, migração `20261103240000`. A revisão de comentários saiu da página Parceiros.
- Painel: menu em seis grupos (Início, Pessoas, Edições, Programa, Formulários, Parceiros) com abas do grupo logo abaixo; "Configurações" (Textos, regras e privacidade) e "Ver o site" no canto direito. Contador saiu do menu (a home usa o número fixo +300). Formulários mostra as categorias Externos e Interno (Staff); Staff também é aba de Formulários.

### 03/11/2026, Claude Code — parceiro compacto
- Cartão do parceiro menor (logo 64px, descrição em 2 linhas, canais 36px). A vantagem mostra só "Exclusivo para a comunidade", o valor e o cupom; título e condições ficam em "Ver detalhes da vantagem" (lista suspensa). Carimbo do cartão de convite maior, com o texto do meio dentro do círculo.

### 03/11/2026, Claude Code — espaço do membro refinado
- Parceiros: no espaço do membro aparece o **logo original** (`communicali_partner_profiles.logo_original_url`, preenchido para os 4 parceiros; o site continua com o branco de `partners.logo_url`). Novo parceiro cadastrado no painel salva os dois. Logo inteiro na moldura (contain), canais numa linha só, abaixo do nome; vantagem em bloco vinho com desconto dourado e cupom em destaque. Migração `20261103210000`.
- Missões: selo redondo próprio (cor e ícone por missão, "MISSÃO" em arco, marca dourada quando conquistado), resumo "X de 6 concluídas" com barra, grupos Para começar / Rumo a Conector / Rumo a Embaixador.
- Convite: cartão novo ("Tem um lugar para você nessa mesa.", carimbo redondo Café & Pessoas no canto, faixa de cores, bilhete com picote); bloco do código na aba Indicar virou bilhete vinho. Aplicado o limite de 2 trocas do código (migração `20261103220000`, rascunho etapa_7).
- Rede: filtro "Mostrar: Minhas conexões" e "Indicar {nome} para alguém" no perfil (alerta tipo `perfil` para quem recebe, com Ver perfil; limite de uma vez por dia por par). Migração `20261103230000`. Sem e-mail por enquanto.
- Conferido no celular com Membro de teste (removido): Missões, vitrine de parceiros, Indicar e cartão. Não conferidos com dados reais: bloco de vantagem/cupom (nenhum parceiro tem vantagem cadastrada) e indicar perfil (exige Conector).

### 03/11/2026, Claude Code — agradecimento enviado e texto mais fino
- **Enviado** o agradecimento aos 13 inscritos sem contato (13 enviados, 0 erros), com aprovação de Patrícia.
- Texto dos e-mails em 15px (era 17px) e `semViuva()` junta as duas últimas palavras de cada parágrafo, para nenhuma linha terminar com uma palavra sozinha no celular. Regra dela: atenção aos detalhes da estrutura do texto em todo conteúdo.

### 03/11/2026, Claude Code — boas-vindas enviadas, rastreio e agradecimento
- **Enviado** em 03/11 o e-mail de boas-vindas aos 25 contatados da 1ª edição (25 enviados, 0 erros), com aprovação de Patrícia.
- Rastreio próprio (a API da Resend não aceitou ligar o rastreio do domínio): `api/o.js` (imagem de 1 pixel, marca `email_log.aberto_em`) e `api/r.js` (clique, marca `clicado_em`, só redireciona para domínios conhecidos). `rastrear()` em `enviarUmaVez`. Migração `20261103200000`. Painel de Edições, cartão "Envios e acompanhamento": tabela com nome, e-mail, tipo, envio, abriu e clicou.
- Novo e-mail `agradecimento` para os 13 inscritos sem contato (1ª edição fechada, convite para as próximas, botão para o site, sem foto). Teste enviado a Patrícia; envio aguarda aprovação dela (botão "Agradecimento aos sem contato" no painel).

### 03/11/2026, Claude Code — boas-vindas final, parar de receber e foto
- Boas-vindas com o texto e a formatação de Patrícia (itálico, negrito, sublinhado), botão "Acesse o site", assunto "Boas-vindas à ComuniCALI, Nome!". Etiquetas com degradê vivo; fontes Funnel Display/Inter carregadas (Gmail troca por Helvetica). Rodapé de todos: itálico, negrito e "Este é um e-mail automático. Por favor, não responda."; quem não puder ir avisa pelo WhatsApp.
- Parar de receber: só nos avisos do espaço do membro (`layoutSimples`: conexão, sugestão, indicações). Link assinado com HMAC do `CRON_SECRET` → `api/descadastro.js`, grava em `email_descadastro` (migração `20261103190000`); `enviar()` pula quem saiu e manda `List-Unsubscribe`. Lista "Pararam de receber e-mails" no Início do painel. Link inválido testado (400); link válido só será testado pelo botão "Enviar teste para mim" da edição, que agora inclui um aviso de conexão.
- Foto do café nos e-mails recortada mais para cima (letreiro visível).
- Envio das boas-vindas: decisão de Patrícia, só para os **25 contatados** (`acionado`), ainda não enviado.

### 03/11/2026, Claude Code — e-mails revisados e grafia ComuniCALI
- Publicado `dpl_AcDdMQG4atcGhX3GWZAYbZjN1crC`. Grafia oficial: **ComuniCALI, com um M**, em todos os textos do site, e-mails, formulários, regras, privacidade e código de acesso (identificadores técnicos como `communicali` e nomes de arquivo continuam iguais). Migração `20261103180000`.
- E-mails: "Inscrição recebida" e "Lista de espera" sem o bloco Quando/Onde; menos emojis (sem emoji no botão e nos rótulos); "Convite de agenda" deixou de existir e o botão do painel em Edições agora envia **Boas-vindas** (tipo `boasvindas`, uma vez por pessoa, sem data e local); lembrete automático passou para a véspera (sexta 13/11 para o encontro de sábado 14/11), com local e botão de agenda; e-mail de conexão com a frase final em negrito.
- Prévia dos 10 e-mails: `~/Downloads/CommuniCALI_para_outra_IA/emails-communicali.html` (gerada por `api/_email.js`).
- Aguardando: aprovação de Patrícia para enviar as boas-vindas hoje aos 38 inscritos da 1ª edição.

### 03/11/2026, Claude Code — apresentação de parceiros só no formulário
- Publicado `dpl_8oAmhc58C4U7ouMc3X2eyoV6E7Cy`. Saiu da home o link "Ver apresentação para parceiros". Na primeira etapa do formulário `parceiros-communicali` aparece um cartão com a capa (`public/communicali/seja-parceiro-capa.jpg`) e "Abrir apresentação". Novo campo opcional `attachment` {url, cover, title, text} nas perguntas de texto (`formModel.ts`, `PublicFormPage.tsx`, migração `20261103170000`). O editor de formulários do painel não mostra esse campo, mas o preserva ao salvar.

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
