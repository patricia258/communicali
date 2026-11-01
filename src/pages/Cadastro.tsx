import { useMemo } from 'react';
import { errorMessage, supabase } from '../lib';
import { PublicFormPage, type FormPreset } from '../forms/PublicFormPage';
import { answerArgs, memberQuestions, useSiteTexts } from './MemberFields';

export function Cadastro() {
  const texts = useSiteTexts();
  const preset = useMemo<FormPreset | null>(() => texts?.cadastro_aberto ? {
    title: 'Cadastro de membro',
    category: 'CommuniCALI | Café & Pessoas',
    description: 'Falar de pessoas pode mudar o mundo. Faça seu cadastro para participar da comunidade.',
    questions: memberQuestions(texts, { email: true }),
    submitLabel: 'Fazer meu cadastro',
    successText: 'Bem-vindo à CommuniCALI! Seu cadastro foi realizado com sucesso. Falar de pessoas pode mudar o mundo.',
    submit: async (answers) => {
      const { error } = await supabase.rpc('communicali_cadastrar', answerArgs(answers));
      return error ? errorMessage(error) : '';
    },
  } : null, [texts]);

  if (preset) return <PublicFormPage preset={preset} />;
  return (
    <main className="event-page">
      <section className="event-card">
        <p className="eyebrow">CommuniCALI</p>
        <h1>Cadastro de membro</h1>
        {texts && <p className="notice">O cadastro abre em breve. Enquanto isso, entre no grupo da comunidade pelo site.</p>}
      </section>
    </main>
  );
}

export function TextoPagina({ tipo }: { tipo: 'regras' | 'privacidade' }) {
  const texts = useSiteTexts();
  const body = tipo === 'regras' ? texts?.regras_texto : texts?.privacidade_texto;
  return (
    <main className="wrap legal">
      <a href="/"><img src="/brand/communicali-branco.png" alt="CommuniCALI" /></a>
      <h1>{tipo === 'regras' ? 'Regras de participação' : 'Política de privacidade'}</h1>
      {texts && !body && <p>Este texto será publicado em breve.</p>}
      {body?.split(/\n{2,}/).map((paragraph, index) => paragraph.startsWith('## ') ? <h2 key={index}>{paragraph.slice(3)}</h2> : <p key={index}>{paragraph}</p>)}
    </main>
  );
}
