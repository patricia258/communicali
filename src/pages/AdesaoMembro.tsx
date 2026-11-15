/* "Minha visita": a área de quem ainda não faz parte da comunidade (Visitante ou Convidado). Membro tem o Meu passaporte, que é outra área. */
import { useState } from 'react';
import { supabase } from '../lib/supabase';

type Proxima = { slug: string; titulo: string; data_evento: string; horario: string; local: string; cidade: string; inscricoes_abertas: boolean };
export type Adesao = { status: string | null; motivo: string | null; presencas: number; limite: number; nome: string; estagio?: string; faltou?: { faltou: boolean; edicao?: string } | null; proximas?: Proxima[] };

const dia = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });

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
  const estagio = dados.estagio === 'convidado' ? 'Convidado' : 'Visitante';

  async function pedir() {
    setErro('');
    if (!termos || !privacidade) { setErro('Para continuar, aceite os Termos de participação e a Política de privacidade.'); return; }
    setBusy(true);
    const { error } = await supabase.rpc('communicali_pedir_adesao', { p_termos: termos, p_privacidade: privacidade, p_comunicacoes: comunicacoes, p_imagem: imagem, p_diretorio: diretorio });
    setBusy(false);
    if (error) { setErro(error.message); return; }
    recarregar();
  }

  const parte = () => {
    if (status === 'solicitada' || status === 'em_analise') return (
      <section className="visita__bloco">
        <h2>Recebemos o seu pedido</h2>
        <p>A organização vai analisar e você recebe o retorno por e-mail.</p>
      </section>
    );
    if (status === 'nao_aprovada') return (
      <section className="visita__bloco">
        <h2>Retorno sobre o seu pedido</h2>
        <p>Neste momento, o pedido não foi aprovado.</p>
        {dados.motivo && <p><strong>Motivo:</strong> {dados.motivo}</p>}
        <p>Se quiser conversar, escreva para <a href="mailto:contato@calirh.com">contato@calirh.com</a>.</p>
      </section>
    );
    if (presencas < 1) return (
      <section className="visita__bloco">
        <h2>Fazer parte da comunidade</h2>
        <p>Depois da sua primeira visita, você poderá pedir para fazer parte da comunidade. É gratuito. Quem faz parte tem o Meu passaporte, com carimbos, selos e milhas, e a Rede.</p>
      </section>
    );
    return (
      <section className="visita__bloco">
        <h2>{status === 'ajustes' ? 'Falta pouco para fazer parte' : 'Quer continuar com a gente?'}</h2>
        {status === 'ajustes' && <p><strong>Ajuste pedido pela organização:</strong> {dados.motivo || 'veja o e-mail que enviamos.'} Se precisar corrigir seus dados, escreva para <a href="mailto:contato@calirh.com">contato@calirh.com</a> e depois envie o pedido de novo.</p>}
        <p>Fazer parte da comunidade é gratuito. Ir ao encontro não vira adesão automática: a organização analisa o seu pedido. Você não precisa usar as duas visitas para pedir.</p>
        <div className="visita__aceites">
          <label className="passe__aceite"><input type="checkbox" checked={termos} onChange={(event) => setTermos(event.target.checked)} /><span>Li e aceito os <a href="/termos" target="_blank" rel="noopener noreferrer">Termos de participação</a> e as <a href="/regras" target="_blank" rel="noopener noreferrer">Regras</a>.</span></label>
          <label className="passe__aceite"><input type="checkbox" checked={privacidade} onChange={(event) => setPrivacidade(event.target.checked)} /><span>Li e aceito a <a href="/privacidade" target="_blank" rel="noopener noreferrer">Política de privacidade</a>.</span></label>
        </div>
        <p className="passe__nota">Estas escolhas são opcionais e não mudam a análise do pedido:</p>
        <div className="visita__aceites">
          <label className="passe__aceite"><input type="checkbox" checked={comunicacoes} onChange={(event) => setComunicacoes(event.target.checked)} /><span>Quero receber comunicações da comunidade por e-mail.</span></label>
          <label className="passe__aceite"><input type="checkbox" checked={imagem} onChange={(event) => setImagem(event.target.checked)} /><span>Autorizo o uso da minha imagem nos registros dos encontros.</span></label>
          <label className="passe__aceite"><input type="checkbox" checked={diretorio} onChange={(event) => setDiretorio(event.target.checked)} /><span>Quero aparecer na Rede, para outras pessoas da comunidade me encontrarem.</span></label>
        </div>
        {erro && <p role="alert" className="passe__erro">{erro}</p>}
        <button type="button" className="passe__botao" disabled={busy} onClick={() => void pedir()}>{busy ? 'Enviando...' : 'Quero fazer parte da comunidade'}</button>
      </section>
    );
  };

  return (
    <div className="visita">
      <header className="visita__topo">
        <img className="passe__logo" src="/brand/novo/comunicali-b-fundo-claro.svg" alt="ComuniCALI" />
        <p className="visita__rotulo">{estagio}</p>
        <h1>Oi{nome ? `, ${nome}` : ''}!</h1>
        <p>Esta é a sua área de visita. O Meu passaporte é de quem já faz parte da comunidade.</p>
      </header>

      <section className="visita__bloco">
        <h2>Suas visitas</h2>
        <p className="visita__contador"><strong>{Math.min(presencas, limite)}</strong> de {limite}</p>
        <p>Você pode fazer até {limite} visitas abertas e gratuitas antes de fazer parte da comunidade. Só conta a visita em que você fez o check-in no encontro. Inscrição e lista da recepção não contam.</p>
      </section>

      {dados.faltou?.faltou && (
        <section className="visita__bloco visita__bloco--destaque">
          <h2>Poxa, que pena!</h2>
          <p>Você não conseguiu ir na {dados.faltou.edicao}. Vamos ver se agora dá certo? Estamos te esperando.</p>
        </section>
      )}

      <section className="visita__bloco">
        <h2>Próximos encontros</h2>
        {dados.proximas?.length ? (
          <ul className="visita__lista">
            {dados.proximas.map((item) => (
              <li key={item.slug}>
                <div><strong>{item.titulo}</strong><span>{dia(item.data_evento)} · {item.horario} · {item.local}, {item.cidade}</span></div>
                <a className="passe__botao passe__botao--linha" href={`/e/${item.slug}`}>{item.inscricoes_abertas ? 'Quero ir' : 'Ver o encontro'}</a>
              </li>
            ))}
          </ul>
        ) : <p>Ainda não há um encontro marcado. Os avisos saem primeiro no grupo da comunidade.</p>}
      </section>

      {parte()}

      <footer className="visita__rodape"><button type="button" className="passe__link" onClick={() => void supabase.auth.signOut()}>Sair</button></footer>
    </div>
  );
}
