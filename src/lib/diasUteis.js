// Datas civis, sem conversão para o fuso do navegador. Feriados locais são configurados por custo.
export function dataCivil(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error('Data inválida.');
  const d = new Date(`${iso}T12:00:00Z`);
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== iso) throw new Error('Data inválida.');
  return d;
}
export function feriadosNacionais(ano) {
  const a=ano%19,b=Math.floor(ano/100),c=ano%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mes=Math.floor((h+l-7*m+114)/31),dia=(h+l-7*m+114)%31+1;
  const pascoa=new Date(Date.UTC(ano,mes-1,dia,12));pascoa.setUTCDate(pascoa.getUTCDate()-2);
  return ['01-01','04-21','05-01','09-07','10-12','11-02','11-15','11-20','12-25'].map(v=>`${ano}-${v}`).concat(pascoa.toISOString().slice(0,10));
}
export function proximoDiaUtil(apos, adicionais = []) {
  const d=dataCivil(apos);adicionais.forEach(dataCivil);
  for(let n=0;n<370;n++) { d.setUTCDate(d.getUTCDate()+1);const iso=d.toISOString().slice(0,10);if(![0,6].includes(d.getUTCDay())&&!feriadosNacionais(d.getUTCFullYear()).includes(iso)&&!adicionais.includes(iso))return iso; }
  throw new Error('Confira o calendário de feriados.');
}
