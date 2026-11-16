import { proximoDiaUtil } from './diasUteis.js';
export type CategoriaCusto = 'staff' | 'fornecedor' | 'parceiro';
export type Recebedor = { nome: string; pessoa: 'PF' | 'PJ' | 'a_definir'; documento: string; email: string; pix: string; pix_tipo: string; banco: string; importado_em?: string };
export type ItemCusto = { id: string; descricao: string; quantidade_mil: number; unitario_centavos: number | null };
export type ParcelaCusto = { id: string; descricao: string; percentual_bp: number; vencimento: string | null; regra: string; pago_centavos: number; pago_em: string | null; forma: string; valor_centavos?: number | null; vencimento_modo?: 'manual' | 'pos_evento'; pago_registrado_em?: string | null };
export type Custo = { id: string; edition_id: string; categoria: CategoriaCusto; titulo: string; recebedor: Recebedor; origem_tabela: 'staff' | 'fornecedores' | 'partners' | 'manual'; origem_id: string | null; itens: ItemCusto[]; parcelas: ParcelaCusto[]; documento: 'nf' | 'recibo' | 'a_definir' | 'nao_exige'; observacoes: string; version: number; updated_at?: string; feriados_adicionais?: string[] };
export const categoriaCusto = { staff: 'Staff', fornecedor: 'Fornecedor', parceiro: 'Parceiro' };
export const brl = (centavos: number | null) => centavos === null ? 'A definir' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);
export function decimalInteiro(texto: string, casas = 2): number | null {
  const raw = texto.trim(); if (!raw) return null;
  const s = raw.replace(/R\$\s*/g, '').replace(/\s/g, '');
  const normal = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  if (!/^\d+(\.\d+)?$/.test(normal)) throw new Error('Digite um valor válido, sem sinal negativo.');
  const [i, d = ''] = normal.split('.'); if (d.length > casas) throw new Error(`Use até ${casas} casas decimais.`);
  const v = Number(BigInt(i) * 10n ** BigInt(casas) + BigInt(d.padEnd(casas, '0')));
  if (!Number.isSafeInteger(v) || v > 1e12) throw new Error('Valor acima do limite do campo.'); return v;
}
export const entradaDecimal = (n: number | null, casas = 2) => n === null ? '' : (n / 10 ** casas).toFixed(casas).replace('.', ',');
export function totalCusto(itens: ItemCusto[]) {
  let soma = 0n, pendentes = 0;
  for (const item of itens) {
    if (!Number.isInteger(item.quantidade_mil) || item.quantidade_mil <= 0 || item.quantidade_mil > 1e9) throw new Error('Confira a quantidade dos itens.');
    if (item.unitario_centavos === null) { pendentes++; continue; }
    if (!Number.isInteger(item.unitario_centavos) || item.unitario_centavos < 0 || item.unitario_centavos > 1e10) throw new Error('Confira o valor unitário.');
    soma += (BigInt(item.quantidade_mil) * BigInt(item.unitario_centavos) + 500n) / 1000n;
  }
  if (soma > 1000000000000n) throw new Error('O total ultrapassa o limite permitido.');
  return { conhecido: Number(soma), total: pendentes || !itens.length ? null : Number(soma), pendentes: pendentes || (!itens.length ? 1 : 0) };
}
export function distribuirParcelas(total: number | null, parcelas: Pick<ParcelaCusto, 'percentual_bp'>[]): Array<number | null> {
  if (!parcelas.length || parcelas.some((p) => !Number.isInteger(p.percentual_bp) || p.percentual_bp <= 0 || p.percentual_bp > 10000) || parcelas.reduce((s, p) => s + p.percentual_bp, 0) !== 10000) throw new Error('As parcelas precisam somar 100%.');
  if (total === null) return parcelas.map(() => null);
  if (!Number.isSafeInteger(total) || total < 0 || total > 1e12) throw new Error('Total inválido.');
  const produtos = parcelas.map((p) => BigInt(total) * BigInt(p.percentual_bp));
  const valores = produtos.map((n) => Number(n / 10000n));
  const ordem = produtos.map((n, i) => ({ i, resto: Number(n % 10000n) })).sort((a, b) => b.resto - a.resto || a.i - b.i);
  const resto = total - valores.reduce((a, b) => a + b, 0);
  for (let i = 0; i < resto; i++) valores[ordem[i].i]++;
  return valores;
}
export function resumoCusto(custo: Custo, hoje: string) {
  const total = totalCusto(custo.itens), valores = distribuirParcelas(total.total, custo.parcelas), limites = distribuirParcelas(total.conhecido, custo.parcelas);
  let pago = 0, vencido = 0, datasPendentes = 0;
  custo.parcelas.forEach((p, i) => {
    if (!Number.isInteger(p.pago_centavos) || p.pago_centavos < 0 || (p.pago_centavos > 0 && (!p.pago_em || p.pago_centavos > limites[i]!))) throw new Error('Confira os valores e as datas dos pagamentos.');
    pago += p.pago_centavos;
    if (!p.vencimento) datasPendentes++;
    else if (p.vencimento < hoje && valores[i] !== null) vencido += Math.max(0, valores[i]! - p.pago_centavos);
  });
  return { ...total, pago, saldo: total.total === null ? null : total.total - pago, saldoConhecido: Math.max(0, total.conhecido - pago), vencido, datasPendentes, valores };
}
export function consolidarCustos(custos: Custo[], hoje: string) {
  return custos.reduce((r, custo) => { const c = resumoCusto(custo, hoje); return { informado: r.informado + c.conhecido, pago: r.pago + c.pago, saldo: r.saldo + c.saldoConhecido, vencido: r.vencido + c.vencido, pendentes: r.pendentes + (c.total === null ? 1 : 0) }; }, { informado: 0, pago: 0, saldo: 0, vencido: 0, pendentes: 0 });
}

export function agendarCusto(custo: Custo, dataEvento?: string): Custo {
  return { ...custo, parcelas: custo.parcelas.map(p => {
    const modo = p.vencimento_modo || (/primeiro dia útil/i.test(p.regra + ' ' + p.descricao) ? 'pos_evento' : 'manual');
    return { ...p, vencimento_modo: modo, vencimento: modo === 'pos_evento' && dataEvento ? proximoDiaUtil(dataEvento, custo.feriados_adicionais || []) : p.vencimento };
  }) };
}

export type SituacaoCusto = 'pago' | 'parcial' | 'vencido' | 'a_pagar' | 'a_definir';
export const situacoesCusto: Record<SituacaoCusto,string> = {pago:'Pago',parcial:'Parcialmente pago',vencido:'Vencido',a_pagar:'A pagar',a_definir:'Valor a definir'};
export function situacaoCusto(c: Custo, hoje: string): SituacaoCusto {
  const r=resumoCusto(c,hoje);
  return r.total!==null&&r.saldo===0?'pago':r.vencido>0?'vencido':r.pago>0?'parcial':r.total===null?'a_definir':'a_pagar';
}
export function vencimentoLista(c: Custo, de='', ate=''): string | null {
  const valores=distribuirParcelas(totalCusto(c.itens).total,c.parcelas);
  const candidatas=c.parcelas.map((p,i)=>({data:p.vencimento,pendente:valores[i]===null||p.pago_centavos<valores[i]!})).filter(p=>p.data&&(!de||p.data>=de)&&(!ate||p.data<=ate));
  const abertas=candidatas.filter(p=>p.pendente);
  return (abertas.length?abertas:candidatas).map(p=>p.data!).sort()[0]||null;
}
export type FiltrosCustos = {situacao?: string; categoria?: string; busca?: string; de?: string; ate?: string; ordem?: string};
export function selecionarCustos(custos: Custo[], hoje: string, f: FiltrosCustos = {}): Custo[] {
  const termo=(f.busca||'').trim().toLocaleLowerCase('pt-BR');
  return custos.filter(c=>{
    const s=situacaoCusto(c,hoje);
    return (!f.situacao||f.situacao==='todos'||(f.situacao==='a_pagar'?s!=='pago':f.situacao==='a_definir'?totalCusto(c.itens).total===null:f.situacao==='parcial'?resumoCusto(c,hoje).pago>0&&s!=='pago':s===f.situacao))&&(!f.categoria||c.categoria===f.categoria)&&(!termo||`${c.titulo} ${c.recebedor.nome} ${c.recebedor.email} ${categoriaCusto[c.categoria]}`.toLocaleLowerCase('pt-BR').includes(termo))&&(!(f.de||f.ate)||vencimentoLista(c,f.de,f.ate)!==null);
  }).sort((a,b)=>{
    let n=0;
    if(f.ordem==='valor_desc'||f.ordem==='valor_asc') n=(totalCusto(a.itens).conhecido-totalCusto(b.itens).conhecido)*(f.ordem==='valor_desc'?-1:1);
    else if(f.ordem!=='nome') {const x=vencimentoLista(a,f.de,f.ate),y=vencimentoLista(b,f.de,f.ate);if(!x||!y)return x?-1:y?1:a.titulo.localeCompare(b.titulo,'pt-BR');n=x.localeCompare(y)*(f.ordem==='vencimento_desc'?-1:1);}
    return n||a.titulo.localeCompare(b.titulo,'pt-BR');
  });
}
