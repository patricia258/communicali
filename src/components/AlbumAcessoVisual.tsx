/* Visual do acesso ao álbum da edição, em quatro estados: entrar, confirmado, e-mail não encontrado e álbum em preparo.
   É só a cara: quem confere o e-mail com a lista de check-in e abre o álbum liga os callbacks. */
import { Check, Download } from 'lucide-react';

export type EstadoAlbum = 'entrar' | 'confirmado' | 'nao-encontrado' | 'preparando';
const ZAP = 'https://wa.me/554187879244';
const INSTA = <a href="https://www.instagram.com/calirh_/" target="_blank" rel="noopener noreferrer">@calirh_</a>;

export function AlbumAcessoVisual({ estado, email, setEmail, aoEntrar, aoTrocar, aoAbrir }: { estado: EstadoAlbum; email: string; setEmail: (valor: string) => void; aoEntrar: () => void; aoTrocar: () => void; aoAbrir: () => void }) {
  if (estado === 'confirmado' || estado === 'preparando') return (
    <>
      <h3>Check-in confirmado!</h3>
      <p className="gal__ok"><Check size={16} aria-hidden="true" /> {email || 'seu@email.com'}</p>
      {estado === 'confirmado' ? (
        <>
          <p>Que bom ter você com a gente! Abra o álbum para baixar os seus registros, e não deixe de marcar o nosso {INSTA}, hein!</p>
          <div className="gal__acoes">
            <button className="hn-pill" type="button" onClick={aoAbrir}><Download size={16} aria-hidden="true" /> Abrir o álbum e baixar as fotos</button>
            <button className="gal__link" type="button" onClick={aoTrocar}>Usar outro e-mail</button>
          </div>
          <p className="gal__nota">Registramos quem acessa o álbum, para cuidar da privacidade das fotos.</p>
        </>
      ) : (
        <>
          <p>O álbum completo ainda está sendo preparado. Volte em breve, avisamos no grupo da comunidade!</p>
          <div className="gal__acoes"><button className="gal__link" type="button" onClick={aoTrocar}>Usar outro e-mail</button></div>
        </>
      )}
    </>
  );
  return (
    <>
      <h3>Você esteve nessa edição?</h3>
      <p>Acesse o álbum completo e baixe os seus registros. Não deixe de marcar o nosso {INSTA}, hein!</p>
      <p>Informe o e-mail que você usou no check-in e pronto.</p>
      <form onSubmit={(event) => { event.preventDefault(); aoEntrar(); }}>
        <label>E-mail do check-in<input type="email" autoComplete="email" placeholder="seu@email.com" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={estado === 'nao-encontrado'} /></label>
        {estado === 'nao-encontrado' && <p role="alert" className="gal__erro">Não encontramos esse e-mail no check-in. Confira se é o mesmo que você usou no dia do encontro. Se esteve com a gente e não conseguiu entrar, <a href={ZAP} target="_blank" rel="noopener noreferrer">fale com a organização</a>.</p>}
        <div><button className="hn-pill" type="submit">Ver o álbum</button></div>
      </form>
    </>
  );
}
