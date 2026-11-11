import { createHash } from 'node:crypto';

export function hashInviteCode(value) {
  if (typeof value !== 'string' || value.length > 100 || /\p{Cc}/u.test(value)) return null;
  const code = value.trim();
  return code ? createHash('sha256').update(code).digest('hex') : null;
}
