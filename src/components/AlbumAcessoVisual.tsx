/* Visual do acesso ao álbum da edição, em quatro estados: entrar, confirmado, e-mail não encontrado e álbum em preparo.
   É só a cara: quem confere o e-mail com a lista de check-in e abre o álbum liga os callbacks. */
import { useState } from 'react';
import { Check, Download, LockKeyhole } from 'lucide-react';

export type EstadoAlbum = 'entrar' | 'termo' | 'confirmado' | 'nao-encontrado' | 'preparando';
const ZAP = 'https://wa.me/554187879244';
const INSTA = <a href="https://www.instagram.com/calirh_/" target="_blank" rel="noopener noreferrer">@calirh_</a>;

const AVISO = 'O álbum é de uso exclusivo de quem participou deste encontro. A reprodução por terceiros não é autorizada.';

/** Termo mostrado no primeiro acesso. O aceite (data, e-mail e edição) precisa ser guardado por quem liga o álbum. */
function Termo({ email, aoAceitar, aoTrocar }: { email: string; aoAceitar: () => void; aoTrocar: () => void }) {
  const [aceito, setAceito] = useState(false);
  return (
    <>
      <h3>Antes de abrir o álbum</h3>
      <p className="gal__ok"><Check size={16} aria-hidden="true" /> {email || 'seu@email.com'}</p>
      <p>Conferimos o seu check-in. Só falta ler e aceitar o termo de uso das fotos.</p>
      <ul className="gal__termo">
        <li>O álbum é de <b>uso exclusivo de quem participou</b> deste encontro, para uso pessoal.</li>
        <li>A <b>reprodução, a venda e o uso por terceiros não são autorizados</b>.</li>
        <li>Ao postar, marque o nosso <a href="https://www.instagram.com/calirh_/" target="_blank" rel="noopener noreferrer">@calirh_</a>.</li>
        <li>Registramos quem acessa o álbum e quantas vezes, para cuidar da privacidade das fotos.</li>
        <li>Não quer aparecer em alguma foto? Fale com a organização e retiramos.</li>
      </ul>
      <label className="gal__aceite"><input type="checkbox" checked={aceito} onChange={(event) => setAceito(event.target.checked)} /><span>Li e aceito o termo de uso do álbum.</span></label>
      <div className="gal__acoes">
        <button className="hn-pill" type="button" disabled={!aceito} onClick={aoAceitar}><Download size={16} aria-hidden="true" /> Aceitar e abrir o álbum</button>
        <button className="gal__link" type="button" onClick={aoTrocar}>Usar outro e-mail</button>
      </div>
    </>
  );
}

export function AlbumAcessoVisual({ estado, email, setEmail, aoEntrar, aoTrocar, aoAbrir, aoAceitar }: { estado: EstadoAlbum; email: string; setEmail: (valor: string) => void; aoEntrar: () => void; aoTrocar: () => void; aoAbrir: () => void; aoAceitar: () => void }) {
  if (estado === 'termo') return <Termo email={email} aoAceitar={aoAceitar} aoTrocar={aoTrocar} />;
  if (estado === 'confirmado' || estado === 'preparando') return (
    <>
      <h3>Check-in confirmado!</h3>
      <p className="gal__ok"><Check size={16} aria-hidden="true" /> {email || 'seu@email.com'}</p>
      {estado === 'confirmado' ? (
        <>
          <p>Que bom ter você com a gente! Abra o álbum para baixar os seus registros, e não deixe de marcar o nosso {INSTA}, hein!</p>
          <p className="gal__aviso"><LockKeyhole size={15} aria-hidden="true" /> {AVISO}</p>
          <div className="gal__acoes">
            <button className="hn-pill" type="button" onClick={aoAbrir}><Download size={16} aria-hidden="true" /> Abrir o álbum e baixar as fotos</button>
            <button className="gal__link" type="button" onClick={aoTrocar}>Usar outro e-mail</button>
          </div>
          <p className="gal__nota">Você já aceitou o termo de uso. Registramos quem acessa o álbum, para cuidar da privacidade das fotos.</p>
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
      <p className="gal__aviso"><LockKeyhole size={15} aria-hidden="true" /> {AVISO}</p>
      <form onSubmit={(event) => { event.preventDefault(); aoEntrar(); }}>
        <label>E-mail do check-in<input type="email" autoComplete="email" placeholder="seu@email.com" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={estado === 'nao-encontrado'} /></label>
        {estado === 'nao-encontrado' && <p role="alert" className="gal__erro">Não encontramos esse e-mail no check-in. Confira se é o mesmo que você usou no dia do encontro. Se esteve com a gente e não conseguiu entrar, <a href={ZAP} target="_blank" rel="noopener noreferrer">fale com a organização</a>.</p>}
        <div><button className="hn-pill" type="submit">Ver o álbum</button></div>
      </form>
    </>
  );
}
