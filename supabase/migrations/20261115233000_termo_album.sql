-- Termo de ciência do álbum de fotos (15/11/2026). Aberto em outra aba, como as políticas.
alter table public.site_settings add column if not exists termo_album_texto text not null default '';
update public.site_settings set termo_album_texto = $t$Este termo explica como usar o álbum de fotos dos encontros da ComuniCALI. Versão de 15 de novembro de 2026.

## 1. Para quem é o álbum

O álbum é de uso exclusivo de quem participou do encontro, para uso pessoal. O acesso é feito com o e-mail usado no check-in. Não compartilhe o link do álbum.

## 2. O que não é permitido

A reprodução das fotos, a venda e o uso por terceiros não são autorizados.

## 3. Uso de imagem pela CALI RH

A CALI RH pode usar imagens dos encontros em cases e nas redes sociais, conforme a autorização que você deu no formulário preenchido no check-in. Se você não se lembra do que autorizou, ou quer mudar de ideia, fale com a organização.

## 4. Seus registros

Registramos quem acessa o álbum, quantas vezes, e a data em que você confirmou este termo, para cuidar da privacidade das fotos. Veja também a Política de privacidade.

## 5. Retirada de fotos

Não quer aparecer em alguma foto? Fale com a organização e retiramos.

## 6. Dúvidas

Escreva para contato@calirh.com.
$t$, updated_at = now();
