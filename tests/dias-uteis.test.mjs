import test from 'node:test';import assert from 'node:assert/strict';
import {proximoDiaUtil} from '../src/lib/diasUteis.js';
import {agendarCusto} from '../src/lib/custos.ts';
test('sábado 14/11/2026 vence segunda 16/11',()=>assert.equal(proximoDiaUtil('2026-11-14'),'2026-11-16'));
test('sexta antes de feriado na segunda pula para terça',()=>assert.equal(proximoDiaUtil('2026-09-04'),'2026-09-08'));
test('Consciência Negra é desconsiderada',()=>assert.equal(proximoDiaUtil('2026-11-19'),'2026-11-23'));
test('Sexta da Paixão e feriados locais são desconsiderados',()=>{assert.equal(proximoDiaUtil('2026-04-02'),'2026-04-06');assert.equal(proximoDiaUtil('2026-11-14',['2026-11-16']),'2026-11-17');});
test('virada do ano, data inválida e datas manuais',()=>{assert.equal(proximoDiaUtil('2026-12-31'),'2027-01-04');assert.throws(()=>proximoDiaUtil('2026-02-30'));const c={parcelas:[{vencimento_modo:'manual',vencimento:'2026-11-14'},{regra:'Primeiro dia útil após o evento',descricao:'Integral'}]};assert.deepEqual(agendarCusto(c,'2026-11-14').parcelas.map(p=>p.vencimento),['2026-11-14','2026-11-16']);});
