import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findViolations } from './check-copy.mjs';

test('"Compre agora" falha', () => {
  assert.equal(findViolations('<p>Compre agora</p>').length, 1);
});

test('termos com acento e hífen são detectados', () => {
  assert.equal(findViolations('Venda já!').length, 1);
  assert.equal(findViolations('Recomenda-se cautela').length, 1);
  assert.equal(findViolations('Uma oportunidade rara').length, 1);
});

test('o disclaimer passa', () => {
  const disclaimer =
    'A classificação é quantitativa, calculada a partir de dados públicos, e não é recomendação de compra ou venda. Rentabilidade passada não garante resultados futuros. Dados de exemplo fictícios.';
  assert.deepEqual(findViolations(disclaimer), []);
});

test('rótulos do relatório B3 passam', () => {
  assert.deepEqual(findViolations('Quantidade (Venda)'), []);
  assert.deepEqual(findViolations('Preço Médio (Venda)'), []);
});

test('"venda" sozinha não é bloqueada', () => {
  assert.deepEqual(findViolations('Quantidade vendida no mês: 0 (venda)'), []);
});
