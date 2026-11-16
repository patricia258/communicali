# Álbum da edição: visual pronto (Claude Code) e o que falta ligar

Visual aprovado pela Patrícia em 15/11/2026, em `src/components/GaleriaDoEncontro.tsx` e `src/components/AlbumAcessoVisual.tsx` (CSS `src/galeria-encontro.css`). Quem liga a lógica NÃO deve redesenhar: use os componentes e passe os callbacks.

Estados do acesso (`EstadoAlbum`): `entrar` (campo de e-mail do check-in, sem código), `termo` (primeiro acesso: caixa "li e estou ciente" com link para `/termo-album`, que abre em outra aba), `confirmado` (já aceitou: botão que abre o link do álbum), `nao-encontrado`, `preparando` (sem link ainda).

Regras pedidas:
- Acesso só com o e-mail que bate com a lista de check-in da edição. Sem código por e-mail.
- Aviso permanente: álbum de uso exclusivo de quem participou; reprodução por terceiros não autorizada.
- Antes do primeiro acesso, ciência do termo (texto em `site_settings.termo_album_texto`, página `/termo-album`). **Guardar a confirmação** (e-mail, edição, data/hora) e **registrar cada acesso e cada clique** no link (quem e quantas vezes).
- Depois do aceite, redirecionar ao link onde estão as fotos (Drive ou outro).
- A galeria de prévia mostra algumas fotos públicas; ao confirmar, mostra a grade completa (`completa`).
- Hoje o bloco só aparece na prévia com `?moldura=1`; ao ligar, tirar essa trava em `Edicao.tsx` (e o painel de demonstração `gal__demo`).

## Atualização (15/11/2026, noite): frontend real pronto
- `src/components/AlbumDoEncontro.tsx` já usa o contrato de `docs/ALBUNS_ENCONTROS.md`: `album_previa` (prévia pública), `album_fotos` (e-mail do check-in, `request_id` novo por tentativa) e `album_abrir` (clique e redirecionamento). Sem código, sem Supabase Auth, e-mail só no corpo da requisição.
- Trava em `src/pages/Edicao.tsx`: `const ALBUM_REAL = false`. Com `?album=1` o fluxo real roda contra a API (só funciona depois que `api/_album.js` e a migração estiverem no ar). Com `?moldura=1` aparece a demonstração visual. **Trocar `ALBUM_REAL` para `true` junto com a publicação da migração, do painel e do backend.**
- O frontend envia `ciente: true` em `album_abrir`. **O backend precisa gravar essa confirmação** (e-mail informado, edição, data e hora). Hoje a ciência também fica lembrada no aparelho (`localStorage album-ciente:<slug>`), mas só o servidor guarda de verdade.
- Na pasta compartilhada `communicali-home-nova`, o `Edicao.tsx` sem commit ainda importa `FotosDoEncontro` (versão antiga, com código por e-mail). Ao integrar, trocar por `AlbumDoEncontro` e apagar `FotosDoEncontro.tsx` e `lib/album.ts` (OTP).
- Testado no navegador com respostas simuladas: e-mail sem check-in, e-mail válido, termo, aceite e redirecionamento.
