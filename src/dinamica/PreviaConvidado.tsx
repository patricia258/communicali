/* Prévia do caminho do convidado: cada tela do celular, na ordem. Só para ver; nada é gravado. */
import { useEffect } from 'react';
import './dinamica.css';

const PASSOS: [string, string, string][] = [
  ['1. Check-in', 'A pessoa escaneia o QR Code do telão e informa o e-mail.', '/checkin?novo=1'],
  ['2. Presença confirmada', 'Depois dos aceites, aparece o cartão de embarque e ela segue sozinha para a sala.', '/checkin?previa=sucesso'],
  ['3. Sala, etapas trancadas', 'Ela fica aqui até a equipe de apoio liberar a próxima etapa.', '/sala?previa=boasvindas'],
  ['4. Votação liberada', 'O apoio libera e a votação aparece no celular, sozinha.', '/sala?previa=votacao'],
  ['5. Dinâmica de palavras', 'Depois, as duas perguntas das palavras (aqui ainda fechadas, abrem na hora).', '/sala?previa=palavras'],
  ['6. Pesquisa de satisfação', 'Por fim, a pesquisa aparece na mesma janela.', '/sala?previa=pesquisa'],
];

export function PreviaConvidado() {
  useEffect(() => { document.title = 'Caminho do convidado'; }, []);
  return (
    <main style={{ background: '#F7F0EA', minHeight: '100vh', padding: '28px 20px 60px', fontFamily: "Inter,sans-serif", color: '#3A2A26' }}>
      <h1 style={{ color: '#5A1E2D', margin: '0 0 6px' }}>Caminho do convidado, passo a passo</h1>
      <p style={{ margin: '0 0 24px', maxWidth: 720 }}>É o que a pessoa vê no celular, na ordem. Só para visualizar: nada aqui é gravado e as telas não respondem ao toque.</p>
      <div style={{ display: 'flex', gap: 24, overflowX: 'auto', paddingBottom: 16 }}>
        {PASSOS.map(([titulo, texto, url]) => (
          <figure key={url} style={{ margin: 0, flex: '0 0 auto', width: 300 }}>
            <figcaption style={{ marginBottom: 10 }}><b style={{ color: '#5A1E2D' }}>{titulo}</b><br /><span style={{ fontSize: 14 }}>{texto}</span></figcaption>
            <div style={{ position: 'relative', width: 300, height: 600, borderRadius: 28, border: '8px solid #2A1218', overflow: 'hidden', background: '#fff' }}>
              <iframe title={titulo} src={url} style={{ width: 375, height: 750, border: 0, transform: 'scale(.784)', transformOrigin: '0 0' }} />
              <div style={{ position: 'absolute', inset: 0 }} />
            </div>
          </figure>
        ))}
      </div>
    </main>
  );
}
