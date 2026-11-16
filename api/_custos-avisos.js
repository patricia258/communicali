// Reaproveita o cron existente; não dispara fora do handler autorizado de email-lembretes.
import { createHash } from 'node:crypto';
import { banco, escape, layoutSimples, textoSimples } from './_email.js';
const DIA = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const moeda = n => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n)/100);
export function mensagemCusto(item) {
 return { assunto: `Pagamento previsto: ${item.titulo}`, html: layoutSimples({titulo:'Pagamento do encontro',saudacao:'Há um pagamento para conferir.',linhas:[`Encontro: <strong>${escape(item.encontro)}</strong>`,`Item: <strong>${escape(item.titulo)}</strong>`,`Vencimento: <strong>${escape(item.vencimento.split('-').reverse().join('/'))}</strong>`,`Saldo desta parcela: <strong>${moeda(item.saldo_centavos)}</strong>`,'Confira o combinado, realize o pagamento no banco e registre a quitação no painel.'],botao:{texto:'Conferir custos',href:'https://comuni.calirh.com/admin/custos'},semSair:true}) };
}
export async function avisarCustos({ db = banco, sendFetch = fetch, hoje = DIA(), agora = new Date(), apiKey = process.env.RESEND_API_KEY } = {}) {
 const total={enviado:0,ja_enviado:0,erro:0};
 if(!apiKey)return {...total,erro:1,motivo:'Provedor de e-mail não configurado.'};
 const pendentes=await db('rpc/custos_avisos_pendentes',{method:'POST',body:JSON.stringify({hoje})});
 if(!pendentes.ok)return {...total,erro:1,motivo:'Custos indisponíveis; conferir migração.'};
 const rAdmins=await db('admins?select=email');if(!rAdmins.ok)return {...total,erro:1};
 const admins=[...new Set((await rAdmins.json()).map(a=>String(a.email||'').trim().toLowerCase()).filter(e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))];
 for(const item of await pendentes.json())for(const email of admins){
  const chave=createHash('sha256').update(JSON.stringify([item.cost_id,item.parcela_id,item.vencimento,email])).digest('hex');
  const row={chave,cost_id:item.cost_id,parcela_id:item.parcela_id,vencimento:item.vencimento,email};
  try{
   const ins=await db('event_cost_reminders?on_conflict=chave',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates'},body:JSON.stringify(row)});if(!ins.ok)throw Error('Não foi possível registrar o aviso.');
   const corte=new Date(agora.getTime()-15*60000).toISOString();
   const reserva=await db(`event_cost_reminders?chave=eq.${chave}&enviado_em=is.null&or=(reservado_em.is.null,reservado_em.lt.${encodeURIComponent(corte)})`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({reservado_em:agora.toISOString(),erro:null})});
   if(!reserva.ok)throw Error('Não foi possível reservar o aviso.');
   if(!(await reserva.json()).length){total.ja_enviado++;continue;}
   const mensagem=mensagemCusto(item);
   const enviado=await sendFetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','Idempotency-Key':`custo-${chave}`},body:JSON.stringify({from:'ComuniCALI <comuni@calirh.com>',to:[email],reply_to:'contato@calirh.com',subject:mensagem.assunto,html:mensagem.html,text:textoSimples(mensagem.html)})});
   const dados=await enviado.json();if(!enviado.ok||!dados.id)throw Error('Falha no envio do aviso.');
   const registro=await db(`event_cost_reminders?chave=eq.${chave}`,{method:'PATCH',body:JSON.stringify({enviado_em:agora.toISOString(),resend_id:dados.id,erro:null})});
   if(!registro.ok)throw Error('Falha ao confirmar o envio.');
   await db('email_activity',{method:'POST',body:JSON.stringify({email,modelo:'custos:pagamento',edition_id:null,assunto:mensagem.assunto,situacao:'enviado',resend_id:dados.id,erro:null})}).catch(()=>{});
   total.enviado++;
  }catch{
   total.erro++;
   // Mantém a reserva por 15 minutos e reutiliza a chave de idempotência em nova tentativa.
   await db(`event_cost_reminders?chave=eq.${chave}&enviado_em=is.null`,{method:'PATCH',body:JSON.stringify({erro:'Falha no processamento; nova tentativa no agendador.'})}).catch(()=>{});
  }
 }
 return total;
}
