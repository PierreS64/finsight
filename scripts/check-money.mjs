import assert from 'node:assert/strict';
import test from 'node:test';
import * as web from '../frontend/web/src/money.ts';
import * as mobile from '../frontend/mobile/src/money.ts';

const cases = [
  ['0.00', '0 ₫'],
  ['999.00', '999 ₫'],
  ['1234567.89', '1.234.567,89 ₫'],
  ['-1000.50', '-1.000,5 ₫'],
  ['0.01', '0,01 ₫'],
  ['123456789012345678901234567890.00', '123.456.789.012.345.678.901.234.567.890 ₫'],
];

for (const [client, money] of Object.entries({ web, mobile })) {
  test(`${client} groups whole VND without losing large or negative values`, () => {
    for (const [input, expected] of cases) assert.equal(money.formatVnd(input), expected);
  });

  test(`${client} adds balances in exact minor units`, () => {
    assert.equal(money.sumBalances(['1000.01', '-3.02', '0.01']), '997.00');
    assert.equal(money.sumBalances(['12345678901234567890.99', '0.01']), '12345678901234567891.00');
    assert.equal(money.formatVnd('not-money'), 'not-money VND');
  });
}

test('mobile flow labels keep zero unsigned', () => {
  assert.equal(mobile.formatFlowVnd('0.00', '+'), '0 ₫');
  assert.equal(mobile.formatFlowVnd('1000.00', '−'), '−1.000 ₫');
  assert.equal(mobile.formatFlowVnd(undefined, '+'), '—');
});
