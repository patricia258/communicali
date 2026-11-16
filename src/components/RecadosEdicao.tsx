import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { AVATARES, AvatarRecado } from './AvatarRecado';
import './recados.css';

type Recado = { id: string; nome: string | null; texto: string; created_at: string; avatar: string | null };
const LIMITE = 500;
const dia = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

/** Recados da edição encerrada: qualquer pessoa escreve, com nome ou anônima, e escolhe um avatar. Só aparece depois de aprovado. */
export function RecadosEdicao({ slug }: { slug: string }) {
  const [lista, setLista] = useState<Recado[]>([]);
  const [texto, setTexto] = useState('');
  const [nome, setNome] = useState('');
  const [anonimo, setAnonimo] = useState(true);
  const [avatar, setAvatar] = useState('');
  const [todos, setTodos] = useState(false);
  const [armadilha, setArmadilha] = useState('');
  const [estado, setEstado] = useState<'' | 'enviando' | 'enviado'>('');
  const [erro, setErro] = useState('');
  useEffect(() => {
    supabase.rpc('communicali_comentarios', { p_slug: slug }).then(({ data, error }) => { if (!error) setLista((data || []) as Recado[]); });
  }, [slug]);
  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(''); setEstado('enviando');
    const { error } = await supabase.rpc('communicali_comentar', { p_slug: slug, p_texto: texto, p_nome: nome, p_anonimo: anonimo, p_site: armadilha, p_avatar: avatar || null });
    if (error) { setEstado(''); setErro(/não recebe|precisa ter|muitos/i.test(error.message) ? error.message : 'Não foi possível enviar agora. Tente de novo em instantes.'); return; }
    setEstado('enviado'); setTexto(''); setNome('');
  }
  const opcoes = todos ? AVATARES : AVATARES.slice(0, 6);
  return (
    <section className="hn-ed__bloco rec" aria-label="Recados">
      <header className="rec__topo">
        <h2>O que o pessoal disse</h2>
        {lista.length === 0 && <p className="rec__conta">Seja a primeira pessoa a deixar um recado.</p>}
      </header>
      {lista.length > 0 && <ul className="rec__lista">{lista.map((c) => (
        <li key={c.id}><AvatarRecado tipo={c.avatar} /><div><p>{c.texto}</p><small>{c.nome || 'Anônimo'} · {dia(c.created_at)}</small></div></li>
      ))}</ul>}
      {estado === 'enviado'
        ? <p className="rec__ok" role="status">Obrigada! Seu recado aparece aqui depois que a equipe ler.</p>
        : (
          <form className="rec__form" onSubmit={(e) => void enviar(e)}>
            <h3>Deixe o seu recado</h3>
            <label className="rec__campo"><span className="rec__sr">Seu recado</span>
              <textarea required minLength={3} maxLength={LIMITE} rows={4} value={texto} placeholder="Conte como foi para você…" onChange={(e) => setTexto(e.target.value)} />
              <span className="rec__conta2" aria-live="polite">{texto.length} / {LIMITE}</span>
            </label>
            <fieldset className="rec__avatares">
              <legend>Escolha o seu avatar</legend>
              <div role="radiogroup" aria-label="Avatar">
                {opcoes.map((a) => (
                  <button key={a.id} type="button" role="radio" aria-checked={avatar === a.id} aria-label={a.nome} title={a.nome} className={`rec__av${avatar === a.id ? ' is-on' : ''}`} onClick={() => setAvatar(avatar === a.id ? '' : a.id)}><AvatarRecado tipo={a.id} tamanho={44} /></button>
                ))}
                <button type="button" className="rec__todos" onClick={() => setTodos(!todos)}>{todos ? 'Ver menos' : 'Ver todos'}</button>
              </div>
            </fieldset>
            {!anonimo && <label className="rec__nome">Seu nome<input required maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" /></label>}
            <input className="hn-coment__armadilha" tabIndex={-1} autoComplete="off" aria-hidden="true" value={armadilha} onChange={(e) => setArmadilha(e.target.value)} name="site" />
            <fieldset className="rec__aparecer">
              <legend>Como quer aparecer?</legend>
              <div className="rec__linha">
                <div className="rec__pilulas">
                  <button type="button" aria-pressed={anonimo} className={`rec__pilula${anonimo ? ' is-on' : ''}`} onClick={() => setAnonimo(true)}>Anônimo</button>
                  <button type="button" aria-pressed={!anonimo} className={`rec__pilula${!anonimo ? ' is-on' : ''}`} onClick={() => setAnonimo(false)}>Mostrar meu nome</button>
                </div>
                <button className="hn-pill rec__enviar" type="submit" disabled={estado === 'enviando'}>{estado === 'enviando' ? 'Enviando…' : 'Enviar recado'}</button>
              </div>
            </fieldset>
            {erro && <p className="rec__erro" role="alert">{erro}</p>}
            <small className="rec__aviso">A equipe lê antes de publicar.</small>
          </form>
        )}
    </section>
  );
}
