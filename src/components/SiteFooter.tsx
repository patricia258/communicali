import { Globe, MessageCircle } from 'lucide-react';

export const Instagram = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
);

/** Nos formulários, a navegação fica restrita aos documentos legais. */
export function FooterLinks({ legalOnly = false }: { legalOnly?: boolean }) {
  return (
    <nav className="site-links" aria-label={legalOnly ? 'Documentos legais' : 'Navegação do rodapé'}>
      {!legalOnly && <a href="/meu-espaco">Meu espaço</a>}
      <a href="/regras">Regras</a>
      <a href="/privacidade">Privacidade</a>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__row">
        <a href="/" className="site-footer__logo"><img src="/brand/communicali-branco.png" alt="ComuniCALI" /></a>
        <FooterLinks />
        <nav className="site-socials" aria-label="Canais da CALI">
          <a href="https://www.instagram.com/calirh_/" target="_blank" rel="noopener noreferrer" aria-label="Instagram da CALI" title="Instagram"><Instagram size={20} /></a>
          <a href="https://calirh.com" target="_blank" rel="noopener noreferrer" aria-label="Site da CALI RH" title="Site da CALI RH"><Globe size={20} aria-hidden="true" /></a>
          <a href="https://wa.me/554187879244" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp da CALI" title="WhatsApp"><MessageCircle size={20} aria-hidden="true" /></a>
        </nav>
      </div>
      <p className="site-footer__faith">Toda honra a Deus!</p>
    </footer>
  );
}
