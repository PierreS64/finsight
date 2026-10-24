import assert from 'node:assert/strict';
import test from 'node:test';
import * as web from '../frontend/web/src/reportDate.ts';
import * as mobile from '../frontend/mobile/src/reportDate.ts';

for (const [client, calendar] of Object.entries({ web, mobile })) {
  test(`${client} uses the Bangkok month at its UTC boundary`, () => {
    const before = new Date('2026-10-31T16:59:59Z');
    const after = new Date('2026-10-31T17:00:00Z');
    assert.equal(calendar.reportDate(before), '2026-10-31');
    assert.equal(calendar.reportMonth(before), '2026-10');
    assert.equal(calendar.reportDate(after), '2026-11-01');
    assert.equal(calendar.reportMonth(after), '2026-11');
    assert.equal(calendar.reportDate(new Date('2026-12-31T17:00:00Z')), '2027-01-01');
  });

  test(`${client} keeps upcoming-expense dates on the Bangkok calendar`, () => {
    const now = new Date('2026-10-24T12:00:00Z');
    assert.equal(calendar.reportDatePlusDays(-30, now), '2026-09-24');
    assert.equal(calendar.reportDatePlusDays(30, now), '2026-11-23');
  });
}
