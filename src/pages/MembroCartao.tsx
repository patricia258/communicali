/* Cartão para compartilhar o nível e aviso de parabéns quando o nível muda. A imagem é desenhada no próprio aparelho. */
import { useEffect, useState } from 'react';
import { seloUrl } from '../selosNovos';

const SELOS: Record<string, string> = { fundadora: 'postal-fundadora', membro: 'postal-membro', conector: 'postal-conector', embaixador: 'postal-embaixador' };
const VANTAGENS: Record<string, string[]> = {
  conector: ['Contatos da Rede liberados', 'Selo de Conector no seu passaporte', 'Novas missões para chegar a Embaixador', 'Descontos e benefícios: a organização avisa em breve'],
  embaixador: ['Contatos da Rede liberados', 'Selo de Embaixador no seu passaporte', 'Reconhecimento no site da comunidade', 'Descontos e benefícios: a organização avisa em breve'],
};

const carregar = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const imagem = new Image();
  imagem.crossOrigin = 'anonymous';
  imagem.onload = () => resolve(imagem);
  imagem.onerror = reject;
  imagem.src = src;
});

async function desenhar(nome: string, nivel: string, categoria: string, foto: string | null) {
  await document.fonts.load('800 60px "Funnel Display"').catch(() => undefined);
  const tela = document.createElement('canvas');
  tela.width = 1080;
  tela.height = 1350;
  const c = tela.getContext('2d')!;
  c.fillStyle = '#F3F6F9';
  c.fillRect(0, 0, 1080, 1350);
  c.strokeStyle = 'rgba(198,218,234,.22)';
  c.lineWidth = 2;
  for (let raio = 30; raio < 1500; raio += 26) { c.beginPath(); c.arc(960, 120, raio, 0, Math.PI * 2); c.stroke(); }
  [['#5A1E2D', 0, 405], ['#3F6E9A', 405, 270], ['#C6DAEA', 675, 270], ['#6F6770', 945, 135]].forEach(([cor, x, largura]) => { c.fillStyle = String(cor); c.fillRect(Number(x), 0, Number(largura), 16); });
  const logo = await carregar('/brand/novo/comunicali-b-fundo-claro.svg');
  c.drawImage(logo, 70, 58, 460, 460 * logo.height / logo.width);
  c.save();
  c.translate(330, 590);
  c.rotate(-0.05);
  c.shadowColor = 'rgba(34,16,15,.25)';
  c.shadowBlur = 36;
  c.shadowOffsetY = 18;
  c.fillStyle = '#fff';
  c.fillRect(-230, -290, 460, 580);
  c.shadowColor = 'transparent';
  if (foto) {
    const imagem = await carregar(foto);
    const razao = Math.max(424 / imagem.width, 544 / imagem.height);
    const largura = 424 / razao;
    const altura = 544 / razao;
    c.drawImage(imagem, (imagem.width - largura) / 2, Math.max((imagem.height - altura) * 0.12, 0), largura, altura, -212, -272, 424, 544);
  } else {
    c.fillStyle = '#E3EAF1';
    c.fillRect(-212, -272, 424, 544);
    c.fillStyle = '#5A1E2D';
    c.font = '800 180px "Funnel Display", sans-serif';
    c.textAlign = 'center';
    c.fillText(nome.charAt(0), 0, 60);
  }
  c.restore();
  const selo = await carregar(seloUrl(SELOS[categoria] ? categoria : 'membro'));
  c.save();
  c.translate(790, 620);
  c.rotate(0.08);
  c.drawImage(selo, -210, -263, 420, 525);
  c.restore();
  c.textAlign = 'left';
  c.fillStyle = '#1B0A10';
  c.font = '800 76px "Funnel Display", sans-serif';
  c.fillText(nome, 70, 1000, 940);
  c.fillStyle = '#5A1E2D';
  c.font = '700 54px "Funnel Display", sans-serif';
  c.fillText(`${nivel} da ComuniCALI`, 70, 1075, 940);
  c.fillStyle = '#C6DAEA';
  c.fillRect(70, 1120, 300, 5);
  c.fillStyle = '#5A1E2D';
  c.font = '400 36px Inter, sans-serif';
  c.fillText('Falar de pessoas pode mudar o mundo.', 70, 1195, 940);
  c.font = '600 32px Inter, sans-serif';
  c.fillText('comuni.calirh.com', 70, 1255);
  return new Promise<Blob>((resolve, reject) => tela.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('imagem'))), 'image/png'));
}

export function JanelaCartao({ nome, nivel, categoria, foto, novo, fechar }: { nome: string; nivel: string; categoria: string; foto: string | null; novo?: boolean; fechar: () => void }) {
  const [arquivo, setArquivo] = useState<Blob | null>(null);
  const [erro, setErro] = useState(false);
  const url = arquivo ? URL.createObjectURL(arquivo) : '';

  useEffect(() => { desenhar(nome, nivel, categoria, foto).then(setArquivo).catch(() => setErro(true)); }, [nome, nivel, categoria, foto]);

  async function compartilhar() {
    if (!arquivo) return;
    const imagem = new File([arquivo], 'meu-selo-communicali.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [imagem] })) await navigator.share({ files: [imagem], text: `Sou ${nivel} da ComuniCALI. Falar de pessoas pode mudar o mundo.` }).catch(() => undefined);
  }

  const podeCompartilhar = Boolean(arquivo && navigator.canShare?.({ files: [new File([arquivo], 'selo.png', { type: 'image/png' })] }));
  return (
    <div className="passe__modal" role="dialog" aria-modal="true" aria-label={novo ? 'Parabéns pelo novo nível' : 'Compartilhar meu selo'}>
      <div className="passe__janela">
        {novo ? (
          <>
            <p className="passe__etiqueta">NOVO NÍVEL</p>
            <h2>Parabéns! Você agora é {nivel}.</h2>
            <ul>{(VANTAGENS[categoria] || []).map((item) => <li key={item}>{item}</li>)}</ul>
            <p>Compartilhe essa conquista:</p>
          </>
        ) : <h2>Compartilhe seu selo</h2>}
        {url ? <img className="passe__previa" src={url} alt="Prévia do cartão para compartilhar" /> : <p className="passe__aviso">{erro ? 'Não foi possível montar a imagem.' : 'Montando seu cartão...'}</p>}
        {podeCompartilhar && <button type="button" className="passe__botao" onClick={() => void compartilhar()}>Compartilhar</button>}
        {url && <a className={`passe__botao${podeCompartilhar ? ' passe__botao--linha' : ''}`} href={url} download="meu-selo-communicali.png">Baixar imagem</a>}
        <button type="button" className="passe__link" onClick={fechar}>Fechar</button>
      </div>
    </div>
  );
}
