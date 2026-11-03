const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), os=require('node:os');
const project=path.resolve(__dirname,'../..');
const esbuild=require(path.join(project,'node_modules/esbuild'));
const React=require('react'), {create,act}=require('react-test-renderer');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'comuni-v21-'));
 const outfile=path.join(dir,'componentes.cjs');
 await esbuild.build({stdin:{contents:`export {ParceirosMembros} from './src/pages/ParceirosMembros'; export {RequisitosPrograma} from './src/pages/RequisitosPrograma';export {TrilhaPrograma} from './src/pages/TrilhaPrograma';export {Inicio,Rede} from './src/pages/MeuEspaco';`,resolveDir:project,loader:'tsx'},bundle:true,platform:'node',format:'cjs',outfile,loader:{'.css':'empty'},external:['react','react/jsx-runtime'],plugins:[{name:'fixtures',setup(b){
 b.onResolve({filter:/^(\.\.\/)+lib(?:\/supabase)?$/},()=>({path:'lib',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`export const supabase={rpc:(...a)=>global.__rpc(...a)};export const anonPublicRpc=(...a)=>global.__rpc(...a);export const anonStorage={}; export const errorMessage=e=>e?.message||'Falha';export const formatDate=x=>x;export const COMMUNITY_URL='https://example.com', PARTNER_DECK_URL='/exemplo.pdf', PARTNER_FORM_URL='/exemplo'; export const editionSlug=()=>'';export const deviceCode=()=>'';export const ComEdicao=()=>null;`,loader:'js'}));
 b.onLoad({filter:/\/MeuEspaco\.tsx$/},args=>({contents:fs.readFileSync(args.path,'utf8')+'\nexport {Inicio,Rede};',loader:'tsx'}));
 }}]});
 const {ParceirosMembros,TrilhaPrograma,Inicio,Rede}=require(outfile);let n=0,r,calls=[];
 const ok=v=>{assert.ok(v);n++}; const text=()=>JSON.stringify(r.toJSON());
 const mount=async(C,p={})=>{if(r)act(()=>r.unmount());await act(async()=>{r=create(React.createElement(C,p));});};
 const response=(data,error=null)=>Promise.resolve({data,error});
 const empresas={versao:1,parceiros:[{id:'b',nome:'Empresa B',logo_url:null,site_url:'https://example.com'},{id:'a',nome:'Empresa A',logo_url:null,site_url:null}]};
 global.__rpc=(name)=>{calls.push(name);return response(empresas)};
 await mount(ParceirosMembros);ok(r.root.findAllByType('article').length===2);ok(calls.join(',')==='communicali_parceiros_membros');
 ok(!text().includes('Copiar cupom'));ok(r.root.findAllByType('a').length===1);
 act(()=>r.root.findByType('input').props.onChange({target:{value:'empresa a'}}));ok(r.root.findAllByType('article').length===1);
 act(()=>r.root.findByType('input').props.onChange({target:{value:'não existe'}}));ok(text().includes('Nenhuma empresa encontrada'));
 calls=[];await mount(ParceirosMembros,{previa:true});ok(calls.length===0);ok(r.root.findAllByType('article').length===0);
 for(const code of ['PGRST202','42883']) {global.__rpc=()=>response(null,{code});await mount(ParceirosMembros);ok(text().includes('Ver parceiros no site'));ok(r.root.findAllByType('article').length===0);}
 global.__rpc=()=>response({versao:2,parceiros:empresas.parceiros});await mount(ParceirosMembros);ok(text().includes('Não foi possível carregar'));
 global.__rpc=()=>response({versao:1,parceiros:[{id:'bad'}]});await mount(ParceirosMembros);ok(r.root.findAllByType('article').length===0);
 let tentativa=0;global.__rpc=()=>++tentativa===1?Promise.reject(Error('rede')):response(empresas);
 await mount(ParceirosMembros);ok(text().includes('Tentar novamente'));
 await act(async()=>r.root.findByType('button').props.onClick());ok(r.root.findAllByType('article').length===2);
 global.__rpc=()=>response({versao:1,parceiros:[]});await mount(ParceirosMembros);ok(text().includes('Nenhuma empresa disponível'));
 let resolver;global.__rpc=()=>new Promise(resolve=>{resolver=resolve});await mount(ParceirosMembros);ok(text().includes('Carregando empresas'));
 await act(async()=>r.update(React.createElement(ParceirosMembros,{previa:true})));await act(async()=>resolver({data:empresas,error:null}));ok(r.root.findAllByType('article').length===0);
 for(const categoria of ['membro','conector','embaixador','fundadora']){
 await mount(TrilhaPrograma,{categoria,previa:false});ok(text().includes('60 pontos'));ok(text().includes('180 pontos'));ok(!text().includes('100 pontos'));ok(r.root.findAllByType('li').length===4);
 ok(r.root.findAllByType('img').every(i=>i.props.src.startsWith('/selos/postal-')));
 }
 const espaco={membro:{nome:'Pessoa Sintética',categoria:'membro',codigo:'TESTE'},pontos:130,encontros:4,carimbos:[],missoes:[]};let abriu;
 await mount(Inicio,{espaco,extra:null,abrir:a=>abriu=a});ok(text().includes('130'));ok(!text().includes('faltam'));ok(!text().includes('pontos alcançados'));
 act(()=>r.root.findAllByType('button').find(b=>b.children.includes('Ver critérios do programa')).props.onClick());ok(abriu==='programa');
 calls=[];global.__rpc=(name)=>{calls.push(name);if(name==='communicali_rede')return response({eu:'teste',acesso:false,total:5,pessoas:[],parceiros:[]});if(name==='communicali_parceiros_membros')return response(empresas);throw Error(name);};
 await mount(Rede,{comoMembro:false,abrir:()=>{}});ok(r.root.findAllByType('article').length===2);ok(text().includes('perfis de pessoas abrem'));ok(!text().includes('passe__pessoa-foto'));ok(!calls.includes('communicali_rede_perfis'));
 calls=[];await mount(Rede,{comoMembro:true,abrir:()=>{}});ok(!calls.includes('communicali_parceiros_membros'));ok(r.root.findAllByType('article').length===0);
 act(()=>r.unmount());fs.rmSync(dir,{recursive:true});console.log(`${n} verificações React aprovadas; respostas simuladas, sem sessão ou gravação real.`);
})().catch(e=>{console.error(e);process.exitCode=1});
