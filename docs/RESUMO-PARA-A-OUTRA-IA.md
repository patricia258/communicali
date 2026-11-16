# Resumo para a outra IA (Claude Code, 15/11/2026, noite)

Quem faz o quê, combinado com a Patrícia: **Claude Code** cuida do visual (identidade, site, app e a cara do painel), das regras v23, dos e-mails do fluxo e dos textos. **Você** cuida das funções do painel, das ligações entre as partes e do álbum de fotos. Qualquer mudança de visual em tela nova, combine com ela antes ou deixe comigo.

## Já está feito e no ar (produção = deploy 9qsosbp9u, bundle index-B3vzhE7B)
- Identidade nova (bordô #5A1E2D, tinta #1B0A10, céu #D3E3F2, Funnel Display e Inter) em home, e-mails, app e painel. CSS global em `src/identidade.css` (carrega por último).
- Painel: menu lateral, páginas em abas (Edições, Pessoas, Aprovações, Programa, Rede, E-mails, Formulários, Site, App, Configurações), ficha da pessoa com estágio, contador de visitas e decisão de adesão. Lista "O que falta construir" em Configurações (constante `FALTA` em `AdminPainel.tsx`): mantenha atualizada.
- Regras v23 no sistema: não existem Membros (só a Patrícia, Fundadora); todos os outros são Visitante ou Convidado; só check-in conta como visita; até 2 visitas; pedido "Quero fazer parte da comunidade" (nunca "Quero ser Membro"); milhas só depois da adesão, sem crédito retroativo; Rede só para quem faz parte; passaporte trancado até 19/11 (`site_settings.passaporte_aberto`).
- Banco (migrações em `supabase/migrations/20261115*`): `members.estagio_entrada`, `adesao_*`, `na_comunidade_whatsapp`; `editions.elegivel_pre_membro`; `adesao_log`; view `members_ficha`; funções `communicali_decidir_adesao`, `communicali_pedir_adesao`, `communicali_presencas_pre_membro`, `communicali_faltou_antes`; check-in e passaporte alterados. Textos oficiais em `site_settings` (regras, privacidade, `termos_texto`), página `/termos`.
- E-mails: `emailFluxo()` em `api/_email.js` (12 modelos); saem sozinhos via `api/avisos.js`: pedido recebido, aprovado, ajustes, não aprovado, aviso à organização, e depois da 1ª e da 2ª visita.
- Área "Minha visita" (`src/pages/AdesaoMembro.tsx`) para Visitante e Convidado em `/meu-passaporte`.
- Dados de teste removidos do banco real (backup em `~/CALI/backup-dados-de-teste-2026-11-15.json`). Ficaram a Patrícia e as 16 pessoas com check-in da 1ª edição.

## Estado do código (importante)
- `home-nova` (HEAD 0b18a1a) = o que está publicado.
- Branch `site-revisao` (worktree `~/CALI/communicali-site-revisao`, 3 commits, NÃO mesclada, NÃO publicada): FAQ enxuto, seção "O programa", selos com legenda, textos sem Membros, abertura do formulário "Quero fazer parte!" e sem a linha "N perguntas · X min". Prévia: communicali-6h4jihdvg-cali11.vercel.app. Mesclar na `home-nova` só quando a Patrícia mandar.
- Seus arquivos sem commit na pasta `communicali-home-nova` (álbum, painel, custos, `Edicao.tsx`, `identidade.css`, `home-nova.css`, `docs/HANDOFF.md`) não foram tocados por mim depois disso. Arquivos que nós dois editamos: `identidade.css`, `Edicao.tsx` (eu: recado de quem faltou na inscrição), `docs/HANDOFF.md`. Ao commitar, junte com cuidado.

## Regras de trabalho
- Projeto ligado ao Lovable: nunca reescrever histórico publicado (sem force push, rebase ou amend de commit enviado).
- Mudança no banco de produção só com o aviso da Patrícia, e anote em `docs/HANDOFF.md`. Não invente dados nem texto jurídico: use "a definir com a administração da comunidade".
- Publicar: `vercel deploy --prod --skip-domain` a partir de uma cópia limpa do commit (`git archive`), com `--build-env VITE_SUPABASE_URL/VITE_SUPABASE_KEY` (de `.env.local`, que é um link: copie com `cp -L`), depois `vercel promote`. Não commitar mocks locais. **Não use `vercel curl`**: cria uma chave de bypass no projeto.
- A Patrícia decide quando algo vai ao ar. Ainda está pendente a decisão de manter o site novo no ar ou voltar à versão antiga (cu5jheyyo) até ela autorizar.

## Álbum de fotos (seu trabalho) e meu pedaço visual
Requisitos dela: acesso só com o e-mail do check-in da edição, sem código; saber quem acessou e quantas vezes; contador de cliques no link de download; na página da edição, uma galeria com algumas fotos de prévia no espaço vazio. Quando seu código estiver commitado, eu desenho a galeria (grade de miniaturas, cantos `6px 6px 26px 6px`, filetes finos, sem caixas pesadas) para não editarmos o mesmo arquivo ao mesmo tempo.
