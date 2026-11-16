# Álbum da edição: visual pronto (Claude Code) e o que falta ligar

Visual aprovado pela Patrícia em 15/11/2026, em `src/components/GaleriaDoEncontro.tsx` e `src/components/AlbumAcessoVisual.tsx` (CSS `src/galeria-encontro.css`). Quem liga a lógica NÃO deve redesenhar: use os componentes e passe os callbacks.

Estados do acesso (`EstadoAlbum`): `entrar` (campo de e-mail do check-in, sem código), `termo` (primeiro acesso: lista do termo e caixa de aceite), `confirmado` (já aceitou: botão que abre o link do álbum), `nao-encontrado`, `preparando` (sem link ainda).

Regras pedidas:
- Acesso só com o e-mail que bate com a lista de check-in da edição. Sem código por e-mail.
- Aviso permanente: álbum de uso exclusivo de quem participou; reprodução por terceiros não autorizada.
- Antes do primeiro acesso, aceite do termo. **Guardar o aceite** (e-mail, edição, data/hora) e **registrar cada acesso e cada clique** no link (quem e quantas vezes).
- Depois do aceite, redirecionar ao link onde estão as fotos (Drive ou outro).
- A galeria de prévia mostra algumas fotos públicas; ao confirmar, mostra a grade completa (`completa`).
- Hoje o bloco só aparece na prévia com `?moldura=1`; ao ligar, tirar essa trava em `Edicao.tsx` (e o painel de demonstração `gal__demo`).
