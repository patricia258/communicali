/* Proposta isolada: não importada pela Home, sem API ou novos aceites persistidos. */
import { Handshake, Lightbulb, MessageCircle, Network, PackageOpen, Sparkles, UserPlus } from 'lucide-react';
import './proposta-entrada-v22.css';

const MODALIDADES = [
  { nome: 'Experiência', texto: 'Crie momentos que aproximam.', Icone: Sparkles },
  { nome: 'Produção', texto: 'Ajude a transformar ideias em realidade.', Icone: PackageOpen },
  { nome: 'Conhecimento', texto: 'Compartilhe saberes e perspectivas.', Icone: Lightbulb },
  { nome: 'Rede e comunidade', texto: 'Amplie conexões e oportunidades.', Icone: Network },
];

export function ParticipacaoProposta() {
  return <section className="wrap block entrada-v22" id="fazer-parte">
    <div className="entrada-v22__intro">
      <p className="eyebrow">Faça parte da ComuniCALI</p>
      <h2>Mais do que participar.<br /><em>Fazer parte.</em></h2>
      <p>A ComuniCALI reúne pessoas que acreditam no valor das conexões, do desenvolvimento humano e das conversas que continuam depois do café.</p>
    </div>
    <div className="entrada-v22__convite">
      <span className="entrada-v22__icone"><UserPlus size={24} aria-hidden="true" /></span>
      <div><h3>Seu lugar na comunidade</h3><p>A participação como Membro é gratuita, mediante inscrição e análise de alinhamento com os princípios da comunidade.</p></div>
      <div className="entrada-v22__acoes"><a className="pill" href="#solicitacao-proposta">Solicite sua participação</a><a className="link" href="#principios-propostos">Conheça nossos princípios</a></div>
    </div>
    <aside className="entrada-v22__acompanhar" id="canal-whatsapp">
      <MessageCircle size={22} aria-hidden="true" /><div><h3>Quer acompanhar primeiro?</h3><p>Entre no nosso grupo de WhatsApp e acompanhe a comunidade. O acesso ao grupo não representa aprovação como Membro.</p></div>
      <button type="button" className="link" disabled>Acompanhar pelo WhatsApp</button>
    </aside>
    <p className="entrada-v22__visitante">Você também pode conhecer um encontro como Visitante, conforme inscrição e vagas. São permitidas até duas presenças em encontros comunitários abertos; participar como Visitante não exige aprovação como Membro.</p>
  </section>;
}

export function PrincipiosPropostos() {
  return <section className="wrap bloco-v22" id="principios-propostos">
    <details><summary>Princípios para fazer parte</summary>
      <p>Respeitar as regras de convivência, manter um cadastro autêntico e construir conexões com respeito às escolhas de cada pessoa.</p>
      <p>Contribuir é uma escolha. O alinhamento considera a proposta da comunidade, sem seleção por cargo, salário, formação ou tamanho da empresa.</p>
    </details>
  </section>;
}

export function FormularioAlinhamentoProposta() {
  return <section className="wrap bloco-v22" id="solicitacao-proposta">
    <details><summary>Solicitação de participação</summary>
      <p className="entrada-v22__explicacao">Conte o que aproxima você da comunidade. A CALI analisa cada solicitação e pode pedir informações adicionais antes de responder.</p>
      <form className="entrada-v22__form" onSubmit={(e) => e.preventDefault()}>
        <div className="entrada-v22__campos"><label>Seu nome<input autoComplete="off" type="text" required /></label><label>E-mail para contato<input autoComplete="off" type="email" required /></label></div>
        <label>Qual é sua área de atuação?<input type="text" required /></label>
        <label>O que despertou seu interesse na ComuniCALI?<textarea rows={2} required /></label>
        <label>O que você espera encontrar na comunidade?<textarea rows={2} required /></label>
        <label>Como gostaria de contribuir?<textarea rows={2} /><small>Compartilhar experiências, ouvir ou aproximar pessoas também são possibilidades. A contribuição é voluntária.</small></label>
        <label className="entrada-v22__aceite"><input type="checkbox" required /><span>Conheço e concordo com os princípios de convivência.</span></label>
        <button className="pill" type="submit" disabled>Enviar solicitação</button>
      </form>
    </details>
  </section>;
}

export function ModalidadesParceriaProposta() {
  return <section className="parceria-v22" id="parcerias-proposta"><div className="wrap">
    <div className="parceria-v22__intro"><p className="eyebrow">Para empresas e profissionais</p><h2>Apoie este encontro.<br /><em>Seja um parceiro.</em></h2><p>Nem toda contribuição é financeira: cada parceiro oferece o que faz bem, e a proposta é combinada individualmente.</p></div>
    <div className="parceria-v22__cards">{MODALIDADES.map(({ nome, texto, Icone }) => <article key={nome}><Icone size={23} aria-hidden="true" /><h3>{nome}</h3><p>{texto}</p></article>)}</div>
    <div className="entrada-v22__acoes"><button type="button" className="pill" disabled><Handshake size={17} aria-hidden="true" />Quero ser parceiro</button><button type="button" className="link" disabled>Ver apresentação para parceiros</button></div>
  </div></section>;
}
