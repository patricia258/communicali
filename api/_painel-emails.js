import {CATALOGO_EMAILS,VARIAVEIS_EMAIL,validarModelo,editarMensagem} from './_email-modelos.js';
const acoes=['modelos_catalogo','modelo_prever','modelo_salvar','modelo_teste','email_historico','email_entregas'];
export async function painelEmails(req,res,{email,db,enviar,montar,emailFluxo,fetcher=fetch}){
 const b=req.body||{};if(!acoes.includes(b.acao))return false;
 const responder=(status,dados)=>{res.status(status).json(dados);return true;};
 try{
  if(b.acao==='modelos_catalogo'){
   const r=await db('email_templates?select=*');if(!r.ok)return responder(503,{error:'A edição de modelos precisa ser ativada no banco.'});
   return responder(200,{modelos:CATALOGO_EMAILS,registros:await r.json(),variaveis:VARIAVEIS_EMAIL,email});
  }
  if(b.acao==='email_historico'){
   const ler=async(t)=>{const rows=[];for(let n=0;n<10;n++){const r=await db(`${t}?select=*&order=created_at.desc`,{headers:{Range:`${n*500}-${n*500+499}`}});if(!r.ok)return null;const p=await r.json();rows.push(...p);if(p.length<500)return rows;}return rows;};
   const [novos,antigos]=await Promise.all([ler('email_activity'),ler('email_log')]);if(!novos&&!antigos)return responder(503,{error:'Não foi possível carregar o histórico.'});
   const mapa=new Map();for(const r of antigos||[])mapa.set(r.resend_id||`antigo-${r.id}`,{...r,modelo:`edicao:${r.tipo}`,assunto:r.assunto||'',fonte:'edicao'});
   for(const r of novos||[]){const key=r.resend_id||`novo-${r.id}`,velho=mapa.get(key);mapa.set(key,{...velho,...r,entrega:r.entrega||velho?.entrega,aberto_em:r.aberto_em||velho?.aberto_em,clicado_em:r.clicado_em||velho?.clicado_em,fonte:'geral'});}
   return responder(200,{linhas:[...mapa.values()].sort((a,b)=>b.created_at.localeCompare(a.created_at)),completo:novos!==null&&antigos!==null,limitado:novos?.length===5000||antigos?.length===5000,limite:10000});
  }
  if(b.acao==='email_entregas'){
   const r=await db('email_activity?resend_id=not.is.null&or=(entrega.is.null,entrega.in.(sent,delivery_delayed,queued))&select=id,resend_id&order=created_at.desc&limit=15');if(!r.ok)return responder(503,{error:'Não foi possível carregar as entregas.'});let lidos=0;
   for(const row of await r.json()){const x=await fetcher(`https://api.resend.com/emails/${encodeURIComponent(row.resend_id)}`,{headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`}});if(!x.ok)break;const d=await x.json();const status=d.last_event||'sent';const upd=await db(`email_activity?id=eq.${row.id}`,{method:'PATCH',body:JSON.stringify({entrega:status,...(status==='opened'?{aberto_em:new Date().toISOString()}:{}),...(status==='clicked'?{clicado_em:new Date().toISOString()}: {})})});if(upd.ok)lidos++;await new Promise(resolve=>setTimeout(resolve,550));}
   return responder(200,{lidos});
  }
  const modelo=CATALOGO_EMAILS.find(m=>m.id===b.modelo);if(!modelo)return responder(400,{error:'Modelo inválido.'});
  const campos=validarModelo(b.campos||{assunto:'',corpo:''});
  if(b.acao==='modelo_salvar'){
   if(!Number.isSafeInteger(b.version)||b.version<0)return responder(400,{error:'Versão inválida.'});
   const payload={rascunho:campos};if(b.modo==='publicar')payload.publicado=campos.assunto||campos.corpo?campos:null;else if(b.modo==='padrao')payload.publicado=null;else if(b.modo!=='rascunho')return responder(400,{error:'Escolha salvar ou publicar.'});
   const path=b.version?`email_templates?id=eq.${encodeURIComponent(modelo.id)}&version=eq.${b.version}`:'email_templates';
   const r=await db(path,{method:b.version?'PATCH':'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(b.version?payload:{id:modelo.id,...payload})});
   if(!r.ok)return responder(409,{error:'Não foi possível salvar. Atualize o modelo antes de tentar novamente.'});const [registro]=await r.json();if(!registro)return responder(409,{error:'O modelo foi alterado em outra janela. Atualize antes de editar.'});return responder(200,{registro});
  }
  let edicao={id:null,titulo:'Encontro de exemplo',data_evento:'2026-11-14',horario:'9h às 12h',local:'Local de exemplo',cidade:'Curitiba',endereco:'',capa_url:null};
  if(b.edicao){if(!/^[0-9a-f-]{36}$/i.test(b.edicao))return responder(400,{error:'Encontro inválido.'});const r=await db(`editions?id=eq.${b.edicao}&select=*`);if(!r.ok)return responder(503,{error:'Não foi possível carregar o encontro.'});const rows=await r.json();if(!rows[0])return responder(404,{error:'Encontro não encontrado.'});edicao=rows[0];}
  const [familia,tipo]=modelo.id.split(':');let passaporteAberto=false;if(familia==='fluxo'&&tipo==='adesao_aprovada'){const r=await db('site_settings?select=passaporte_aberto&limit=1');if(r.ok){const rows=await r.json();passaporteAberto=Boolean(rows[0]?.passaporte_aberto);}}const original=familia==='edicao'?montar(tipo,edicao,{nome:'Pessoa de exemplo',email,cardEmail:email}):emailFluxo(tipo,{nome:'Pessoa de exemplo',edicao:edicao.titulo,quando:edicao.data_evento,onde:edicao.local,n:1,motivo:'Motivo de exemplo',prazo:'Prazo de exemplo',pendencias:['Pendência de exemplo'],passaporteAberto});
  const mensagem=editarMensagem(original,campos);
  if(b.acao==='modelo_prever')return responder(200,{assunto:mensagem.assunto,html:mensagem.html,email});
  const result=await enviar(email,mensagem);if(result.erro)return responder(502,{error:result.erro});if(result.pulado)return responder(200,{pulado:true,para:email});return responder(200,{para:email,id:result.id});
 }catch(e){return responder(400,{error:e instanceof Error?e.message:'Não foi possível concluir a ação.'});}
}
