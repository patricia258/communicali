import { useEffect, useState } from 'react';
import { supabase } from '../lib';

export const INTERESSES = ['RH', 'Liderança', 'Gestão de pessoas', 'Desenvolvimento humano', 'Empreendedorismo', 'Networking', 'Outros'];

export type MemberForm = {
  nome: string; apelido: string; email: string; whatsapp: string; cidade: string; empresa: string; cargo: string; linkedin: string;
  interesses: string[]; como_conheceu: string; privacidade: boolean; regras: boolean; comunicacoes: boolean; imagem: boolean;
};

export const emptyMember = (email = ''): MemberForm => ({ nome: '', apelido: '', email, whatsapp: '', cidade: '', empresa: '', cargo: '', linkedin: '', interesses: [], como_conheceu: '', privacidade: false, regras: false, comunicacoes: false, imagem: false });

export type SiteTexts = { cadastro_aberto: boolean; regras_texto: string; privacidade_texto: string; como_conheceu_opcoes: string[] };

export function useSiteTexts() {
  const [texts, setTexts] = useState<SiteTexts | null>(null);
  useEffect(() => {
    supabase.from('site_settings').select('cadastro_aberto,regras_texto,privacidade_texto,como_conheceu_opcoes').single().then(({ data }) => setTexts(data as SiteTexts | null));
  }, []);
  return texts;
}

export function MemberFields({ value, onChange, texts, withImage, lockEmail }: { value: MemberForm; onChange: (next: MemberForm) => void; texts: SiteTexts; withImage?: boolean; lockEmail?: boolean }) {
  const field = (key: 'nome' | 'apelido' | 'email' | 'whatsapp' | 'cidade' | 'empresa' | 'cargo' | 'linkedin') => ({
    value: value[key],
    onChange: (event: { target: { value: string } }) => onChange({ ...value, [key]: event.target.value }),
  });
  const toggle = (item: string) => onChange({ ...value, interesses: value.interesses.includes(item) ? value.interesses.filter((other) => other !== item) : [...value.interesses, item] });

  return (
    <>
      <label>Nome completo<input required minLength={2} autoComplete="name" {...field('nome')} /></label>
      <label>Como prefere ser chamado (opcional)<input autoComplete="nickname" {...field('apelido')} /></label>
      <label>E-mail<input required type="email" inputMode="email" autoComplete="email" readOnly={lockEmail} {...field('email')} /></label>
      <label>WhatsApp com DDD<input required type="tel" inputMode="tel" autoComplete="tel" {...field('whatsapp')} /></label>
      <label>Cidade/UF<input required placeholder="Curitiba/PR" autoComplete="address-level2" {...field('cidade')} /></label>
      <label>Empresa ou organização (opcional)<input autoComplete="organization" {...field('empresa')} /></label>
      <label>Cargo ou área de atuação (opcional)<input autoComplete="organization-title" {...field('cargo')} /></label>
      <label>LinkedIn (opcional)<input inputMode="url" {...field('linkedin')} /></label>
      <fieldset className="choices">
        <legend>Principal interesse na comunidade</legend>
        {INTERESSES.map((item) => (
          <label className="check" key={item}><input type="checkbox" checked={value.interesses.includes(item)} onChange={() => toggle(item)} /><span>{item}</span></label>
        ))}
      </fieldset>
      <label>Como conheceu a CommuniCALI?
        <select value={value.como_conheceu} onChange={(event) => onChange({ ...value, como_conheceu: event.target.value })}>
          <option value="">Selecione</option>
          {texts.como_conheceu_opcoes.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <label className="check">
        <input type="checkbox" required checked={value.privacidade} onChange={(event) => onChange({ ...value, privacidade: event.target.checked })} />
        <span>Li e aceito a <a href="/privacidade" target="_blank" rel="noopener noreferrer">política de privacidade</a>.</span>
      </label>
      {texts.regras_texto && (
        <label className="check">
          <input type="checkbox" required checked={value.regras} onChange={(event) => onChange({ ...value, regras: event.target.checked })} />
          <span>Li e aceito as <a href="/regras" target="_blank" rel="noopener noreferrer">regras de participação da comunidade</a>.</span>
        </label>
      )}
      <label className="check">
        <input type="checkbox" checked={value.comunicacoes} onChange={(event) => onChange({ ...value, comunicacoes: event.target.checked })} />
        <span>Quero receber comunicações da CommuniCALI (opcional).</span>
      </label>
      {withImage && (
        <label className="check">
          <input type="checkbox" checked={value.imagem} onChange={(event) => onChange({ ...value, imagem: event.target.checked })} />
          <span>Autorizo o uso da minha imagem em fotos do encontro publicadas pela CALI RH (opcional).</span>
        </label>
      )}
    </>
  );
}

export const memberArgs = (value: MemberForm) => ({
  p_nome: value.nome, p_apelido: value.apelido, p_email: value.email, p_whatsapp: value.whatsapp, p_cidade: value.cidade, p_empresa: value.empresa,
  p_cargo: value.cargo, p_linkedin: value.linkedin, p_interesses: value.interesses, p_como_conheceu: value.como_conheceu,
  p_privacidade: value.privacidade, p_regras: value.regras, p_comunicacoes: value.comunicacoes,
});
