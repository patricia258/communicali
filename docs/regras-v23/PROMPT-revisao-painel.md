# Comando para revisar e melhorar o painel da ComuniCALI

Cole tudo abaixo em uma nova sessão de IA (de preferência Claude Code, aberto na pasta do projeto).

---

Você vai revisar e melhorar o **painel administrativo da ComuniCALI** (comuni.calirh.com/admin). A dona do projeto é Patrícia Lima (Pati). Ela fala português simples e reprovou a versão atual: "ainda parece confuso e não tem a estética Apple que o nosso site tem". Responda sempre em português, em frases curtas e sem jargão.

## 1. Onde está o código
- Pasta: `~/CALI/communicali-home-nova` (branch `home-nova`). A `main` em `~/CALI/communicali` é atualizada por fast-forward a partir dela.
- Stack: Vite, React 18, TypeScript, react-router, Supabase (projeto `cyyrrtekbkltdiatixhp`), Vercel (projeto `communicali`, time `cali11`).
- Arquivos do painel: `src/pages/Admin.tsx` (moldura, rotas, edições), `src/pages/AdminPainel.tsx` (menu lateral, Início, abas, telas "Em breve", lista "O que falta construir"), `src/pages/AdminPrograma.tsx` (Membros e ficha da pessoa), `AdminTabela.tsx` (tabela), `AdminPessoasEdicao.tsx`, `AdminEmails.tsx`, `AdminRecomendacoes.tsx`, `src/forms/AdminFormsPage.tsx`.
- Estilo: `src/identidade.css` (carregado por último, vence os outros). O bloco "Painel" no fim do arquivo é o mais recente. `src/pages/admin.css` e `src/forms/admin-forms.css` são antigos e brigam com ele.
- Leia antes: `docs/HANDOFF.md` (as entradas de 15/11/2026), `docs/regras-v23/LEIA.md`, `docs/regras-v23/mapa-do-painel.html`, `docs/regras-v23/parte-1-regras-e-politicas.html`, `docs/regras-v23/parte-2-emails-do-fluxo.html`.

## 2. Regras de trabalho (obrigatórias)
- Este projeto é conectado ao Lovable. **Nunca reescreva histórico já publicado** (sem force push, rebase ou amend de commit enviado). Commits na branch conectada aparecem no Lovable, então mantenha a branch funcionando.
- **Mudanças no banco de produção só com aviso explícito da Patrícia.** Mudanças só de tela não precisam. Nada de criar usuários de teste ou dados falsos no banco real.
- Não invente dados, prazos, preços ou texto jurídico. Onde o documento não define, escreva "a definir com a administração da comunidade".
- Não altere regras de acesso, textos legais publicados, nem e-mails de staff e fornecedor.
- Preferências fixas dela: cartões nunca se encostam (distância mínima e bordas alinhadas em toda tela); barras de rolagem escondidas; avisos no fim da página; informação compacta; formulário único em vez de vários; sem mostarda.
- Texto de interface em português, na voz da CALI: simples, sem travessão, sem frases de efeito.

## 3. A queixa e o que ela quer
1. "Parece confuso." O painel precisa ser entendido em 5 segundos: o que é cada seção, o que fazer agora, onde está cada coisa.
2. "Sem a estética Apple do site." O site (comuni.calirh.com) usa muito espaço em branco, títulos grandes em Funnel Display, filetes finos em vez de caixas, céu claro (#D3E3F2 e #C6DAEA) só em destaques, bordô (#5A1E2D) só no que está ativo, tinta (#1B0A10) nos botões em pílula, canto assimétrico `6px 6px 26px 6px` nos blocos, movimento sutil. O painel deve parecer da mesma família.
3. Ela deu esta **referência**: https://refero.design/pages/38d081cd-7df0-4da0-a0ce-a60d073ec39e (painel do Spyglass: página "Team" em Settings). O que copiar da referência:
   - Barra lateral clara e fina, com logo no topo, um botão de ação principal logo abaixo, itens com **ícone pequeno e rótulo**, grupos bem separados e um item de apoio (Suporte) e o usuário no rodapé.
   - Em Configurações, uma **segunda coluna de navegação** (General, Alerts, Team, Billing, API) ao lado do conteúdo, em vez de abas horizontais.
   - Cabeçalho da página: título pequeno e forte, uma linha de apoio em cinza, e à direita um seletor e **um único botão escuro em pílula**.
   - Conteúdo dentro de **um bloco limpo**: cabeçalho do bloco com avatar, nome editável e etiqueta (ex.: Pro), depois uma tabela de 3 a 4 colunas com etiquetas de contorno (Admin, Pending), menu "..." por linha, ícone vermelho para apagar.
   - Aviso rápido (toast) no canto inferior direito ("Invites sent").
   - Tudo muito calmo, poucas cores, muito respiro.

## 4. O que está feito e o que ela achou ruim
Feito (publicado em 15/11/2026): menu lateral em texto, páginas Início, Edições, Pessoas, Aprovações, Programa, Rede, E-mails, Formulários, Site, App, Configurações; edição em abas; ficha da pessoa com estágio, contador de presenças pré-Membro e decisão de adesão; lista "O que falta construir".
Problemas que ela vê e você deve resolver:
- Menu sem ícones, com muitos itens parecidos; "Pessoas" e "Programa" confundem.
- Abas horizontais em cima de títulos grandes duplicados (a aba e o título interno repetem a informação).
- Tabela de Membros com 15 colunas e rolagem lateral. Deixe 4 a 5 colunas por padrão, com um menu "Colunas" e a ficha para o resto.
- Páginas ainda com blocos de estilos diferentes (cada componente antigo tem o seu visual).
- A tela de edição ainda tem muita coisa por aba. Dê um topo com o essencial (data, local, vagas, situação, quantos confirmados) e deixe o detalhe para as abas.
- Falta ligação entre as telas ("o que fazer agora" nem sempre leva ao lugar certo).

## 5. Regras de negócio novas (documento-mestre v23, 15/11/2026)
- Trilha: **Convidado ou Visitante (entrada) → Membro → Conector → Embaixador (pertencimento)**. Convidado e Visitante não são níveis, são portas de entrada.
- Até **2 presenças** pré-Membro, somando Convidado e Visitante, só com check-in validado, em atividade aberta e gratuita. Dá para pedir adesão depois da primeira presença.
- Virar Membro exige pedido ("Quero ser Membro"), cadastro mínimo, aceite dos termos e da privacidade e **validação da organização** (por enquanto só a Patrícia). Retorno: aprovada, ajustes ou não aprovada, sempre com motivo.
- Milhas só contam a partir da adesão aprovada. Presenças anteriores ficam no histórico.
- Membros têm janela de inscrição antecipada (padrão 48 h, ajustável por edição) antes da abertura geral.
- Ser Membro é gratuito e continua gratuito. Nada de preço, assinatura ou kit prometidos.
- Banco já tem (aplicado): `members.estagio_entrada`, `adesao_status`, `adesao_origem`, `adesao_solicitada_em`, `adesao_decidida_em`, `adesao_motivo`, `na_comunidade_whatsapp`; `editions.elegivel_pre_membro`; tabela `adesao_log`; view `members_ficha`; função `communicali_decidir_adesao`.
- Dados: quem foi à 1ª edição como "membro" virou Visitante; 3 convidados marcados; Conector, Embaixador e Fundadora seguem Membro (legado).

## 6. O que ainda NÃO está feito (não esconda, mostre em "O que falta construir")
Fluxo (parte 4): check-in ainda dá acesso total ao passaporte; falta o botão "Quero ser Membro" no app; bloqueio após 2 presenças; janela de Membros e lista de espera por edição; milhas só após adesão (decisão pendente da Patrícia sobre as milhas já lançadas dos visitantes).
E-mails: os 12 modelos do fluxo existem em `emailFluxo()` (`api/_email.js`) mas não estão ligados a nenhum envio; modelos editáveis no painel.
Site: o texto do site, a página `/termos` e a Política de Privacidade **não foram atualizados** com as regras v23 (só existem minutas). A home ainda é texto fixo no código.
Painel: equipe do painel (acesso de parceira), registro de alterações, criar e editar missões, níveis e selos.
Rotina de boas-vindas que hoje é por WhatsApp: confirmação por e-mail, link da comunidade, checklist de pendências (foto etc.). O sistema não consegue ver quem está no grupo do WhatsApp, então fica um marcador manual na ficha.

## 7. Como trabalhar
1. Leia os arquivos da seção 1 e abra o painel para ver o estado real. Para ver telas logadas sem mexer no banco, crie localmente (e **nunca commite**) um `src/__mock.ts` que intercepta `fetch` para `cyyrrtekbkltdiatixhp.supabase.co` (rpc `is_admin` devolve true, tabelas devolvem dados de exemplo, HEAD devolve `Content-Range`) e uma sessão falsa em `localStorage` (`sb-cyyrrtekbkltdiatixhp-auth-token`). Importe-o no topo de `src/main.tsx` só durante o teste e apague depois.
2. Rode `npx vite --port 5199` e confira em 1440 px e em 390 px de largura. Desligue animações para tirar print.
3. Proponha **primeiro** em texto curto o desenho que fará (menu, página, bloco, tabela, cabeçalho), em até 15 linhas, e siga sem esperar resposta se não houver dúvida de negócio.
4. Defina **um** padrão de página e de bloco e aplique em todas as telas, em vez de ajustar uma por uma.
5. Ícones: `lucide-react` já está no projeto.
6. Antes de publicar: `npx tsc --noEmit` e `npx vite build` sem erro; remova o mock.
7. Publicar: commit na `home-nova`; `vercel deploy --prod --skip-domain --yes --build-env VITE_SUPABASE_URL=... --build-env VITE_SUPABASE_KEY=...` (valores em `.env.local`, não imprimir); `vercel promote <url> --yes`; depois `git -C ~/CALI/communicali merge --ff-only home-nova`.
8. Registre em `docs/HANDOFF.md` uma entrada datada e atualize a constante `FALTA` em `AdminPainel.tsx`.

## 8. Critérios de aceite
- Quem abre o painel entende em 5 segundos onde está e o que fazer agora.
- Todas as telas têm o mesmo cabeçalho, o mesmo bloco e a mesma tabela.
- Nenhuma tabela precisa de rolagem lateral em 1440 px.
- Parece da mesma família do site, no nível de acabamento da referência do Spyglass.
- Nada do que a Patrícia pediu foi perdido: tudo o que existe continua funcionando e tudo o que falta está listado.
- No fim, responda a ela em português simples: o que mudou, o que ainda falta, e uma pergunta só, se precisar.
