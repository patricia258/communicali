/* "Continue com a gente": depois da pesquisa anônima, a pessoa se identifica só pelo e-mail da inscrição, o sistema reconhece quem ela é e ela pede para fazer parte da comunidade. */
import { useState } from 'react';
import { editionSlug } from '../lib';
import { anonPublicRpc, supabase } from '../lib/supabase';
import '../dinamica/dinamica.css';

type Dados = { encontrado: boolean; nome?: string; tipo?: 'convidado' | 'visitante'; convidado_de?: string | null };
const BENEFICIOS = [
  ['Pontuação', 'a sua participação passa a pontuar.'],
  ['Programa de categorias', 'a jornada de Visitante, Membro, Conector e Embaixador.'],
  ['Indicação', 'você poderá indicar pessoas para os encontros.'],
  ['Cupons e vantagens', 'com parceiros da comunidade.'],
  ['Lista de parceiros', 'para você conhecer e contar com eles.'],
  ['Conexões', 'com outras pessoas dentro da comunidade.'],
  ['Palestras', 'sobre pessoas, liderança e trabalho.'],
  ['Encontros*', 'presenciais e virtuais, experiências, almoços e jantares em grupos menores.'],
];

export function Continuar() {
  const slug = editionSlug();
  const [email, setEmail] = useState('');
  const [dados, setDados] = useState<Dados | null>(null);
  const [outro, setOutro] = useState('');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState(false);
  const primeiro = (dados?.nome || '').split(' ')[0];

  async function procurar() {
    const limpo = email.trim().toLowerCase();
    if (!limpo.includes('@')) { setErro('Confira o e-mail digitado.'); return; }
    setBusy(true); setErro('');
    const { data, error } = await supabase.rpc('communicali_continuar_dados', { p_slug: slug, p_email: limpo });
    setBusy(false);
    if (error) { setErro('Não foi possível conferir agora. Tente de novo.'); return; }
    const achado = data as Dados;
    setDados(achado);
    if (!achado.encontrado) setErro('Não encontramos esse e-mail na lista do encontro. Confira o e-mail da inscrição ou fale com a organização.');
  }
  async function enviar() {
    if (!dados?.encontrado || busy) return;
    setBusy(true); setErro('');
    const respostas: Record<string, string> = { nome: dados.nome || '', email: email.trim().toLowerCase(), tipo: dados.tipo === 'convidado' ? 'Como convidado' : 'Como visitante / membro' };
    if (dados.convidado_de && dados.tipo === 'convidado') respostas.convidou = dados.convidado_de;
    if (outro.trim().includes('@')) respostas.email_novo = outro.trim().toLowerCase();
    const { data, error } = await anonPublicRpc<{ ok: boolean }>('cali_form_submit', { p_slug: 'continuar-com-a-comunidade', p_answers: respostas });
    setBusy(false);
    if (error || !data?.ok) { setErro('Não foi possível enviar agora. Tente de novo.'); return; }
    setEnviado(true);
  }

  return (
    <main className="dn-pg">
      <div className="dn-pg-faixa" />
      <img className="dn-pg-logo" src="/brand/communicali-horizontal.png" alt="ComuniCALI" />
      <div className="dn-pg-corpo">
        {enviado ? (
          <div className="dn-cartao dn-continuar">
            <h1>Pronto, {primeiro}!</h1>
            <p className="dn-pg-inst"><b>Você vai receber um e-mail para participar da nossa comunidade e do nosso aplicativo.</b></p>
            <p className="dn-pg-inst">Obrigada por seguir com a gente.</p>
          </div>
        ) : (
          <>
            <div className="dn-cartao dn-continuar">
              <h1>Continue com a gente!</h1>
              <p className="dn-pg-inst">Oi de novo! Obrigada pelo seu interesse em continuar com a gente.</p>
              <p className="dn-pg-inst"><b>Este formulário é separado da pesquisa de satisfação. Aqui você se identifica, e nada se liga às respostas anônimas.</b></p>
            </div>
            <div className="dn-cartao dn-continuar dn-destaque">
              <p><b>Você deve estar com muitas dúvidas, certo?</b></p>
              <p>Calma, é para isso que este formulário existe: esclarecer algumas delas e entender em que momento você está.</p>
              <p>A gente não imaginava que o encontro tomaria a proporção que tomou, nem que receberia o apoio que recebeu. Por isso algumas coisas mudaram desde o início da organização, e muitas coisas foram feitas antes dessa mudança.</p>
              <p>Quem decidir seguir com a gente na comunidade vai receber a explicação completa de cada categoria.</p>
              <p><b>Vamos começar?</b></p>
            </div>
            <div className="dn-cartao dn-continuar">
              <label className="dn-nome">Qual é o e-mail que você usou na inscrição?
                <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); if (dados) setDados(null); }} onKeyDown={(event) => { if (event.key === 'Enter') void procurar(); }} placeholder="nome@email.com" />
              </label>
              {!dados?.encontrado && <button className="dn-btn" type="button" disabled={busy || !email.includes('@')} onClick={() => void procurar()}>{busy ? 'Conferindo…' : 'Continuar'}</button>}
              {erro && <p className="dn-aviso alerta">{erro}</p>}
            </div>
            {dados?.encontrado && (
              <>
                <div className="dn-cartao dn-continuar">
                  <h2>Oi, {primeiro}!</h2>
                  <p className="dn-pg-inst">Encontramos a sua participação no encontro:</p>
                  <p className="dn-chip">{dados.tipo === 'convidado' ? 'Convidado' : 'Visitante / Membro'}</p>
                  {dados.tipo === 'convidado' && dados.convidado_de && <p className="dn-pg-inst">Convidado de <b>{dados.convidado_de}</b>.</p>}
                </div>
                <div className="dn-cartao dn-continuar">
                  <h2>O que você encontra na comunidade</h2>
                  <ul className="dn-beneficios">
                    {BENEFICIOS.map(([titulo, texto]) => <li key={titulo}><b>{titulo}:</b> {texto}</li>)}
                  </ul>
                  <p className="dn-restam">* Alguns encontros serão exclusivos e poderão ter taxa de inscrição.</p>
                </div>
                <div className="dn-cartao dn-continuar">
                  <label className="dn-nome">Quer receber as novidades em outro e-mail?
                    <input type="email" inputMode="email" value={outro} onChange={(event) => setOutro(event.target.value)} placeholder="Se o e-mail da inscrição serve, deixe em branco" />
                  </label>
                  <button className="dn-btn" type="button" disabled={busy} onClick={() => void enviar()}>{busy ? 'Enviando…' : 'Quero fazer parte da comunidade'}</button>
                  {erro && <p className="dn-aviso alerta">{erro}</p>}
                </div>
              </>
            )}
          </>
        )}
      </div>
      <p className="dn-rodape"><a href="/privacidade" style={{ color: 'inherit' }}>Privacidade</a></p>
    </main>
  );
}
