import { toAppError } from '@/lib/errors';
import { displayNameSchema, signInSchema, signUpSchema } from '../validation';

describe('auth validation', () => {
  it('normalises email', () => {
    expect(signInSchema.parse({ email: '  Me@Example.COM ', password: 'x' }).email).toBe('me@example.com');
  });
  it('rejects bad email and short or mismatched passwords', () => {
    expect(signInSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
    expect(signUpSchema.safeParse({ email: 'a@b.co', password: 'short', confirm: 'short' }).success).toBe(false);
    const mismatch = signUpSchema.safeParse({ email: 'a@b.co', password: 'longenough', confirm: 'different' });
    expect(mismatch.success).toBe(false);
    expect(mismatch.error?.issues[0]?.path).toEqual(['confirm']);
  });
  it('turns a blank display name into null', () => {
    expect(displayNameSchema.parse('   ')).toBeNull();
    expect(displayNameSchema.parse(' Marina ')).toBe('Marina');
  });
});

describe('toAppError', () => {
  it('maps database tokens and network failures to honest messages', () => {
    expect(toAppError({ message: 'version_conflict', code: 'P0001' }).kind).toBe('conflict');
    expect(toAppError({ message: 'shelf_full', code: 'P0001' }).kind).toBe('shelf_full');
    expect(toAppError(new TypeError('Network request failed')).kind).toBe('network');
    expect(toAppError({ message: 'Invalid login credentials' }).kind).toBe('auth');
    expect(toAppError('boom').kind).toBe('unknown');
  });
});
