/* Pedido de adesão a Membro (regras v23): aparece no lugar do passaporte para quem ainda não foi aprovado. */
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export type Adesao = { status: string | null; motivo: string | null; presencas: number; limite: number; nome: string };

export function AdesaoMembro({ dados, recarregar }: { dados: Adesao; recarregar: () => void }) {
  const [termos, setTermos] = useState(false);
  const [privacidade, setPrivacidade] = useState(false);
  const [comunicacoes, setComunicacoes] = useState(false);
  const [imagem, setImagem] = useState(false);
  const [diretorio, setDiretorio] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  const nome = dados.nome.split(/\s+/)[0];
  const { status, presencas, limite } = dados;

  async function pedir() {
    setErro('');
    if (!termos || !privacidade) { setErro('Para pedir a adesão, aceite os Termos de participação e a Política de privacidade.'); return; }
    setBusy(true);
    const { error } = await supabase.rpc('communicali_pedir_adesao', { p_termos: termos, p_privacidade: privacidade, p_comunicacoes: comunicacoes, p_imagem: imagem, p_diretorio: diretorio });
    setBusy(false);
    if (error) { setErro(error.message); return; }
    recarregar();
  }

  const contador = <p>Você viveu <strong>{presencas} de {limite}</strong> experiências abertas e gratuitas antes da adesão.</p>;
  const sair = <button type="button" className="passe__link" onClick={() => void supabase.auth.signOut()}>Sair</button>;

  if (status === 'solicitada' || status === 'em_analise') return (
    <>
      <img className="passe__logo" src="/brand/novo/comunicali-b-fundo-claro.svg" alt="ComuniCALI" />
      <h1>Recebemos o seu pedido{nome ? `, ${nome}` : ''}</h1>
      <p>A organização vai analisar e você recebe o retorno por e-mail. Até lá, o Meu passaporte fica fechado.</p>
      {contador}
      {sair}
    </>
  );

  if (status === 'nao_aprovada') return (
    <>
      <img className="passe__logo" src="/brand/novo/comunicali-b-fundo-claro.svg" alt="ComuniCALI" />
      <h1>Retorno sobre o seu pedido</h1>
      <p>Neste momento, o pedido não foi aprovado.</p>
      {dados.motivo && <p><strong>Motivo:</strong> {dados.motivo}</p>}
      <p>Se quiser conversar sobre o retorno, escreva para <a href="mailto:contato@calirh.com">contato@calirh.com</a>.</p>
      {sair}
    </>
  );

  if (presencas < 1) return (
    <>
      <img className="passe__logo" src="/brand/novo/comunicali-b-fundo-claro.svg" alt="ComuniCALI" />
      <h1>O passaporte é dos Membros</h1>
      <p>Você pode conhecer a ComuniCALI em até {limite} experiências abertas e gratuitas antes de se tornar Membro. Depois da sua primeira presença, você já pode pedir a adesão. Ser Membro é gratuito.</p>
      <a className="passe__botao" href="/#agenda">Ver os próximos encontros</a>
      {sair}
    </>
  );

  return (
    <>
      <img className="passe__logo" src="/brand/novo/comunicali-b-fundo-claro.svg" alt="ComuniCALI" />
      <h1>{status === 'ajustes' ? 'Falta pouco para a sua adesão' : `Quer ser Membro${nome ? `, ${nome}` : ''}?`}</h1>
      {status === 'ajustes' && <p><strong>Ajuste pedido pela organização:</strong> {dados.motivo || 'veja o e-mail que enviamos.'} Se precisar corrigir seus dados, escreva para <a href="mailto:contato@calirh.com">contato@calirh.com</a> e depois envie o pedido de novo.</p>}
      {contador}
      <p>Ser Membro é gratuito e continua gratuito. Ir ao encontro não torna ninguém Membro automaticamente: a organização analisa o seu pedido. Você não precisa usar as duas experiências para pedir.</p>
      <label className="passe__aceite"><input type="checkbox" checked={termos} onChange={(event) => setTermos(event.target.checked)} /><span>Li e aceito os <a href="/termos" target="_blank" rel="noopener noreferrer">Termos de participação</a> e as <a href="/regras" target="_blank" rel="noopener noreferrer">Regras</a>.</span></label>
      <label className="passe__aceite"><input type="checkbox" checked={privacidade} onChange={(event) => setPrivacidade(event.target.checked)} /><span>Li e aceito a <a href="/privacidade" target="_blank" rel="noopener noreferrer">Política de privacidade</a>.</span></label>
      <p className="passe__nota">Estas escolhas são opcionais e não mudam a análise do pedido:</p>
      <label className="passe__aceite"><input type="checkbox" checked={comunicacoes} onChange={(event) => setComunicacoes(event.target.checked)} /><span>Quero receber comunicações da comunidade por e-mail.</span></label>
      <label className="passe__aceite"><input type="checkbox" checked={imagem} onChange={(event) => setImagem(event.target.checked)} /><span>Autorizo o uso da minha imagem nos registros dos encontros.</span></label>
      <label className="passe__aceite"><input type="checkbox" checked={diretorio} onChange={(event) => setDiretorio(event.target.checked)} /><span>Quero aparecer na Rede, para outros Membros me encontrarem.</span></label>
      {erro && <p role="alert" className="passe__erro">{erro}</p>}
      <button type="button" className="passe__botao" disabled={busy} onClick={() => void pedir()}>{busy ? 'Enviando...' : 'Pedir adesão'}</button>
      {sair}
    </>
  );
}
