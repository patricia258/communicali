/* Espaço do membro: passaporte com carimbos, edições, missões, indicações, programa e perfil. Abre com código enviado ao e-mail. */
import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { errorMessage, supabase } from '../lib';
import { longDate } from './Edicao';
import './membro.css';

type Carimbo = { slug: string; titulo: string; selo: string; data_evento: string; local: string; cidade: string; capa_url: string | null; carimbo_url: string | null; fotos_url: string | null };
type Proxima = { slug: string; titulo: string; data_evento: string; horario: string; local: string; cidade: string; capa_url: string | null; inscricoes_abertas: boolean };
type Missao = { slug: string; titulo: string; descricao: string; nivel: string; modo: string; status: string };
type Espaco = {
  membro: { nome: string; apelido: string | null; email: string; foto_url: string | null; categoria: string; codigo: string; temas: string[]; interesse_palestras: boolean; linkedin: string | null } | null;
  pontos: number;
  encontros: number;
  carimbos: Carimbo[];
  proximas: Proxima[];
  missoes: Missao[];
  indicacoes: Array<{ nome: string; compareceu: boolean }>;
  recomendacoes: Array<{ nome: string; tipo: string; status: string }>;
};
type Aba = 'inicio' | 'edicoes' | 'missoes' | 'rede' | 'indicar' | 'programa' | 'perfil';
type Pessoa = { id: string; nome: string; foto_url: string | null; categoria: string; cidade_uf: string | null; empresa: string | null; cargo: string | null; temas: string[]; interesses: string[]; presta_servicos: boolean; whatsapp?: string | null; email?: string; instagram?: string | null; linkedin?: string | null };
type Parceiro = { id: string; nome: string; logo_url: string | null; site_url: string | null };

const ABAS: Array<[Aba, string]> = [['inicio', 'Início'], ['edicoes', 'Edições'], ['missoes', 'Missões'], ['rede', 'Rede'], ['indicar', 'Indicar'], ['programa', 'Programa']];
const NIVEIS: Record<string, string> = { fundadora: 'Fundadora', membro: 'Membro', conector: 'Conector', embaixador: 'Embaixador', convidado: 'Convidado', organizador: 'Organização', kids: 'Kids' };
const META: Record<string, { nome: string; pontos: number; encontros: number; nivel: string }> = {
  membro: { nome: 'Conector', pontos: 100, encontros: 3, nivel: 'conector' },
  conector: { nome: 'Embaixador', pontos: 250, encontros: 6, nivel: 'embaixador' },
};
const SELO: Record<string, string> = { convidados: 'postal-indicacao', conexao: 'postal-conector', lugar: 'postal-lugar', palestra: 'postal-palestra', parceiro: 'postal-embaixador', representar: 'postal-embaixador' };
const SITUACAO: Record<string, string> = { concluida: 'Concluída', enviada: 'Em análise', recusada: 'Pode reenviar', aberta: 'Em aberto' };
const PONTOS: Array<[string, number]> = [['Presença em encontro', 10], ['Visitante indicado que compareceu', 5], ['Recomendação validada', 10], ['Contribuição aprovada', 15], ['Parceiro que contribuiu', 20], ['Palestra a convite da organização', 30]];

const ATUACAO = ['Recrutamento e seleção', 'Departamento pessoal', 'Treinamento e desenvolvimento', 'Cultura e clima', 'Remuneração e benefícios', 'Liderança', 'Coaching e mentoria', 'Consultoria', 'Palestras', 'Jurídico trabalhista', 'Marketing', 'Tecnologia', 'Inteligência artificial', 'Gestão de negócios', 'Saúde e bem-estar'];
const INTERESSES_REDE = ['RH', 'Liderança', 'Gestão de pessoas', 'Desenvolvimento humano', 'Empreendedorismo', 'Networking', 'Inteligência artificial', 'Carreira', 'Parcerias', 'Vagas', 'Mentoria', 'Palestras'];

type CampoMissao = { id: string; rotulo: string; obrigatorio?: boolean; tipo?: string; opcoes?: string[] };
const FORMULARIOS: Record<string, CampoMissao[]> = {
  conexao: [
    { id: 'quem', rotulo: 'Quem você apresentou', obrigatorio: true },
    { id: 'para', rotulo: 'Para quem você apresentou', obrigatorio: true },
    { id: 'quando', rotulo: 'Quando aconteceu', obrigatorio: true, tipo: 'date' },
    { id: 'resultado', rotulo: 'O que resultou', obrigatorio: true, opcoes: ['Parceria', 'Contratação', 'Negócio fechado', 'Mentoria', 'Palestra ou conteúdo', 'Outro'] },
    { id: 'contato', rotulo: 'Contato de quem pode confirmar', obrigatorio: true },
  ],
  representar: [
    { id: 'onde', rotulo: 'Onde você representou a comunidade', obrigatorio: true },
    { id: 'quando', rotulo: 'Quando aconteceu', obrigatorio: true, tipo: 'date' },
    { id: 'como', rotulo: 'Como foi', obrigatorio: true, opcoes: ['Evento presencial', 'Evento online', 'Empresa ou faculdade', 'Publicação ou podcast', 'Outro'] },
    { id: 'link', rotulo: 'Link da publicação ou do evento' },
  ],
};

const inviteUrl = (codigo: string) => `https://comuni.calirh.com/c/${codigo}`;
const primeiroNome = (espaco: Espaco) => (espaco.membro?.apelido || espaco.membro?.nome || '').trim().split(/\s+/)[0];

function Pagina({ children, aba, setAba }: { children: ReactNode; aba?: Aba; setAba?: (aba: Aba) => void }) {
  return (
    <div className="passe">
      <div className="passe__faixa" aria-hidden="true"><span /><span /><span /><span /></div>
      <main className="passe__tela">{children}</main>
      {setAba && (
        <nav className="passe__menu" aria-label="Abas do espaço do membro">
          {ABAS.map(([id, nome]) => <button key={id} type="button" className={aba === id ? 'is-on' : ''} aria-pressed={aba === id} onClick={() => { setAba(id); window.scrollTo(0, 0); }}>{nome}</button>)}
        </nav>
      )}
    </div>
  );
}

function Entrar() {
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);

  async function enviar(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setErro('');
    const clean = email.trim().toLowerCase();
    const { error } = enviado
      ? await supabase.auth.verifyOtp({ email: clean, token: codigo.trim(), type: 'email' })
      : await supabase.auth.signInWithOtp({ email: clean, options: { shouldCreateUser: true } });
    if (error) setErro(enviado ? 'Código inválido ou vencido. Confira e tente de novo.' : errorMessage(error));
    else if (!enviado) setEnviado(true);
    setBusy(false);
  }

  return (
    <div className="passe passe--entrada">
      <div className="passe__faixa" aria-hidden="true"><span /><span /><span /><span /></div>
      <main className="passe__entrada">
        <div className="passe__colagem" aria-hidden="true">
          <img src="/selos/postal-membro.png" alt="" />
          <img src="/selos/postal-conector.png" alt="" />
          <img src="/selos/postal-embaixador.png" alt="" />
          <img src="/selos/carimbo-fundadora.png" alt="" />
        </div>
        <section className="passe__acesso">
          <img className="passe__logo" src="/brand/communicali-horizontal.png" alt="CommuniCALI" />
          <h1>Seu passaporte está <em>te esperando</em></h1>
          <p>{enviado ? `Enviamos um código para ${email.trim()}. Ele chega em instantes.` : 'Carimbos, pontos, missões e conexões da comunidade em um só lugar.'}</p>
          <form className="passe__form" onSubmit={(event) => void enviar(event)}>
            {enviado
              ? <label>Código recebido<input required inputMode="numeric" autoComplete="one-time-code" autoFocus value={codigo} onChange={(event) => setCodigo(event.target.value)} /></label>
              : <label>Seu e-mail<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>}
            {erro && <p className="passe__erro" role="alert">{erro}</p>}
            <button className="passe__botao" type="submit" disabled={busy}>{busy ? 'Aguarde...' : enviado ? 'Abrir meu passaporte' : 'Receber meu código'}</button>
          </form>
          {enviado ? <button type="button" className="passe__link" onClick={() => { setEnviado(false); setCodigo(''); setErro(''); }}>Usar outro e-mail</button> : <p className="passe__aviso">Use o e-mail do seu check-in. Ainda não foi a um encontro? <a href="/#proximo">Veja o próximo</a>.</p>}
        </section>
      </main>
    </div>
  );
}

function CarimboEdicao({ carimbo, indice }: { carimbo: Carimbo; indice: number }) {
  if (carimbo.carimbo_url) return <img className="passe__carimbo" src={carimbo.carimbo_url} alt={`Carimbo: ${carimbo.titulo}`} />;
  const cor = ['#5F6238', '#A9502E', '#7A1F3D'][indice % 3];
  const data = carimbo.data_evento.split('-').reverse().join('.');
  return (
    <svg className="passe__carimbo" viewBox="0 0 400 400" role="img" aria-label={`Carimbo: ${carimbo.titulo}`} style={{ transform: `rotate(${indice % 2 ? 5 : -6}deg)` }}>
      <rect x="28" y="92" width="344" height="216" fill="none" stroke={cor} strokeWidth="7" />
      <rect x="44" y="108" width="312" height="184" fill="none" stroke={cor} strokeWidth="2.5" />
      <text x="200" y="164" textAnchor="middle" fontSize="22" letterSpacing="4" fill={cor} fontWeight="700">COMMUNICALI</text>
      <text x="200" y="214" textAnchor="middle" fontSize="30" fill={cor} fontWeight="700">{carimbo.titulo.slice(0, 20)}</text>
      <text x="200" y="256" textAnchor="middle" fontSize="23" letterSpacing="2" fill={cor} fontWeight="700">{data}</text>
    </svg>
  );
}

function Inicio({ espaco, abrir }: { espaco: Espaco; abrir: (aba: Aba) => void }) {
  const m = espaco.membro!;
  const meta = META[m.categoria];
  const faltam = meta ? Math.max(meta.pontos - espaco.pontos, 0) : 0;
  const preenchidos = meta ? Math.min(espaco.pontos / meta.pontos, 1) * 10 : 10;
  return (
    <>
      <header className="passe__topo"><img className="passe__logo" src="/brand/communicali-horizontal.png" alt="CommuniCALI" /><span>PASSAPORTE</span></header>
      <h1>Olá, <em>{primeiroNome(espaco)}</em></h1>
      <section className="passe__dados passe__cartao passe__dados--cartao">
        <div className="passe__foto">{m.foto_url ? <img src={m.foto_url} alt="Sua foto" /> : <button type="button" onClick={() => abrir('perfil')}>Colocar foto</button>}</div>
        <dl>
          <div><dt>NOME</dt><dd className="grande">{m.nome}</dd></div>
          <div><dt>NÍVEL</dt><dd>{NIVEIS[m.categoria] || m.categoria}</dd></div>
          <div><dt>CÓDIGO</dt><dd>{m.codigo}</dd></div>
          <button type="button" className="passe__link" onClick={() => abrir('perfil')}>Editar meu perfil</button>
        </dl>
      </section>
      <section className="passe__carimbos">
        <h2>Meus carimbos</h2>
        <div className="passe__rolagem">
          {espaco.carimbos.map((carimbo, indice) => <CarimboEdicao key={carimbo.slug} carimbo={carimbo} indice={indice} />)}
          <div className="passe__vago">próximo<br />encontro</div>
        </div>
      </section>
      <section className="passe__pontos">
        <p className="passe__numero"><strong>{espaco.pontos}</strong> pontos{meta ? <>, <b>{faltam ? `faltam ${faltam} para ${meta.nome}` : `pontos alcançados para ${meta.nome}`}</b></> : ''}</p>
        <div className="passe__barra" aria-hidden="true">
          {Array.from({ length: 10 }, (_, indice) => <span key={indice} className={`c${Math.min(Math.floor(indice / 2), 3)}`} style={{ '--fill': `${Math.max(Math.min(preenchidos - indice, 1), 0) * 100}%` } as React.CSSProperties} />)}
        </div>
        {meta && <p className="passe__req">{Math.min(espaco.encontros, meta.encontros)} de {meta.encontros} encontros · {espaco.missoes.filter((item) => item.nivel === meta.nivel && item.status === 'concluida').length} de {espaco.missoes.filter((item) => item.nivel === meta.nivel).length} missões</p>}
        <p className="passe__mrz">P&lt;COMMUNICALI&lt;{m.nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]+/g, '<').slice(0, 18)}<br />{m.codigo.replace(/-/g, '<').padEnd(10, '<')}{espaco.carimbos[0]?.data_evento.split('-').reverse().join('') || ''}&lt;&lt;&lt;{espaco.pontos}</p>
      </section>
    </>
  );
}

function Edicoes({ espaco }: { espaco: Espaco }) {
  return (
    <>
      <h1>Edições</h1>
      {[...espaco.carimbos].reverse().map((edicao) => (
        <article className="passe__edicao" key={edicao.slug}>
          {edicao.capa_url && <img src={edicao.capa_url} alt={`Local: ${edicao.local}`} />}
          <div>
            <p className="passe__data">{longDate(edicao.data_evento)}</p>
            <h2>{edicao.titulo}</h2>
            <p>{edicao.local}, {edicao.cidade}</p>
            {edicao.fotos_url ? <a className="passe__botao" href={edicao.fotos_url} target="_blank" rel="noopener noreferrer">Acessar as fotos</a> : <p className="passe__aviso">As fotos entram aqui depois do encontro.</p>}
          </div>
        </article>
      ))}
      {espaco.proximas.map((edicao) => (
        <article className="passe__edicao passe__edicao--proxima" key={edicao.slug}>
          <div>
            <p className="passe__data">Próximo encontro · {longDate(edicao.data_evento)}</p>
            <h2>{edicao.titulo}</h2>
            <p>{edicao.local}, {edicao.cidade}</p>
            {edicao.inscricoes_abertas && <a className="passe__botao passe__botao--oliva" href={`/inscricao/${edicao.slug}`}>Quero me inscrever</a>}
          </div>
        </article>
      ))}
    </>
  );
}

function CartaoMissao({ missao, recarregar, liberada }: { missao: Missao; recarregar: () => void; liberada: boolean }) {
  const [abrindo, setAbrindo] = useState(false);
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [erro, setErro] = useState('');
  const feita = missao.status === 'concluida';
  const podeEnviar = liberada && missao.modo === 'analise' && (missao.status === 'aberta' || missao.status === 'recusada');
  const formulario = FORMULARIOS[missao.slug] || [];

  async function enviar(event: FormEvent) {
    event.preventDefault();
    const relato = formulario.filter((item) => campos[item.id]).map((item) => `${item.rotulo}: ${campos[item.id]}`).join(' · ');
    const { error } = await supabase.rpc('communicali_enviar_missao', { p_slug: missao.slug, p_relato: relato });
    if (error) setErro(errorMessage(error)); else recarregar();
  }

  return (
    <article className={`passe__missao passe__missao--${missao.slug}`}>
      <div className="passe__missao-topo">
        <img className={feita ? '' : 'is-apagado'} src={`/selos/${SELO[missao.slug] || 'postal-conector'}.png`} alt={feita ? 'Selo conquistado' : 'Selo ainda não conquistado'} />
        <div>
          <p className="passe__etiqueta">{!liberada && !feita ? 'ABRE EM CONECTOR' : missao.modo === 'convite' && !feita ? 'POR CONVITE' : (SITUACAO[missao.status] || missao.status).toUpperCase()}</p>
          <h2>{missao.titulo}</h2>
          <p>{missao.descricao}</p>
        </div>
      </div>
      {podeEnviar && !abrindo && <button type="button" className="passe__botao passe__botao--terra" onClick={() => setAbrindo(true)}>Enviar para análise</button>}
      {abrindo && (
        <form className="passe__form" onSubmit={(event) => void enviar(event)}>
          {formulario.map((item) => (
            <label key={item.id}>{item.rotulo}
              {item.opcoes
                ? <select required={item.obrigatorio} value={campos[item.id] || ''} onChange={(event) => setCampos({ ...campos, [item.id]: event.target.value })}><option value="">Escolha</option>{item.opcoes.map((opcao) => <option key={opcao}>{opcao}</option>)}</select>
                : <input required={item.obrigatorio} type={item.tipo || 'text'} value={campos[item.id] || ''} onChange={(event) => setCampos({ ...campos, [item.id]: event.target.value })} />}
            </label>
          ))}
          {erro && <p className="passe__erro" role="alert">{erro}</p>}
          <button type="submit" className="passe__botao passe__botao--terra">Enviar</button>
        </form>
      )}
    </article>
  );
}

function Missoes({ espaco, recarregar }: { espaco: Espaco; recarregar: () => void }) {
  const categoria = espaco.membro!.categoria;
  return (
    <>
      <h1>Missões</h1>
      <p>Cada missão cumprida acende um selo.</p>
      {espaco.missoes.map((missao) => <CartaoMissao key={missao.slug} missao={missao} recarregar={recarregar} liberada={missao.nivel !== 'embaixador' || categoria === 'conector' || categoria === 'embaixador' || categoria === 'fundadora'} />)}
    </>
  );
}

function Indicar({ espaco, recarregar }: { espaco: Espaco; recarregar: () => void }) {
  const [frente, setFrente] = useState<'visitantes' | 'parceiro' | 'lugar'>('visitantes');
  const [codigo, setCodigo] = useState(espaco.membro!.codigo);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [form, setForm] = useState({ nome: '', instagram: '', linkedin: '', telefone: '', pessoa: '' });
  const atual = espaco.membro!.codigo;
  const mudou = codigo.trim().toUpperCase() !== atual;
  const texto = `Quero te convidar para um encontro da CommuniCALI: ${inviteUrl(atual)}`;

  async function salvarCodigo() {
    setErro(''); setAviso('');
    const { error } = await supabase.rpc('communicali_escolher_codigo', { p_codigo: codigo });
    if (error) setErro(errorMessage(error)); else { setAviso('Código salvo.'); recarregar(); }
  }

  async function recomendar(event: FormEvent) {
    event.preventDefault();
    setErro(''); setAviso('');
    const { error } = await supabase.rpc('communicali_recomendar', { p_tipo: frente, p_nome: form.nome, p_instagram: form.instagram, p_linkedin: form.linkedin, p_telefone: form.telefone, p_pessoa: form.pessoa });
    if (error) { setErro(errorMessage(error)); return; }
    setForm({ nome: '', instagram: '', linkedin: '', telefone: '', pessoa: '' });
    setAviso('Recomendação enviada. Os pontos entram depois da validação da organização.');
    recarregar();
  }

  const campo = (chave: keyof typeof form, rotulo: string, obrigatorio = false) => <label>{rotulo}<input required={obrigatorio} value={form[chave]} onChange={(event) => setForm({ ...form, [chave]: event.target.value })} /></label>;

  return (
    <>
      <h1>Indicar</h1>
      <div className="passe__seg" role="group" aria-label="O que indicar">
        {([['visitantes', 'Visitantes'], ['parceiro', 'Parceiros'], ['lugar', 'Lugares']] as const).map(([id, nome]) => <button key={id} type="button" className={frente === id ? 'is-on' : ''} aria-pressed={frente === id} onClick={() => { setFrente(id); setErro(''); setAviso(''); }}>{nome}</button>)}
      </div>
      {aviso && <p className="passe__ok" role="status">{aviso}</p>}
      {erro && <p className="passe__erro" role="alert">{erro}</p>}
      {frente === 'visitantes' ? (
        <>
          <section className="passe__bilhete">
            <div>
              <label>ESCOLHA SEU CÓDIGO<input value={codigo} maxLength={20} onChange={(event) => setCodigo(event.target.value.toUpperCase().replace(/\s/g, ''))} /></label>
              {mudou ? <button type="button" className="passe__botao" onClick={() => void salvarCodigo()}>Salvar código</button> : <p>Use um nome fácil de lembrar, como um cupom.</p>}
            </div>
            <div className="passe__bilhete-acoes">
              <button type="button" className="passe__botao" onClick={() => void navigator.clipboard.writeText(texto).then(() => setAviso('Convite copiado.'))}>Copiar convite</button>
              <a className="passe__botao passe__botao--linha" href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
            </div>
          </section>
          <p><strong>A indicação só vale se a pessoa comparecer.</strong> Os 5 pontos entram depois do check-in dela no encontro.</p>
          <h2>Minhas indicações</h2>
          {espaco.indicacoes.map((item, indice) => <div className="passe__linha" key={`${item.nome}-${indice}`}><span>{item.nome}</span>{item.compareceu ? <strong>Compareceu, +5</strong> : <span>Aguardando presença</span>}</div>)}
          {!espaco.indicacoes.length && <p className="passe__aviso">Suas indicações aparecem aqui.</p>}
        </>
      ) : (
        <>
          <p>{frente === 'lugar' ? 'Conhece um lugar bom para um encontro ou uma estrutura que ajude a comunidade? Conte para a organização.' : 'Conhece uma empresa ou pessoa que pode contribuir com um encontro? Conte para a organização.'}</p>
          <form className="passe__form passe__cartao" onSubmit={(event) => void recomendar(event)}>
            {campo('nome', frente === 'lugar' ? 'Nome do lugar' : 'Nome do parceiro', true)}
            {campo('instagram', 'Instagram')}
            {campo('linkedin', 'LinkedIn')}
            {campo('telefone', 'Telefone', true)}
            {campo('pessoa', 'Pessoa para validar', true)}
            <button type="submit" className="passe__botao passe__botao--oliva">Enviar recomendação</button>
          </form>
          {espaco.recomendacoes.filter((item) => item.tipo === frente).map((item, indice) => <div className="passe__linha" key={`${item.nome}-${indice}`}><span>{item.nome}</span><span>{item.status === 'validada' ? 'Validada, +10' : item.status === 'recusada' ? 'Não validada' : 'Em análise'}</span></div>)}
        </>
      )}
    </>
  );
}

function Programa({ espaco }: { espaco: Espaco }) {
  const categoria = espaco.membro!.categoria;
  const niveis: Array<[string, string, string, string]> = [
    ['visitante', 'Visitante', 'Inscrito no grupo ou em um encontro.', 'rose'],
    ['membro', 'Membro', 'Esteve em um encontro presencial.', 'branco'],
    ['conector', 'Conector', '100 pontos, 3 encontros e 2 missões. Vantagens a definir.', 'oliva'],
    ['embaixador', 'Embaixador', '250 pontos, 6 encontros, parceiro trazido, missões e aprovação. Vantagens a definir.', 'areia'],
  ];
  return (
    <>
      <h1>Programa</h1>
      <p>Cada pessoa tem um papel na comunidade.</p>
      {niveis.map(([id, nome, texto, cor]) => (
        <section key={id} className={`passe__nivel passe__nivel--${cor}${id === categoria ? ' is-on' : ''}`}>
          <img src={`/selos/postal-${id}.png`} alt="" />
          <div><h2>{nome}{id === categoria ? ' · você está aqui' : ''}</h2><p>{texto}</p></div>
        </section>
      ))}
      <section className="passe__cartao">
        <h2>Como ganhar pontos</h2>
        {PONTOS.map(([texto, valor]) => <div className="passe__ponto" key={texto}><span>{texto}</span><strong>+{valor}</strong></div>)}
      </section>
      <a className="passe__botao passe__botao--linha" href="/regras" target="_blank" rel="noopener noreferrer">Nossas regras</a>
      <p className="passe__aviso">Pontos sozinhos não mudam o nível: a organização confirma cada avanço. Os detalhes do programa entram aqui em breve.</p>
    </>
  );
}

function Chips({ titulo, opcoes, marcados, alternar }: { titulo: string; opcoes: string[]; marcados: string[]; alternar: (item: string) => void }) {
  return (
    <section className="passe__cartao">
      <h2>{titulo}</h2>
      <div className="passe__temas">{[...new Set([...opcoes, ...marcados])].map((item) => <button key={item} type="button" className={marcados.includes(item) ? 'is-on' : ''} aria-pressed={marcados.includes(item)} onClick={() => alternar(item)}>{item}</button>)}</div>
    </section>
  );
}

function Perfil({ espaco, recarregar, voltar }: { espaco: Espaco; recarregar: () => void; voltar: () => void }) {
  const m = espaco.membro!;
  const [foto, setFoto] = useState(m.foto_url || '');
  const [temas, setTemas] = useState<string[]>(m.temas);
  const [interesses, setInteresses] = useState<string[]>([]);
  const [palestras, setPalestras] = useState(m.interesse_palestras);
  const [linkedin, setLinkedin] = useState(m.linkedin || '');
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');
  const [cidade, setCidade] = useState('');
  const [naRede, setNaRede] = useState(false);
  const [presta, setPresta] = useState(false);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.rpc('communicali_meus_contatos').then(({ data }) => {
      const dados = data as { whatsapp: string | null; instagram: string | null; cidade_uf: string | null; interesses: string[]; na_rede: boolean; presta_servicos: boolean } | null;
      if (!dados) return;
      setWhatsapp(dados.whatsapp || ''); setInstagram(dados.instagram || ''); setCidade(dados.cidade_uf || ''); setInteresses(dados.interesses || []); setNaRede(dados.na_rede); setPresta(dados.presta_servicos);
    });
  }, []);

  const alternar = (lista: string[], definir: (nova: string[]) => void) => (item: string) => definir(lista.includes(item) ? lista.filter((atual) => atual !== item) : [...lista, item]);

  async function enviarFoto(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;
    setBusy(true); setErro('');
    const { data } = await supabase.auth.getUser();
    const caminho = `membros/${data.user?.id}/${crypto.randomUUID()}.${arquivo.name.split('.').pop()?.toLowerCase() || 'jpg'}`;
    const { error } = await supabase.storage.from('site').upload(caminho, arquivo, { contentType: arquivo.type });
    if (error) setErro('Não foi possível enviar a foto. Use uma imagem JPG ou PNG menor.');
    else setFoto(supabase.storage.from('site').getPublicUrl(caminho).data.publicUrl);
    setBusy(false);
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setErro(''); setAviso('');
    const { error } = await supabase.rpc('communicali_salvar_perfil', { p_foto_url: foto, p_temas: temas, p_interesses: interesses, p_interesse: palestras, p_linkedin: linkedin, p_whatsapp: whatsapp, p_instagram: instagram, p_cidade_uf: cidade, p_na_rede: naRede, p_presta: presta });
    if (error) setErro(errorMessage(error)); else { setAviso('Perfil salvo.'); recarregar(); }
    setBusy(false);
  }

  return (
    <>
      <button type="button" className="passe__link" onClick={voltar}>Voltar</button>
      <section className="passe__dados passe__cartao passe__dados--cartao">
        <div className="passe__foto">{foto ? <img src={foto} alt="Sua foto" /> : <span>Sem foto</span>}</div>
        <div><h1>Meu perfil</h1><label className="passe__link">Trocar foto<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => void enviarFoto(event)} /></label></div>
      </section>
      <form className="passe__form" onSubmit={(event) => void salvar(event)}>
        <section className="passe__cartao">
          <h2>Onde me encontrar</h2>
          <label>WhatsApp<input inputMode="tel" autoComplete="tel" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} /></label>
          <label>E-mail<input value={m.email} readOnly /></label>
          <label>Instagram<input value={instagram} onChange={(event) => setInstagram(event.target.value)} /></label>
          <label>LinkedIn<input value={linkedin} onChange={(event) => setLinkedin(event.target.value)} /></label>
          <label>Cidade e estado<input value={cidade} onChange={(event) => setCidade(event.target.value)} /></label>
        </section>
        <Chips titulo="O que eu faço" opcoes={ATUACAO} marcados={temas} alternar={alternar(temas, setTemas)} />
        <Chips titulo="Meus interesses" opcoes={INTERESSES_REDE} marcados={interesses} alternar={alternar(interesses, setInteresses)} />
        <label className="passe__marca"><input type="checkbox" checked={naRede} onChange={(event) => setNaRede(event.target.checked)} /><span><strong>Aparecer na Rede.</strong> Membros veem sua foto, o que você faz e seus interesses. Seus contatos ficam visíveis só para Conectores, Embaixadores e organização. Desmarque para sair.</span></label>
        <label className="passe__marca passe__marca--oliva"><input type="checkbox" checked={presta} onChange={(event) => setPresta(event.target.checked)} /><span><strong>Ofereço serviços.</strong> Você também aparece em Parceiros e prestadores, se estiver na Rede.</span></label>
        <label className="passe__marca passe__marca--areia"><input type="checkbox" checked={palestras} onChange={(event) => setPalestras(event.target.checked)} /><span><strong>Quero contribuir com palestras.</strong> A organização vê seu perfil e faz o convite quando fizer sentido.</span></label>
        {aviso && <p className="passe__ok" role="status">{aviso}</p>}
        {erro && <p className="passe__erro" role="alert">{erro}</p>}
        <button type="submit" className="passe__botao" disabled={busy}>{busy ? 'Aguarde...' : 'Salvar perfil'}</button>
      </form>
      <button type="button" className="passe__link" onClick={() => void supabase.auth.signOut()}>Sair</button>
    </>
  );
}

function FichaPessoa({ pessoa, contatos, voltar }: { pessoa: Pessoa; contatos: boolean; voltar: () => void }) {
  const whatsapp = pessoa.whatsapp?.replace(/\D/g, '');
  return (
    <>
      <button type="button" className="passe__link" onClick={voltar}>Voltar para a Rede</button>
      <section className="passe__dados passe__cartao passe__dados--cartao">
        <div className="passe__foto">{pessoa.foto_url ? <img src={pessoa.foto_url} alt={`Foto de ${pessoa.nome}`} /> : <span>Sem foto</span>}</div>
        <div><h1 className="menor">{pessoa.nome}</h1><p className="passe__data">{NIVEIS[pessoa.categoria] || pessoa.categoria}</p>{pessoa.cidade_uf && <p>{pessoa.cidade_uf}</p>}{(pessoa.cargo || pessoa.empresa) && <p>{[pessoa.cargo, pessoa.empresa].filter(Boolean).join(', ')}</p>}</div>
      </section>
      {!!pessoa.temas.length && <section className="passe__cartao"><h2>O que faz</h2><div className="passe__temas">{pessoa.temas.map((item) => <span key={item} className="is-on">{item}</span>)}</div></section>}
      {!!pessoa.interesses.length && <section className="passe__cartao"><h2>Interesses</h2><div className="passe__temas">{pessoa.interesses.map((item) => <span key={item}>{item}</span>)}</div></section>}
      <section className="passe__cartao">
        <h2>Onde encontrar</h2>
        {contatos ? (
          <div className="passe__contatos">
            {whatsapp && <a href={`https://wa.me/${whatsapp.length <= 11 ? `55${whatsapp}` : whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
            {pessoa.email && <a href={`mailto:${pessoa.email}`}>E-mail</a>}
            {pessoa.instagram && <a href={`https://www.instagram.com/${pessoa.instagram.replace(/^.*instagram\.com\//, '').replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer">Instagram</a>}
            {pessoa.linkedin && <a href={/^https?:/.test(pessoa.linkedin) ? pessoa.linkedin : `https://${pessoa.linkedin}`} target="_blank" rel="noopener noreferrer">LinkedIn</a>}
          </div>
        ) : <p>Os contatos abrem quando você chega a Conector.</p>}
      </section>
    </>
  );
}

function Rede() {
  const [rede, setRede] = useState<{ pode_ver_contatos: boolean; pessoas: Pessoa[]; parceiros: Parceiro[] } | null>(null);
  const [frente, setFrente] = useState<'pessoas' | 'parceiros'>('pessoas');
  const [busca, setBusca] = useState('');
  const [aberta, setAberta] = useState<Pessoa | null>(null);
  useEffect(() => { supabase.rpc('communicali_rede').then(({ data }) => setRede(data as typeof rede)); }, []);
  if (aberta) return <FichaPessoa pessoa={aberta} contatos={Boolean(rede?.pode_ver_contatos)} voltar={() => setAberta(null)} />;
  const termo = busca.trim().toLowerCase();
  const confere = (pessoa: Pessoa) => !termo || [pessoa.nome, pessoa.cidade_uf, pessoa.empresa, ...pessoa.temas, ...pessoa.interesses].join(' ').toLowerCase().includes(termo);
  const pessoas = (rede?.pessoas || []).filter((pessoa) => confere(pessoa) && (frente === 'pessoas' || pessoa.presta_servicos));
  const parceiros = (rede?.parceiros || []).filter((item) => !termo || item.nome.toLowerCase().includes(termo));
  return (
    <>
      <h1>Rede</h1>
      <p>{rede?.pode_ver_contatos ? 'Conheça quem faz parte e crie conexões.' : 'Veja quem faz parte. Os contatos abrem quando você chega a Conector.'}</p>
      <div className="passe__seg passe__seg--dois" role="group" aria-label="Quem ver">
        <button type="button" className={frente === 'pessoas' ? 'is-on' : ''} aria-pressed={frente === 'pessoas'} onClick={() => setFrente('pessoas')}>Pessoas</button>
        <button type="button" className={frente === 'parceiros' ? 'is-on' : ''} aria-pressed={frente === 'parceiros'} onClick={() => setFrente('parceiros')}>Parceiros e prestadores</button>
      </div>
      <div className="passe__form"><label>Buscar por nome, cidade ou tema<input value={busca} onChange={(event) => setBusca(event.target.value)} /></label></div>
      {frente === 'parceiros' && parceiros.map((item) => (
        <article className="passe__linha passe__linha--parceiro" key={item.id}>
          {item.logo_url && <img src={item.logo_url} alt="" />}
          <strong>{item.nome}</strong>
          {item.site_url && <a className="passe__link" href={item.site_url} target="_blank" rel="noopener noreferrer">Visitar</a>}
        </article>
      ))}
      <div className="passe__pessoas">
        {pessoas.map((pessoa) => (
          <button type="button" className="passe__pessoa" key={pessoa.id} onClick={() => { setAberta(pessoa); window.scrollTo(0, 0); }}>
            <span className="passe__pessoa-foto">{pessoa.foto_url ? <img src={pessoa.foto_url} alt="" /> : pessoa.nome.charAt(0)}</span>
            <strong>{pessoa.nome}</strong>
            <span>{pessoa.temas[0] || NIVEIS[pessoa.categoria] || pessoa.categoria}</span>
          </button>
        ))}
      </div>
      {rede && !pessoas.length && (frente === 'pessoas' || !parceiros.length) && <p className="passe__aviso">Ninguém por aqui ainda. As pessoas entram na Rede depois do primeiro encontro.</p>}
    </>
  );
}

export function MeuEspaco() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [espaco, setEspaco] = useState<Espaco | null>(null);
  const [aba, setAba] = useState<Aba>('inicio');

  useEffect(() => {
    const anterior = document.documentElement.style.background;
    document.documentElement.style.background = '#F7F0EA';
    document.documentElement.classList.add('passe-html');
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => { data.subscription.unsubscribe(); document.documentElement.style.background = anterior; document.documentElement.classList.remove('passe-html'); };
  }, []);

  const carregar = () => { void supabase.rpc('communicali_meu_espaco').then(({ data }) => setEspaco(data as Espaco)); };
  useEffect(() => { if (session) carregar(); else setEspaco(null); }, [session?.user.id]);

  if (session === undefined) return <div className="passe" aria-busy="true" />;
  if (!session) return <Entrar />;
  if (!espaco) return <div className="passe" aria-busy="true" />;
  if (!espaco.membro) return (
    <Pagina>
      <img className="passe__logo" src="/brand/communicali-horizontal.png" alt="CommuniCALI" />
      <h1>Seu passaporte abre no primeiro encontro</h1>
      <p>Quem participa de um encontro presencial se torna membro. Depois do check-in, este espaço libera seus carimbos, pontos e missões.</p>
      <a className="passe__botao" href="/#proximo">Ver o próximo encontro</a>
      <button type="button" className="passe__link" onClick={() => void supabase.auth.signOut()}>Sair</button>
    </Pagina>
  );

  return (
    <Pagina aba={aba} setAba={setAba}>
      {aba === 'inicio' && <Inicio espaco={espaco} abrir={setAba} />}
      {aba === 'edicoes' && <Edicoes espaco={espaco} />}
      {aba === 'missoes' && <Missoes espaco={espaco} recarregar={carregar} />}
      {aba === 'rede' && <Rede />}
      {aba === 'indicar' && <Indicar espaco={espaco} recarregar={carregar} />}
      {aba === 'programa' && <Programa espaco={espaco} />}
      {aba === 'perfil' && <Perfil espaco={espaco} recarregar={carregar} voltar={() => setAba('inicio')} />}
    </Pagina>
  );
}
