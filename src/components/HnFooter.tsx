import { FooterLinks, Instagram } from './SiteFooter';

export function HnFooter() {
  return (
    <footer className="hn-foot">
      <div className="hn-foot__top">
        <div className="hn-foot__marca">
          <a href="/" className="hn-foot__logo"><img src="/brand/novo/comunicali-b-fundo-escuro.svg" alt="ComuniCALI" /></a>
          <p className="hn-foot__cali">Uma iniciativa da <a href="https://calirh.com" target="_blank" rel="noopener noreferrer" aria-label="CALI RH"><img src="/brand/cali-logo-light.svg" alt="CALI RH" /></a></p>
        </div>
        <div className="hn-foot__cols">
          <div><b>Comunidade</b><a href="/#comunidade">Quem somos</a><a href="/#selos">Selos</a><a href="/#agenda">Agenda</a><a href="/#parceiros">Parceiros</a></div>
          <div><b>Minha área</b><a href="/meu-passaporte">Entrar</a><a href="#programa">Sua jornada</a><a href="https://www.instagram.com/calirh_/" target="_blank" rel="noopener noreferrer"><Instagram size={16} /> Instagram</a><a href="mailto:comuni@calirh.com">comuni@calirh.com</a></div>
        </div>
      </div>
      <div className="hn-foot__legal">
        <FooterLinks />
        <p>© {new Date().getFullYear()} ComuniCALI, uma iniciativa da CALI RH · AKAYKO AZUMI RH LTDA · CNPJ 56.660.675/0001-11 · <a href="mailto:comuni@calirh.com">comuni@calirh.com</a></p>
      </div>
    </footer>
  );
}
