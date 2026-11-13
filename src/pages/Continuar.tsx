/* "Continue com a gente": no mesmo formato dos formulários (uma tela por vez). A pessoa informa o e-mail da inscrição, o sistema reconhece quem ela é
   e ela pede para fazer parte da comunidade. Depois da pesquisa anônima, é um formulário separado e identificado. */
import { useMemo, useState } from 'react';
import { editionSlug } from '../lib';
import { anonPublicRpc, supabase } from '../lib/supabase';
import { PublicFormPage, type FormPreset } from '../forms/PublicFormPage';

type Dados = { encontrado: boolean; nome?: string; tipo?: 'convidado' | 'visitante'; convidado_de?: string | null };
type Passo = 'email' | 'confirma';

const BENEFICIOS = [
  '**Pontuação**: a sua participação passa a pontuar.',
  '**Programa de categorias**: a jornada de Visitante, Membro, Conector e Embaixador.',
  '**Indicação**: você poderá indicar pessoas para os encontros.',
  '**Cupons e vantagens** com parceiros da comunidade.',
  '**Lista de parceiros** para você conhecer e contar com eles.',
  '**Conexões** com outras pessoas dentro da comunidade.',
  '**Palestras** sobre pessoas, liderança e trabalho.',
  '**Encontros*** presenciais e virtuais, experiências, almoços e jantares em grupos menores.',
].join('\n');

export function Continuar() {
  const slug = editionSlug();
  const [passo, setPasso] = useState<Passo>('email');
  const [email, setEmail] = useState('');
  const [dados, setDados] = useState<Dados | null>(null);
  const primeiro = (dados?.nome || '').split(' ')[0];

  const preset = useMemo<FormPreset>(() => {
    if (passo === 'confirma' && dados?.encontrado) {
      const tipoTexto = dados.tipo === 'convidado' ? 'Convidado' : 'Visitante / Membro';
      const convidadoDe = dados.tipo === 'convidado' && dados.convidado_de ? `\n\nConvidado de **${dados.convidado_de}**.` : '';
      return {
        title: 'Continue com a gente!', category: 'Pesquisa', tema: 'claro', skipWelcome: true, submitLabel: 'Quero fazer parte da comunidade',
        successText: 'Pronto!\n**Você vai receber um e-mail para participar da nossa comunidade e do nosso aplicativo.**\nObrigada por seguir com a gente.',
        questions: [
          { id: 'ola', kind: 'statement', label: `Oi, ${primeiro}!`, help: `Encontramos a sua participação no encontro:\n\n==${tipoTexto}==${convidadoDe}` },
          { id: 'comunidade', kind: 'statement', label: 'O que você encontra na comunidade', help: `${BENEFICIOS}\n\n* Alguns encontros serão exclusivos e poderão ter taxa de inscrição.` },
          { id: 'email_novo', kind: 'email', label: 'Quer receber as novidades em outro e-mail?', help: 'Se o e-mail da inscrição serve, é só avançar.' },
        ],
        submit: async (respostas) => {
          const envio: Record<string, string> = { nome: dados.nome || '', email, tipo: dados.tipo === 'convidado' ? 'Como convidado' : 'Como visitante / membro' };
          if (dados.tipo === 'convidado' && dados.convidado_de) envio.convidou = dados.convidado_de;
          const outro = String(respostas.email_novo || '').trim().toLowerCase();
          if (outro.includes('@')) envio.email_novo = outro;
          const { data, error } = await anonPublicRpc<{ ok: boolean }>('cali_form_submit', { p_slug: 'continuar-com-a-comunidade', p_answers: envio });
          return error || !data?.ok ? 'Não foi possível enviar agora. Tente de novo.' : '';
        },
      };
    }
    return {
      title: 'Continue com a gente!', category: 'Pesquisa', tema: 'claro', submitLabel: 'Continuar',
      description: 'Oi de novo! **Obrigada pelo seu interesse em continuar com a gente.**\n\n==Este formulário é separado da pesquisa de satisfação.== Aqui você se identifica, e nada se liga às respostas anônimas.',
      aviso: '**Você deve estar com muitas dúvidas, certo?**\nCalma: este formulário existe para ==esclarecer algumas delas== e entender em que momento você está.\n\nA gente não imaginava que o encontro tomaria a proporção que tomou, nem que receberia o apoio que recebeu. Por isso **algumas coisas mudaram** desde o início da organização, e muitas coisas foram feitas antes dessa mudança.\n\nQuem decidir seguir com a gente vai receber a **explicação completa de cada categoria**.\n\n**Vamos começar?**',
      questions: [{ id: 'email', kind: 'email', label: 'Qual é o e-mail que você usou na inscrição?', required: true }],
      submit: async (respostas) => {
        const limpo = String(respostas.email || '').trim().toLowerCase();
        const { data, error } = await supabase.rpc('communicali_continuar_dados', { p_slug: slug, p_email: limpo });
        if (error) return 'Não foi possível conferir agora. Tente de novo.';
        const achado = data as Dados;
        if (!achado.encontrado) return 'Não encontramos esse e-mail na lista do encontro. Confira o e-mail da inscrição ou fale com a organização.';
        setEmail(limpo); setDados(achado); setPasso('confirma');
        return '';
      },
    };
  }, [passo, dados, email, primeiro, slug]);

  return <PublicFormPage key={passo} preset={preset} />;
}
