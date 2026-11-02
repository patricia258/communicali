"""Demonstração do espaço do membro. 'criar' preenche; 'limpar' apaga só o que tem marca de demonstração.
Marcas: e-mails @demo.communicali.test, edições demo-*, ações terminadas em :demo, arquivos em site/demo."""
import json, os, subprocess, sys, urllib.request, urllib.error

token = subprocess.check_output(['security', 'find-generic-password', '-a', 'contato', '-s', 'supabase-communicali', '-w'], text=True).strip()
base = 'https://api.supabase.com/v1/projects/cyyrrtekbkltdiatixhp'
storage = 'https://cyyrrtekbkltdiatixhp.supabase.co/storage/v1/object'
publico = f'{storage}/public/site/demo'
PASTA = os.path.dirname(os.path.abspath(sys.argv[0]))


def call(metodo, url, corpo=None, headers=None, bruto=None):
    dados = bruto if bruto is not None else (None if corpo is None else json.dumps(corpo).encode())
    r = urllib.request.Request(url, data=dados, method=metodo, headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json', 'User-Agent': 'communicali', **(headers or {})})
    try:
        with urllib.request.urlopen(r) as x:
            return x.status, x.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def sql(q):
    s, t = call('POST', f'{base}/database/query', {'query': q})
    if s >= 300:
        raise SystemExit(t[:600])
    return t


keys = json.loads(call('GET', f'{base}/api-keys?reveal=true')[1])
chave = next((k['api_key'] for k in keys if k.get('name') == 'service_role'), None)
h = {'apikey': chave, 'Authorization': f'Bearer {chave}', 'x-upsert': 'true'}

PESSOAS = [
    ('Marina Duarte', 'embaixador', 'Curitiba, PR', 'Diretora de Pessoas', 'Grupo Araucária', ['Liderança', 'Cultura e clima', 'Palestras'], ['Gestão de pessoas', 'Mentoria'], False, 3),
    ('Rafael Nogueira', 'conector', 'Curitiba, PR', 'Consultor de RH', 'Nogueira Consultoria', ['Consultoria', 'Recrutamento e seleção'], ['Empreendedorismo', 'Parcerias'], True, 3),
    ('Helena Prado', 'conector', 'São José dos Pinhais, PR', 'Business Partner', 'Vale Sul', ['Treinamento e desenvolvimento', 'Liderança'], ['Carreira', 'Networking'], False, 3),
    ('Bruno Teixeira', 'membro', 'Londrina, PR', 'Advogado trabalhista', 'Teixeira Advocacia', ['Jurídico trabalhista'], ['RH', 'Parcerias'], True, 1),
    ('Camila Rocha', 'embaixador', 'Curitiba, PR', 'Coach executiva', 'Rocha Mentoria', ['Coaching e mentoria', 'Palestras'], ['Desenvolvimento humano', 'Mentoria'], True, 3),
    ('Diego Martins', 'membro', 'Pinhais, PR', 'Analista de DP', 'Metalúrgica Iguaçu', ['Departamento pessoal'], ['Vagas', 'Carreira'], False, 2),
    ('Juliana Sato', 'conector', 'Curitiba, PR', 'Head de Talentos', 'Tech Paraná', ['Recrutamento e seleção', 'Tecnologia'], ['Inteligência artificial', 'Networking'], False, 3),
    ('Bianca Freitas', 'membro', 'Curitiba, PR', 'Designer de marca', 'Estúdio Freitas', ['Marketing'], ['Empreendedorismo', 'Networking'], True, 1),
    ('Lucas Andrade', 'membro', 'Araucária, PR', 'Especialista em IA', 'Dados Sul', ['Inteligência artificial', 'Tecnologia'], ['RH', 'Palestras'], True, 2),
    ('Renata Campos', 'membro', 'Curitiba, PR', 'Psicóloga organizacional', 'Clínica Campos', ['Saúde e bem-estar', 'Cultura e clima'], ['Desenvolvimento humano', 'RH'], True, 2),
    ('Aline Ferreira', 'conector', 'Colombo, PR', 'Gerente de RH', 'Rede Boa Vista', ['Remuneração e benefícios', 'Liderança'], ['Gestão de pessoas', 'Vagas'], False, 3),
    ('Eduardo Vieira', 'membro', 'Curitiba, PR', 'CEO', 'Vieira Logística', ['Gestão de negócios'], ['Liderança', 'Parcerias'], False, 1),
]
arr = lambda l: "array[" + ",".join("'" + x + "'" for x in l) + "]::text[]"


def criar():
    for n in range(1, 13):
        print(n, call('POST', f'{storage}/site/demo/{n}.jpg', bruto=open(f'{PASTA}/fotos-demo/{n}.jpg', 'rb').read(), headers={**h, 'Content-Type': 'image/jpeg'})[0], end=' · ')
    for a in ('carimbo-demo-1', 'carimbo-demo-2', 'carimbo-demo-3'):
        print(a, call('POST', f'{storage}/site/demo/{a}.png', bruto=open(f'{PASTA}/selos/{a}.png', 'rb').read(), headers={**h, 'Content-Type': 'image/png'})[0], end=' · ')
    q = f"""
insert into public.editions (slug, numero, titulo, selo, data_evento, horario, local, cidade, endereco, capa_url, fotos_url, carimbo_url, checkin_abre, checkin_fecha, publica) values
 ('demo-1', null, 'Encontro de julho (demonstração)', 'Julho 2026', '2026-07-18', '9h às 12h', 'Espaço Demonstração', 'Curitiba', 'Rua de Exemplo, 100', '/fotos/legacy-coffee.jpg', 'https://comuni.calirh.com/fotos/legacy-coffee.jpg', '{publico}/carimbo-demo-1.png', '2026-07-18 10:00+00', '2026-07-18 16:00+00', false),
 ('demo-2', null, 'Encontro de agosto (demonstração)', 'Agosto 2026', '2026-08-22', '9h às 12h', 'Espaço Demonstração', 'Curitiba', 'Rua de Exemplo, 100', '/fotos/neutras/2.jpg', 'https://comuni.calirh.com/fotos/neutras/2.jpg', '{publico}/carimbo-demo-2.png', '2026-08-22 10:00+00', '2026-08-22 16:00+00', false),
 ('demo-3', null, 'Encontro de setembro (demonstração)', 'Setembro 2026', '2026-09-26', '9h às 12h', 'Espaço Demonstração', 'Curitiba', 'Rua de Exemplo, 100', '/fotos/neutras/3.jpg', 'https://comuni.calirh.com/fotos/neutras/3.jpg', '{publico}/carimbo-demo-3.png', '2026-09-26 10:00+00', '2026-09-26 16:00+00', false)
on conflict (slug) do nothing;
"""
    for i, (nome, cat, cid, cargo, emp, temas, inter, presta, enc) in enumerate(PESSOAS, 1):
        email = f'pessoa{i}@demo.communicali.test'
        cod = nome.split()[0].upper() + 'DEMO'
        q += f"""insert into public.members (nome,email,categoria,termos_aceitos_em,foto_url,cidade_uf,cargo,empresa,temas,interesses,presta_servicos,na_rede,whatsapp,instagram,linkedin,codigo,interesse_palestras)
 values ('{nome}','{email}','{cat}',now(),'{publico}/{i}.jpg','{cid}','{cargo}','{emp}',{arr(temas)},{arr(inter)},{str(presta).lower()},true,'41 90000-00{i:02d}','@{nome.split()[0].lower()}.demo','linkedin.com/in/{nome.split()[0].lower()}-demo','{cod}',{'true' if 'Palestras' in temas else 'false'}) on conflict (email) do nothing;\n"""
        for e in range(1, enc + 1):
            q += f"""insert into public.checkins (edition_id,member_id,origem) select e.id,m.id,'manual' from public.editions e, public.members m where e.slug='demo-{e}' and m.email='{email}' on conflict do nothing;
insert into public.point_events (member_id,edition_id,acao,pontos) select m.id,e.id,'presenca',10 from public.editions e, public.members m where e.slug='demo-{e}' and m.email='{email}' on conflict do nothing;\n"""
        extra = {'embaixador': 230, 'conector': 85}.get(cat, 0)
        if extra:
            q += f"insert into public.point_events (member_id,acao,pontos,motivo) select id,'ajuste:demo',{extra},'Demonstração' from public.members where email='{email}' on conflict do nothing;\n"
    eu = "(select id from public.members where email='contato@calirh.com')"
    q += f"""
update public.members set nome='Patrícia Lima', foto_url='https://comuni.calirh.com/fotos/patricia-lima.jpg', cidade_uf='Curitiba, PR', cargo='People Advisory Executive', empresa='CALI RH', whatsapp='41 8787-9244', instagram='@calirh_', linkedin='linkedin.com/in/patriciaazumi', codigo='PATRICIA', interesse_palestras=true, na_rede=true,
  temas=array['Liderança','Consultoria','Palestras','Cultura e clima']::text[], interesses=array['RH','Gestão de pessoas','Empreendedorismo','Parcerias']::text[] where email='contato@calirh.com';
insert into public.checkins (edition_id,member_id,origem) select e.id,{eu},'manual' from public.editions e where e.slug like 'demo-%' on conflict do nothing;
insert into public.point_events (member_id,edition_id,acao,pontos) select {eu},e.id,'presenca',10 from public.editions e where e.slug like 'demo-%' on conflict do nothing;
insert into public.point_events (member_id,acao,pontos,motivo) values ({eu},'palestra:demo',30,'Demonstração'),({eu},'parceiro:demo',20,'Demonstração'),({eu},'contribuicao:demo',15,'Demonstração'),({eu},'recomendacao:demo',10,'Demonstração') on conflict do nothing;
insert into public.registrations (edition_id,nome,email,whatsapp,cidade,status,indicado_por) select e.id,p.nome,p.email,'41 90000-0000','Curitiba','inscrito',{eu} from public.editions e, public.members p where e.slug='demo-2' and p.email in ('pessoa8@demo.communicali.test','pessoa10@demo.communicali.test','pessoa9@demo.communicali.test') on conflict do nothing;
insert into public.point_events (member_id,edition_id,acao,pontos) select {eu},r.edition_id,'indicacao:'||r.id::text,5 from public.registrations r where r.indicado_por={eu} and r.email like '%@demo.communicali.test' on conflict do nothing;
insert into public.registrations (edition_id,nome,email,whatsapp,cidade,status,indicado_por) select e.id,'Eduardo Vieira','pessoa12@demo.communicali.test','41 90000-0000','Curitiba','inscrito',{eu} from public.editions e where e.slug='demo-3' on conflict do nothing;
delete from public.point_events where acao = 'indicacao:' || (select r.id::text from public.registrations r where r.email='pessoa12@demo.communicali.test' limit 1);
insert into public.member_missions (member_id,mission_slug,relato,status,decidido_em) values ({eu},'conexao','Quem você apresentou: Marina Duarte · Para quem você apresentou: Rafael Nogueira · O que resultou: Parceria','concluida',now()),({eu},'representar','Onde você representou a comunidade: Evento de RH em Curitiba · Como foi: Evento presencial','enviada',null) on conflict do nothing;
insert into public.recommendations (member_id,tipo,nome,instagram,telefone,pessoa_validar,status,decidido_em) values ({eu},'lugar','Café Exemplo','@cafeexemplo.demo','41 90000-1000','Ana Exemplo','validada',now()),({eu},'parceiro','Gráfica Exemplo','@graficaexemplo.demo','41 90000-1001','João Exemplo','pendente',null);
insert into public.member_missions (member_id,mission_slug,relato) select id,'conexao','Quem você apresentou: Juliana Sato · Para quem você apresentou: Eduardo Vieira · O que resultou: Contratação · Contato de quem pode confirmar: 41 90000-0012' from public.members where email='pessoa7@demo.communicali.test' on conflict do nothing;
insert into public.recommendations (member_id,tipo,nome,instagram,linkedin,telefone,pessoa_validar) select id,'lugar','Auditório Exemplo','@auditorio.demo','linkedin.com/company/auditorio-demo','41 90000-1002','Carla Exemplo' from public.members where email='pessoa3@demo.communicali.test';
insert into public.recommendations (member_id,tipo,nome,telefone,pessoa_validar) select id,'parceiro','Buffet Exemplo','41 90000-1003','Pedro Exemplo' from public.members where email='pessoa11@demo.communicali.test';
"""
    print(sql(q)[:120])
    print(sql("select (select count(*) from public.members) membros, (select sum(pontos) from public.point_events where member_id=(select id from public.members where email='contato@calirh.com')) meus_pontos, (select communicali_membros()) contador_site"))


def limpar():
    print(sql("""
delete from public.recommendations where nome like '%Exemplo';
delete from public.member_missions where member_id in (select id from public.members where email like '%@demo.communicali.test');
delete from public.member_missions where relato like '%Marina Duarte%' or relato like 'Onde você representou a comunidade: Evento de RH em Curitiba%';
delete from public.point_events where acao like '%:demo' or acao like 'indicacao:%' and acao in (select 'indicacao:'||r.id::text from public.registrations r where r.email like '%@demo.communicali.test');
delete from public.point_events where edition_id in (select id from public.editions where slug like 'demo-%');
delete from public.point_events where member_id in (select id from public.members where email like '%@demo.communicali.test');
delete from public.registrations where email like '%@demo.communicali.test';
delete from public.checkins where edition_id in (select id from public.editions where slug like 'demo-%');
delete from public.checkins where member_id in (select id from public.members where email like '%@demo.communicali.test');
delete from public.members where email like '%@demo.communicali.test';
delete from public.editions where slug like 'demo-%';
select (select count(*) from public.members) membros, (select count(*) from public.editions) edicoes"""))
    for n in [f'{i}.jpg' for i in range(1, 13)] + [f'carimbo-demo-{i}.png' for i in (1, 2, 3)]:
        call('DELETE', f'{storage}/site/demo/{n}', headers=h)


criar() if sys.argv[1] == 'criar' else limpar()
