/* Moldura da galeria de fotos da edição: prévia pública com algumas fotos e, abaixo, o espaço do álbum completo (acesso pelo e-mail do check-in).
   Sem fotos, mostra molduras vazias no mesmo desenho; com fotos, elas entram no lugar. O espaço `acesso` recebe o formulário e os botões do álbum. */
import type { ReactNode } from 'react';
import { Image as Foto } from 'lucide-react';
import '../galeria-encontro.css';

export type FotoPrevia = { id: string; url: string; legenda?: string | null };

export function GaleriaDoEncontro({ fotos, titulo, rotulo, acesso }: { fotos: FotoPrevia[]; titulo: string; rotulo: string; acesso?: ReactNode }) {
  const quadros = Array.from({ length: 4 }, (_, i) => fotos[i] || null);
  return (
    <section className="hn-ed__bloco gal" id="fotos" aria-label="Fotos do encontro">
      <p className="hn-eyebrow">FOTOS</p>
      <h2>Registros do nosso encontro!</h2>
      <p className="hn-ed__lead">Apenas alguns dos momentos da nossa {rotulo}!</p>
      <div className="gal__grade">
        {quadros.map((foto, i) => (
          <figure className={`gal__item gal__item--${i + 1}`} key={foto?.id || i}>
            {foto ? <img src={foto.url} alt={foto.legenda || `Foto do encontro ${titulo}`} loading="lazy" /> : <span className="gal__vazio" aria-hidden="true"><Foto size={22} strokeWidth={1.5} />Foto do encontro</span>}
          </figure>
        ))}
      </div>
      {acesso && <div className="gal__acesso">{acesso}</div>}
    </section>
  );
}
