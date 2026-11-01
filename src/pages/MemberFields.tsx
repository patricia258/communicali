import { useEffect, useState } from 'react';
import { supabase } from '../lib';
import type { FormAnswer, FormQuestion } from '../forms/formModel';

export const INTERESSES = ['RH', 'Liderança', 'Gestão de pessoas', 'Desenvolvimento humano', 'Empreendedorismo', 'Networking', 'Outros'];
const ACEITE = 'Li e aceito';
const SITE = 'https://comuni.calirh.com';

export type SiteTexts = { cadastro_aberto: boolean; regras_texto: string; privacidade_texto: string; como_conheceu_opcoes: string[] };

export function useSiteTexts() {
  const [texts, setTexts] = useState<SiteTexts | null>(null);
  useEffect(() => {
    supabase.from('site_settings').select('cadastro_aberto,regras_texto,privacidade_texto,como_conheceu_opcoes').single().then(({ data }) => setTexts(data as SiteTexts | null));
  }, []);
  return texts;
}

/** Perguntas do cadastro, uma por tela, no mesmo fluxo dos formulários. */
export function memberQuestions(texts: SiteTexts, options: { email?: boolean; imagem?: boolean }): FormQuestion[] {
  const list: FormQuestion[] = [
    { id: 'nome', kind: 'name', label: 'Qual é o seu nome completo?', required: true },
    { id: 'apelido', kind: 'short_text', label: 'Como prefere ser chamado?' },
  ];
  if (options.email) list.push({ id: 'email', kind: 'email', label: 'Qual é o seu e-mail?', required: true });
  list.push(
    { id: 'whatsapp', kind: 'phone', label: 'Qual é o seu WhatsApp com DDD?', required: true },
    { id: 'cidade', kind: 'short_text', label: 'Em qual cidade e estado você mora?', help: 'Ex.: Curitiba/PR', required: true },
    { id: 'empresa', kind: 'short_text', label: 'Empresa ou organização' },
    { id: 'cargo', kind: 'short_text', label: 'Cargo ou área de atuação' },
    { id: 'linkedin', kind: 'short_text', label: 'Qual é o seu LinkedIn?' },
    { id: 'interesses', kind: 'multi_choice', label: 'Qual é o seu principal interesse na comunidade?', options: INTERESSES, required: true },
    { id: 'como', kind: 'single_choice', label: 'Como conheceu a CommuniCALI?', options: texts.como_conheceu_opcoes, required: true },
    { id: 'privacidade', kind: 'single_choice', label: 'Política de privacidade', help: `Leia a [política de privacidade](${SITE}/privacidade).`, options: [ACEITE], required: true },
  );
  if (texts.regras_texto) list.push({ id: 'regras', kind: 'single_choice', label: 'Regras de participação da comunidade', help: `Leia as [regras de participação](${SITE}/regras).`, options: [ACEITE], required: true });
  list.push({ id: 'comunicacoes', kind: 'yes_no', label: 'Quer receber comunicações da CommuniCALI?' });
  if (options.imagem) list.push({ id: 'imagem', kind: 'yes_no', label: 'Autoriza o uso da sua imagem em fotos do encontro publicadas pela CALI RH?' });
  return list;
}

/** Quem já se inscreveu na edição só confirma os aceites: o resto vem da inscrição. */
export function confirmQuestions(texts: SiteTexts, nome: string): FormQuestion[] {
  const list: FormQuestion[] = [
    { id: 'boasvindas', kind: 'statement', label: `Que bom te ver${nome ? `, ${nome}` : ''}!`, help: 'Encontramos sua inscrição. Faltam só alguns aceites para confirmar sua presença e seu cadastro de membro.' },
    { id: 'privacidade', kind: 'single_choice', label: 'Política de privacidade', help: `Leia a [política de privacidade](${SITE}/privacidade).`, options: [ACEITE], required: true },
  ];
  if (texts.regras_texto) list.push({ id: 'regras', kind: 'single_choice', label: 'Regras de participação da comunidade', help: `Leia as [regras de participação](${SITE}/regras).`, options: [ACEITE], required: true });
  list.push(
    { id: 'comunicacoes', kind: 'yes_no', label: 'Quer receber comunicações da CommuniCALI?' },
    { id: 'imagem', kind: 'yes_no', label: 'Autoriza o uso da sua imagem em fotos do encontro publicadas pela CALI RH?' },
  );
  return list;
}

const text = (value: FormAnswer | undefined) => (typeof value === 'string' ? value : '');

export const answerArgs = (answers: Record<string, FormAnswer>, email?: string) => ({
  p_nome: text(answers.nome), p_apelido: text(answers.apelido), p_email: email ?? text(answers.email), p_whatsapp: text(answers.whatsapp),
  p_cidade: text(answers.cidade), p_empresa: text(answers.empresa), p_cargo: text(answers.cargo), p_linkedin: text(answers.linkedin),
  p_interesses: Array.isArray(answers.interesses) ? answers.interesses : [], p_como_conheceu: text(answers.como),
  p_privacidade: answers.privacidade === ACEITE, p_regras: answers.regras === ACEITE, p_comunicacoes: answers.comunicacoes === 'Sim',
});
