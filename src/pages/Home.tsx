import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { COMMUNITY_URL, PARTNER_DECK_URL, PARTNER_FORM_URL } from '../lib';

export function Home() {
  const [qr, setQr] = useState('');
  useEffect(() => {
    QRCode.toDataURL(COMMUNITY_URL, { width: 420, margin: 1, color: { dark: '#5A1E2D', light: '#FFFFFF' } }).then(setQr);
  }, []);

  return (
    <div className="home">
      <header className="hero">
        <div className="wrap">
          <img className="hero__mark" src="/brand/cali-lime-mark.svg" alt="" />
          <p className="eyebrow eyebrow--light">Café & Pessoas</p>
          <h1>CommuniCALI</h1>
          <p className="hero__line">Falar de pessoas pode mudar o mundo.</p>
          <p className="hero__text">Encontros presenciais da CALI RH em Curitiba e região, com café na mesa e uma pergunta para conversar.</p>
          <a className="button button--light" href="#comunidade">Entrar na comunidade</a>
        </div>
      </header>

      <section className="wrap section" id="proximo">
        <h2>Próximo encontro</h2>
        <div className="edition">
          <div>
            <p className="eyebrow">1ª edição</p>
            <h3>Edição Fundadora</h3>
          </div>
          <dl className="facts">
            <div><dt>Data</dt><dd>14/11/2026</dd></div>
            <div><dt>Horário</dt><dd>9h às 12h</dd></div>
            <div><dt>Local</dt><dd>Legacy Coffee, Curitiba</dd></div>
          </dl>
        </div>
        <p className="section__note">As inscrições desta edição estão encerradas. A CALI reserva o local e o consumo é por conta de cada pessoa, com mínimo de R$ 30.</p>
      </section>

      <section className="wrap section">
        <h2>O que é a CommuniCALI</h2>
        <p>Cada encontro parte de uma pergunta e acontece na conversa entre as pessoas presentes. Quem veio discorda, conta o que viveu na própria empresa e leva a discussão adiante no grupo da comunidade.</p>
        <p>A porta é aberta para além do RH: lideranças, empreendedores e pessoas de outras áreas interessadas em gestão de pessoas também participam.</p>
      </section>

      <section className="wrap section community" id="comunidade">
        <div>
          <h2>Faça parte da comunidade</h2>
          <p>As conversas continuam no grupo do WhatsApp, e é por lá que saem os avisos dos próximos encontros. Aponte a câmera para o QR Code ou use o botão.</p>
          <a className="button" href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer">Entrar no grupo</a>
        </div>
        {qr && <img className="community__qr" src={qr} alt="QR Code do grupo da comunidade" />}
      </section>

      <section className="wrap section" id="parceiros">
        <h2>Para parceiros</h2>
        <p>Parceiro é quem contribui com o encontro: espaço, item, brinde, serviço ou outra colaboração. Se a sua empresa quer participar, comece pela apresentação e depois preencha o formulário.</p>
        <div className="actions">
          <a className="button" href={PARTNER_FORM_URL} target="_blank" rel="noopener noreferrer">Quero ser parceiro</a>
          <a className="button button--ghost" href={PARTNER_DECK_URL} target="_blank" rel="noopener noreferrer">Ver a apresentação</a>
        </div>
      </section>

      <section className="wrap section" id="encontros">
        <h2>Encontros</h2>
        <p>O resumo e as fotos de cada edição ficam aqui. A primeira entra depois de 14 de novembro.</p>
      </section>

      <footer className="footer">
        <div className="wrap footer__row">
          <img src="/brand/cali-rh-bordo.png" alt="CALI RH" />
          <span>Uma comunidade da CALI RH, organizada por Patrícia Lima.</span>
        </div>
      </footer>
    </div>
  );
}
