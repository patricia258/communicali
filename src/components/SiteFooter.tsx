import { Globe, MessageCircle } from 'lucide-react';

export const Instagram = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
);

/** Rodapé único do site: distribuído no computador e centralizado no celular. */
export function FooterLinks() {
  return (
    <div className="site-links">
      <a href="https://www.instagram.com/calirh_/" target="_blank" rel="noopener noreferrer"><Instagram size={15} /> @calirh_</a>
      <a href="https://calirh.com" target="_blank" rel="noopener noreferrer"><Globe size={15} aria-hidden="true" /> calirh.com</a>
      <a href="https://wa.me/554187879244" target="_blank" rel="noopener noreferrer"><MessageCircle size={15} aria-hidden="true" /> WhatsApp</a>
      <a href="/meu-espaco">Meu espaço</a>
      <a href="/regras">Regras</a>
      <a href="/privacidade">Privacidade</a>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__row">
        <a href="/" className="site-footer__logo"><img src="/brand/communicali-branco.png" alt="CommuniCALI" /></a>
        <p className="site-footer__faith">Toda honra a Deus!</p>
        <FooterLinks />
      </div>
    </footer>
  );
}
