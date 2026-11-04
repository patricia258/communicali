/* Card "Eu vou!" sem entrar no aplicativo: a pessoa confirmada informa o e-mail (ou chega pelo link do e-mail)
   e o card sai pronto, com a foto do formulário de inscrição, a edição, a data e o local. */
import { useEffect, useState, type FormEvent } from 'react';
import { gerarCartaoEuVou } from './ConviteMembro';
import { longDate } from './Edicao';

type Resposta = { encontrado: boolean; motivo?: string; nome?: string; foto?: string | null; edicao?: { titulo: string; numero: number | null; data_evento: string; horario: string | null; local: string } };

const CODIGO = new URLSearchParams(window.location.search).get('c');

async function buscar(corpo: Record<string, string>): Promise<Resposta> {
  const r = await fetch('/api/eu-vou', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
  if (!r.ok) throw new Error('falha');
  return r.json();
}

export function EuVou() {
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState<'inicio' | 'buscando' | 'pronto' | 'nao' | 'erro'>(CODIGO ? 'buscando' : 'inicio');
  const [dados, setDados] = useState<Resposta | null>(null);
  const [card, setCard] = useState<{ blob: Blob; url: string } | null>(null);
  const [identidade, setIdentidade] = useState<Record<string, string>>(CODIGO ? { c: CODIGO } : {});
  const [redes, setRedes] = useState<string[]>([]);
  const [mimo, setMimo] = useState<'' | 'enviando' | 'ok' | 'erro'>('');

  async function montar(resposta: Resposta, foto?: string | null) {
    if (!resposta.encontrado || !resposta.edicao) { setEstado(resposta.motivo === 'sem_encontro' ? 'erro' : 'nao'); return; }
    setDados(resposta);
    const { edicao } = resposta;
    const frase = edicao.numero === 1 ? 'Vou estar no primeiro encontro da ComuniCALI.' : 'Vou estar no próximo encontro da ComuniCALI.';
    const blob = await gerarCartaoEuVou(resposta.nome || '', foto === undefined ? resposta.foto || null : foto, { titulo: edicao.titulo, data: longDate(edicao.data_evento), local: edicao.local }, frase);
    setCard((anterior) => { if (anterior) URL.revokeObjectURL(anterior.url); return { blob, url: URL.createObjectURL(blob) }; });
    setEstado('pronto');
  }

  useEffect(() => { if (CODIGO) void buscar({ c: CODIGO }).then((r) => montar(r)).catch(() => setEstado('erro')); }, []);

  async function enviar(event: FormEvent) {
    event.preventDefault();
    setEstado('buscando');
    setIdentidade({ email });
    try { await montar(await buscar({ email })); } catch { setEstado('erro'); }
  }

  async function compartilhar() {
    if (!card) return;
    const arquivo = new File([card.blob], 'eu-vou-comunicali.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [arquivo] })) { await navigator.share({ files: [arquivo], title: 'Eu vou!' }).catch(() => null); return; }
    baixar();
  }
  function baixar() {
    if (!card) return;
    const link = document.createElement('a'); link.href = card.url; link.download = 'eu-vou-comunicali.png'; link.click();
  }
  async function compartilhei() {
    setMimo('enviando');
    try {
      const r = await fetch('/api/eu-vou', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...identidade, acao: 'compartilhei', redes }) });
      setMimo(r.ok ? 'ok' : 'erro');
    } catch { setMimo('erro'); }
  }
  const alternarRede = (rede: string) => setRedes((atual) => (atual.includes(rede) ? atual.filter((item) => item !== rede) : [...atual, rede]));

  // Quem preferir outra foto escolhe do celular; a imagem não sai do aparelho.
  function trocarFoto(arquivo?: File) {
    if (!arquivo || !dados) return;
    const leitor = new FileReader();
    leitor.onload = () => void montar(dados, String(leitor.result));
    leitor.readAsDataURL(arquivo);
  }

  return (
    <main className="event-page">
      <section className="event-card euvou">
        <p className="eyebrow">ComuniCALI</p>
        {estado !== 'pronto' && <>
          <h1>Crie seu card <em>Eu vou!</em></h1>
          <p className="euvou__texto">Mostre que você vai estar com a gente. Seu card sai pronto, com a sua foto, para compartilhar nas redes e no grupo.</p>
        </>}
        {(estado === 'inicio' || estado === 'nao') && (
          <form className="euvou__form" onSubmit={(event) => void enviar(event)}>
            <label className="field">Qual é o e-mail da sua inscrição?<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value.replace(/\s/g, ''))} /></label>
            {estado === 'nao' && <p className="notice notice--alert">Não encontramos uma presença confirmada com este e-mail. Confira o e-mail ou fale com a organização.</p>}
            <button className="button" type="submit">Criar meu card</button>
          </form>
        )}
        {estado === 'buscando' && <p className="notice">Preparando seu card…</p>}
        {estado === 'erro' && <p className="notice notice--alert">Não foi possível criar o card agora. Tente de novo em instantes.</p>}
        {estado === 'pronto' && card && <>
          <h1>Oi, {dados?.nome}! <em>Seu card está pronto.</em></h1>
          <img className="euvou__card" src={card.url} alt="Seu card Eu vou!" />
          <button className="button" type="button" onClick={() => void compartilhar()}>Compartilhar</button>
          <button className="button button--linha" type="button" onClick={baixar}>Baixar imagem</button>
          <label className="euvou__trocar">Usar outra foto<input type="file" accept="image/*" hidden onChange={(event) => trocarFoto(event.target.files?.[0])} /></label>
          <div className="euvou__mimo">
            <h2>Tem mimo! 🎁</h2>
            <p>Poste o seu card no <strong>Instagram</strong> ou no <strong>LinkedIn</strong> marcando a <strong>CALI RH</strong> (no Instagram, <strong>@calirh_</strong>).</p>
            <p>No dia do encontro, mostre o post na recepção e retire o seu <strong>mimo surpresa</strong>. Um mimo por pessoa.</p>
            {mimo === 'ok'
              ? <p className="notice">Anotado! Leve o post no celular para mostrar na recepção. 💛</p>
              : <>
                <div className="euvou__redes" role="group" aria-label="Onde você compartilhou">
                  {['Instagram', 'LinkedIn'].map((rede) => <button key={rede} type="button" className={redes.includes(rede) ? 'is-on' : ''} aria-pressed={redes.includes(rede)} onClick={() => alternarRede(rede)}>{rede}</button>)}
                </div>
                <button className="button" type="button" disabled={!redes.length || mimo === 'enviando'} onClick={() => void compartilhei()}>{mimo === 'enviando' ? 'Anotando…' : 'Já compartilhei e marquei a CALI'}</button>
                {mimo === 'erro' && <p className="notice notice--alert">Não foi possível anotar agora. Tente de novo.</p>}
              </>}
          </div>
        </>}
      </section>
    </main>
  );
}
