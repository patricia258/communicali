// Personalização de texto sobre o desenho e os botões existentes dos e-mails.
export const CATALOGO_EMAILS = [
 ['edicao:consumo','Consumo mínimo','Aviso de consumo do encontro'],['edicao:posevento','Pós-encontro','Pós-encontro'],
 ['edicao:recebido','Inscrição recebida','Inscrição'],['edicao:confirmacao','Reserva confirmada','Aprovação da inscrição'],['edicao:espera','Lista de espera','Inscrição em espera'],['edicao:lembrete','Lembrete do encontro','Agendador da véspera'],['edicao:boasvindas','Boas-vindas','Envio pela organização'],['edicao:agradecimento','Agradecimento','Envio pela organização'],['edicao:card','Card Eu vou','Envio pela organização'],['edicao:convite','Convite de agenda','Envio pela organização'],['edicao:pesquisa','Pesquisa de satisfação','Pós-encontro'],
 ['fluxo:entrada_confirmada','Entrada confirmada','Confirmação de vaga'],['fluxo:pos_presenca','Após a primeira visita','Check-in'],['fluxo:limite_atingido','Limite de visitas','Segunda presença'],['fluxo:adesao_recebida','Pedido recebido','Pedido de adesão'],['fluxo:adesao_aprovada','Adesão aprovada','Decisão da organização'],['fluxo:adesao_ajustes','Ajustes na adesão','Decisão da organização'],['fluxo:adesao_nao_aprovada','Adesão não aprovada','Decisão da organização'],['fluxo:janela_membros','Janela da comunidade','Abertura de inscrições'],['fluxo:abertura_geral','Abertura geral','Abertura de inscrições'],['fluxo:espera_vaga','Vaga liberada','Chamada da espera'],['fluxo:pendencias','Pendências de cadastro','Aviso de pendências'],['fluxo:ausencia','Ausência no encontro','Registro de ausência'],
].map(([id,nome,gatilho])=>({id,nome,gatilho}));
export const VARIAVEIS_EMAIL=['nome','encontro','data','horario','local','motivo','prazo','visitas'];
const escapar=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export function validarModelo(campos){
 if(!campos||typeof campos!=='object'||Array.isArray(campos)||typeof campos.assunto!=='string'||typeof campos.corpo!=='string'||campos.assunto.length>240||campos.corpo.length>12000||/[\r\n]/.test(campos.assunto))throw Error('Confira o assunto e a mensagem.');
 for(const m of `${campos.assunto} ${campos.corpo}`.matchAll(/\{\{([^}]+)\}\}/g))if(!VARIAVEIS_EMAIL.includes(m[1].trim()))throw Error(`Variável desconhecida: ${m[1]}`);
 return {assunto:campos.assunto.trim(),corpo:campos.corpo.trim()};
}
export const interpolarModelo=(texto,vars)=>texto.replace(/\{\{\s*([^}]+?)\s*\}\}/g,(_,key)=>String(vars[key]??''));
export function comModelo(id,mensagem,variaveis,renderizar){return {...mensagem,modelo_id:id,modelo_variaveis:variaveis,modelo_renderizar:renderizar};}
export function editarMensagem(mensagem,campos){
 const c=validarModelo(campos),vars=mensagem.modelo_variaveis||{};
 return {...mensagem,assunto:c.assunto?interpolarModelo(c.assunto,vars).replace(/[\r\n]+/g,' ').slice(0,240):mensagem.assunto,html:c.corpo?mensagem.modelo_renderizar(c.corpo.split(/\n\s*\n/).map(p=>escapar(interpolarModelo(p,vars)).replace(/\n/g,'<br>'))):mensagem.html,modelo_resolvido:true};
}
export async function personalizarMensagem(mensagem,db){
 if(!mensagem.modelo_id||mensagem.modelo_resolvido)return mensagem;
 try{const r=await db(`email_templates?id=eq.${encodeURIComponent(mensagem.modelo_id)}&select=publicado`);if(!r.ok)return mensagem;const [row]=await r.json();return row?.publicado?editarMensagem(mensagem,row.publicado):mensagem;}catch{return mensagem;}
}
