import { useState } from 'react';
import { ParceiroRede, type PerfilParceiro } from './RedeExtras';

type Exemplo = { parceiro: { id: string; nome: string; logo_url: string | null; site_url: string | null }; perfil: PerfilParceiro };
const logo = (texto: string, cor: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" rx="18" fill="${cor}"/><text x="80" y="103" text-anchor="middle" font-family="sans-serif" font-size="60" font-weight="700" fill="#F7F0EA">${texto}</text></svg>`)}`;
export const PARCEIROS_EXEMPLOS: Exemplo[] = [
  {
    parceiro: { id: 'exemplo-espaco', nome: 'Casa Enlace · Espaço de encontros', logo_url: null, site_url: 'https://example.com/espaco' },
    perfil: { partner_id: 'exemplo-espaco', logo_original_url: logo('CE', '#5A1E2D'), descricao: 'Salas para reuniões, rodas de conversa e encontros de equipes em Curitiba.', whatsapp: '00000000000', email: 'contato@example.com', instagram: 'exemplo-ficticio', linkedin: 'https://example.com/perfil', beneficio: 'Reúna sua equipe em um novo espaço', desconto: '10% de desconto', beneficio_detalhes: 'Exemplo fictício: desconto na locação de salas por até quatro horas. Reserva antecipada, conforme disponibilidade. Não cumulativo com outras condições. Validade ilustrativa: 31/12/2026.', cupom: 'EXEMPLO-ENLACE10' },
  },
  {
    parceiro: { id: 'exemplo-livros', nome: 'Entrelinhas · Livraria e curadoria', logo_url: null, site_url: 'https://example.com/livraria' },
    perfil: { partner_id: 'exemplo-livros', logo_original_url: logo('EL', '#5F6238'), descricao: 'Livros e curadoria de leituras sobre desenvolvimento humano, liderança e gestão.', whatsapp: '00000000000', email: 'livros@example.com', instagram: 'exemplo-ficticio', linkedin: 'https://example.com/perfil', beneficio: 'Leituras para continuar a conversa', desconto: '5% de desconto', beneficio_detalhes: 'Exemplo fictício: benefício em livros selecionados para participantes da comunidade. Informe o cupom no atendimento. Não inclui frete e não acumula com promoções. Validade ilustrativa: 31/12/2026.', cupom: 'EXEMPLO-LEITURA5' },
  },
];

export function ParceirosExemplos() {
  const [aberto, setAberto] = useState(false);
  return <section className="passe__exemplos">
    <button type="button" className="passe__link" aria-expanded={aberto} aria-controls="exemplos-parceiros" onClick={() => setAberto((v) => !v)}>{aberto ? 'Ocultar exemplos fictícios' : 'Ver dois exemplos de parceiros preenchidos'}</button>
    {aberto && <div id="exemplos-parceiros">
      <p className="passe__exemplos-aviso"><strong>Prévia com dados fictícios.</strong> Estes exemplos mostram o formato dos perfis. Empresas, descontos, condições e cupons são ilustrativos. Contatos e cópia estão desativados.</p>
      <div className="passe__empresas">{PARCEIROS_EXEMPLOS.map(({ parceiro, perfil }) => <div key={parceiro.id}><p className="passe__exemplo-etiqueta">EMPRESA FICTÍCIA</p><ParceiroRede parceiro={parceiro} perfil={perfil} demonstracao /></div>)}</div>
    </div>}
  </section>;
}
