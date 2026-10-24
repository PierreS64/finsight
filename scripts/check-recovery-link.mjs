import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRecoveryLink } from '../frontend/mobile/src/recoveryLink.ts';

test('missing and unrelated links cannot enable a password reset', () => {
  assert.deepEqual(parseRecoveryLink(null), { kind: 'missing' });
  assert.deepEqual(parseRecoveryLink('exp://127.0.0.1:8081'), { kind: 'invalid' });
  assert.deepEqual(parseRecoveryLink('finsight://reset-password#access_token=only-one'), { kind: 'invalid' });
  assert.deepEqual(parseRecoveryLink('finsight://sign-in#access_token=a&refresh_token=b&type=recovery'), { kind: 'invalid' });
  assert.deepEqual(parseRecoveryLink('finsight://reset-password#access_token=a&refresh_token=b&type=signup'), { kind: 'invalid' });
});

test('recovery tokens and PKCE codes are recognized without exposing their values', () => {
  assert.deepEqual(parseRecoveryLink('finsight://reset-password#access_token=a&refresh_token=b&type=recovery'), {
    kind: 'tokens', accessToken: 'a', refreshToken: 'b',
  });
  assert.deepEqual(parseRecoveryLink('finsight://reset-password?code=sample'), { kind: 'code', code: 'sample' });
  assert.deepEqual(parseRecoveryLink('exp://127.0.0.1:8081/--/reset-password#access_token=a&refresh_token=b&type=recovery'), {
    kind: 'tokens', accessToken: 'a', refreshToken: 'b',
  });
});

test('Supabase link errors are shown as decoded text', () => {
  assert.deepEqual(parseRecoveryLink('finsight://reset-password#error_description=Link+has+expired'), {
    kind: 'error', message: 'Link has expired',
  });
});
