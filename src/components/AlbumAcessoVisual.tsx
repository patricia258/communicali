/* Visual do acesso ao álbum da edição, em quatro estados: entrar, confirmado, e-mail não encontrado e álbum em preparo.
   É só a cara: quem confere o e-mail com a lista de check-in e abre o álbum liga os callbacks. */
import { useState } from 'react';
import { Check, Download, LockKeyhole } from 'lucide-react';

export type LinkAlbum = { id: string; rotulo: string };
const LINK_PADRAO: LinkAlbum[] = [{ id: 'fotos', rotulo: 'Acesse aqui as suas fotos' }];

export type EstadoAlbum = 'entrar' | 'termo' | 'confirmado' | 'nao-encontrado' | 'preparando';
const ZAP = 'https://wa.me/554187879244';
const INSTA = <a href="https://www.instagram.com/calirh_/" target="_blank" rel="noopener noreferrer">@calirh_</a>;

const AVISO = 'O álbum é de uso exclusivo de quem participou deste encontro. A reprodução por terceiros não é autorizada.';

/** Primeiro acesso: ciência do termo (abre em outra aba, como as políticas). A confirmação (e-mail, edição, data e hora) precisa ser guardada por quem liga o álbum. */
function Termo({ email, links, aoAceitar, aoTrocar, ocupado, mensagem }: { email: string; links: LinkAlbum[]; aoAceitar: (id: string) => void; aoTrocar: () => void; ocupado?: boolean; mensagem?: string }) {
  const [ciente, setCiente] = useState(false);
  return (
    <>
      <h3>Antes de abrir o álbum</h3>
      <p className="gal__ok"><Check size={16} aria-hidden="true" /> {email || 'seu@email.com'}</p>
      <p>Conferimos o seu check-in. Só falta confirmar que você leu o termo de ciência do álbum.</p>
      <label className="gal__aceite"><input type="checkbox" checked={ciente} onChange={(event) => setCiente(event.target.checked)} /><span>Li e estou ciente do <a href="/termo-album" target="_blank" rel="noopener noreferrer">termo de ciência do álbum</a>.</span></label>
      {mensagem && <p role="alert" className="gal__erro">{mensagem}</p>}
      <div className="gal__acoes">
        {links.map((l) => <button key={l.id} className="hn-pill" type="button" disabled={!ciente || ocupado} onClick={() => aoAceitar(l.id)}><Download size={16} aria-hidden="true" /> {ocupado ? 'Abrindo…' : l.rotulo}</button>)}
        <button className="gal__link" type="button" onClick={aoTrocar}>Usar outro e-mail</button>
      </div>
    </>
  );
}

export function AlbumAcessoVisual({ estado, email, setEmail, aoEntrar, aoTrocar, aoAbrir, aoAceitar, ocupado, mensagem, links = LINK_PADRAO }: { estado: EstadoAlbum; email: string; setEmail: (valor: string) => void; aoEntrar: () => void; aoTrocar: () => void; aoAbrir: (id: string) => void; aoAceitar: (id: string) => void; links?: LinkAlbum[]; ocupado?: boolean; mensagem?: string }) {
  if (estado === 'termo') return <Termo email={email} links={links} aoAceitar={aoAceitar} aoTrocar={aoTrocar} ocupado={ocupado} mensagem={mensagem} />;
  if (estado === 'confirmado' || estado === 'preparando') return (
    <>
      <h3>Check-in confirmado!</h3>
      <p className="gal__ok"><Check size={16} aria-hidden="true" /> {email || 'seu@email.com'}</p>
      {estado === 'confirmado' ? (
        <>
          <p>Que bom ter você com a gente! Abra o álbum para baixar os seus registros, e não deixe de marcar o nosso {INSTA}, hein!</p>
          <p className="gal__aviso"><LockKeyhole size={15} aria-hidden="true" /> {AVISO}</p>
          <div className="gal__acoes">
            {links.map((l) => <button key={l.id} className="hn-pill" type="button" disabled={ocupado} onClick={() => aoAbrir(l.id)}><Download size={16} aria-hidden="true" /> {ocupado ? 'Abrindo…' : l.rotulo}</button>)}
            <button className="gal__link" type="button" onClick={aoTrocar}>Usar outro e-mail</button>
          </div>
          {mensagem && <p role="alert" className="gal__erro">{mensagem}</p>}
          <p className="gal__nota">Você já confirmou o termo de ciência. Registramos quem acessa o álbum, para cuidar da privacidade das fotos.</p>
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
        {mensagem && estado !== 'nao-encontrado' && <p role="alert" className="gal__erro">{mensagem}</p>}
        <div><button className="hn-pill" type="submit" disabled={ocupado}>{ocupado ? 'Conferindo seu check-in…' : 'Ver o álbum'}</button></div>
      </form>
    </>
  );
}
